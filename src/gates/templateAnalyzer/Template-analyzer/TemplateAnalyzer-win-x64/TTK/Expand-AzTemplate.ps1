function Expand-AzTemplate
{
    <#
    .Synopsis
        Expands the contents of an Azure Resource Manager template.
    .Description
        Expands an Azure Resource Manager template and related files into a set of well-known parameters

        Or

        Expands an Azure Resource Manager template expression
    .Notes
        Expand-AzTemplate -Expression expands expressions the resolve to a top-level property (e.g. variables or parameters).

        It does not expand recursively, and it does not attempt to evaluate complex expressions.
    #>
    [CmdletBinding(DefaultParameterSetName='SpecificTemplate')]
    [OutputType([string],[PSObject])]
    param(
    # The path to an Azure resource manager template
    [Parameter(Mandatory=$true,Position=0,ValueFromPipelineByPropertyName=$true,ParameterSetName='SpecificTemplate')]
    [Alias('Fullname','Path')]
    [string]
    $TemplatePath,

    # An Azure Template Expression, for example [parameters('foo')].bar.
    # If this expression was expanded, it would look in -InputObject for a .Parameters object containing the property 'foo'.
    # Then it would look in that result for a property named bar.
    [Parameter(Mandatory=$true,Position=0,ValueFromPipelineByPropertyName=$true,ParameterSetName='Expression')]
    [string]
    $Expression,

    # A whitelist of top-level properties to expand.
    # For example, passing -Include Parameters will only expand out the [Parameters()] function
    [Parameter(ParameterSetName='Expression')]
    [string[]]
    $Include,

    # A blacklist of top-level properties that will not be expanded.
    # For example, passing -Exclude Parameters will not expand any [Parameters()] function.
    [Parameter(ParameterSetName='Expression')]
    [string[]]
    $Exclude,

    # The object that will be used to evaluate the expression.
    [Parameter(ValueFromPipeline=$true,ParameterSetName='Expression')]
    [PSObject]
    $InputObject
    )

    begin {
        function Expand-Resource (
            [Parameter(Mandatory=$true,Position=0,ValueFromPipelineByPropertyName=$true)]
            [Alias('Resources')]
            [PSObject[]]
            $Resource,

            [PSObject[]]
            $Parent
        ) {
            process {
                foreach ($r in $Resource) {
                    $r |
                        Add-Member NoteProperty ParentResources $parent -Force -PassThru

                    if ($r.resources) {
                        $r | Expand-Resource -Parent (@($r) + @(if ($parent) { $parent }))
                    }
                }
            }
        }

        $TemplateLanguageExpression = "
\s{0,} # optional whitespace
\[ # opening bracket
(?<Function>\S{1,}) # the top-level function name
(?<Parameters>\( # the opening parenthesis
    (?>[^\(\)]+|\((?<Depth>)|\)(?<-Depth>))*(?(Depth)(?!)) # anything until we're balanced
\)) # the closing parenthesis
(?<Index>\[\d{1,}\]){0,1} # an optional index
(?<Property>\. # a property
    (?<PropertyName>[^\.\[\]\s]{1,}){1,1}
    (?<PropertyIndex>\[\d{1,}\]){0,1} # One or more optional properties
){0,}
\] # closing bracket
\s{0,} # optional whitespace
"

        $TemplateParametersExpression = "
(
    (?<Quote>') # a single quote
        (?<StringLiteral>([^']|(?<=')'){1,}) # anything until the next quote (including '')
    \k<Quote>| # a closing quote OR
    (?<Boolean>true|false)| # the literal values true and false OR
    (?<Number>\d[\d\.]{1,})| # a number OR
    (
        (?<Function>\S{1,}) # the top-level function name
        (?<Parameters>\( # the opening parenthesis
            (?>[^\(\)]+|\((?<Depth>)|\)(?<-Depth>))*(?(Depth)(?!)) # anything until we're balanced
        \)) # the closing parenthesis
    )
    (?<Index>\[\d{1,}\]){0,} # One or more indeces
    (?<Property>\.[^\.\s]{1,}){0,} # One or more optional properties
)\s{0,}
"

        $regexOptions = 'Multiline,IgnoreCase,IgnorePatternWhitespace'
        $regexTimeout = [Timespan]::FromSeconds(5)
    }

    process {
        if ($PSCmdlet.ParameterSetName -eq 'SpecificTemplate') {
            # Now let's try to resolve the template path.
            $resolvedTemplatePath =
                # If the template path doesn't appear to be a path to a json file,
                if ($TemplatePath -notmatch '\.json(c)?$') {
                    # see if it looks like a file
                    if ( test-path -path $templatePath -PathType leaf) {
                        $TemplatePath = $TemplatePath | Split-Path # if it does, reassign template path to it's directory.
                    }
                    # Then, go looking beneath that template path
                    $preferredJsonFile = $TemplatePath |
                        Get-ChildItem -Filter *.json |
                        # for a file named azuredeploy.json, prereq.azuredeploy.json or mainTemplate.json
                        Where-Object { 'azuredeploy.json', 'mainTemplate.json', 'prereq.azuredeploy.json' -contains $_.Name } |
                        Select-Object -First 1 -ExpandProperty Fullname
                    # If no file was found, write an error and return.
                    if (-not $preferredJsonFile) {
                        Write-Error "No azuredeploy.json or mainTemplate.json found beneath $TemplatePath"
                        return
                    }
                    $preferredJsonFile
                } else {
                    $ExecutionContext.SessionState.Path.GetResolvedPSPathFromPSPath($templatePath)
                }

            # If we couldn't find a template file, return (an error should have already been written).
            if (-not $resolvedTemplatePath) {  return }


            # Next, we want to pre-populate a number of well-known variables.
            # These variables will be available to every test case.   They are:
            $WellKnownVariables = 'TemplateFullPath','TemplateText','TemplateObject','TemplateFileName',
                'CreateUIDefinitionFullPath','createUIDefinitionText','CreateUIDefinitionObject',
                'FolderName', 'HasCreateUIDefinition', 'IsMainTemplate','FolderFiles',
                'MainTemplatePath', 'MainTemplateObject', 'MainTemplateText',
                'MainTemplateResources','MainTemplateVariables','MainTemplateParameters', 'MainTemplateOutputs', 'TemplateMetadata',
                'isParametersFile', 'ParameterFileName', 'ParameterObject', 'ParameterText',
                'InnerTemplates', 'InnerTemplatesText', 'InnerTemplatesNames','InnerTemplatesLocations','ParentTemplateText', 'ParentTemplateObject',
                'ExpandedTemplateText', 'ExpandedTemplateObject','OriginalTemplateText','OriginalTemplateObject'

            foreach ($_ in $WellKnownVariables) {
                $ExecutionContext.SessionState.PSVariable.Set($_, $null)
            }

            #*$templateFullPath (the full path to the .json file)
            $TemplateFullPath = "$resolvedTemplatePath"
            #*$TemplateFileName (the name of the azure template file)
            $templateFileName = $TemplateFullPath | Split-Path -Leaf
            #*$IsMainTemplate (if the TemplateFileName is named mainTemplate.json)
            $isMainTemplate = 'mainTemplate.json', 'azuredeploy.json', 'prereq.azuredeploy.json' -contains $templateFileName
            $templateFile = Get-Item -LiteralPath "$resolvedTemplatePath"
            $templateFolder = $templateFile.Directory
            #*$FolderName (the name of the root folder containing the template)
            $TemplateName = $templateFolder.Name
            #*$TemplateText (the text contents of the template file)
            $TemplateText = [IO.File]::ReadAllText($resolvedTemplatePath)
            #*$TemplateObject (the template text, converted from JSON)
            $TemplateObject = Import-Json -FilePath $TemplateFullPath
            #*$ParentTemplateText (the parent or original template (will be the same if no nested deployments is found))
            $ParentTemplateText = [IO.File]::ReadAllText($resolvedTemplatePath)
            #*$ParentTemplateObject (the parent or original template (will be the same if no nested deployments is found))
            $ParentTemplateObject = Import-Json -FilePath $TemplateFullPath

            if($TemplateObject.metadata -ne $null){
                $TemplateMetadata = $($TemplateObject.metadata)
            } else {
                $TemplateMetadata = @{}
            }

            $isParametersFile = $resolvedTemplatePath -like '*.parameters.json'

            if ($resolvedTemplatePath -match '\.json(c)?$' -and 
                $TemplateObject.'$schema' -like '*CreateUIDefinition*') {
                $createUiDefinitionFullPath = "$resolvedTemplatePath"
                $createUIDefinitionText = [IO.File]::ReadAllText($createUiDefinitionFullPath)
                $createUIDefinitionObject = Import-Json -FilePath $createUiDefinitionFullPath
                $HasCreateUIDefinition = $true
                $isMainTemplate = $false
                $templateFile =  $TemplateText = $templateObject = $TemplateFullPath = $templateFileName = $null
            } elseif ($isParametersFile) {
                #*$parameterText (the text contents of a parameters file (*.parameters.json)
                $ParameterText = $TemplateText
                #*$parameterObject (the text, converted from json)
                $ParameterObject =  $TemplateObject
                #*$HasParameter (indicates if parameters file exists (*.parameters.json))
                $HasParameters = $true   
                $ParameterFileName = $templateFileName
                $templateFile =  $TemplateText = $templateObject = $TemplateFullPath = $templateFileName = $null
            } else {
                #*$CreateUIDefinitionFullPath (the path to CreateUIDefinition.json)
                $createUiDefinitionFullPath = 
                    Get-ChildItem -Path $templateFolder | 
                    Where-Object Name -eq 'createUiDefinition.json' | 
                    Select-Object -ExpandProperty FullName
                if ($createUiDefinitionFullPath -and (Test-Path $createUiDefinitionFullPath)) {
                    #*$CreateUIDefinitionText (the text contents of CreateUIDefinition.json)
                    $createUIDefinitionText = [IO.File]::ReadAllText($createUiDefinitionFullPath)
                    #*$CreateUIDefinitionObject (the createuidefinition text, converted from json)
                    $createUIDefinitionObject =  Import-Json -FilePath $createUiDefinitionFullPath
                    #*$HasCreateUIDefinition (indicates if a CreateUIDefinition.json file exists)
                    $HasCreateUIDefinition = $true
                } else {
                    $HasCreateUIDefinition = $false
                    $createUiDefinitionFullPath = $null
                }
            }

            #*$FolderFiles (a list of objects of each file in the directory)
            $FolderFiles =
                @(Get-ChildItem -Path $templateFolder.FullName -Recurse |
                    Where-Object { -not $_.PSIsContainer } |
                    ForEach-Object {
                        $fileInfo = $_
                        if ($resolvedTemplatePath -like '*.json' -and -not $isMainTemplate -and 
                            $fileInfo.FullName -ne $resolvedTemplatePath) { return }

                        if ($fileInfo.DirectoryName -eq '__macosx') {
                            return # (excluding files as side-effects of MAC zips)
                        }
                        
                        # All FolderFile objects will have the following properties:

                        if ($fileInfo.Extension -in '.json', '.jsonc') {
                            $fileObject = [Ordered]@{
                                Name = $fileInfo.Name #*Name (the name of the file)
                                Extension = $fileInfo.Extension #*Extension (the file extension)
                                Text = [IO.File]::ReadAllText($fileInfo.FullName)#*Text (the file content as text)
                                FullPath = $fileInfo.Fullname#*FullPath (the full path to the file)
                            }
                            # If the file is JSON, two additional properties may be present:
                            #* Object (the file's text, converted from JSON)
                            $fileObject.Object = Import-Json $fileObject.FullPath
                            #* Schema (the value of the $schema property of the JSON object, if present)
                            $fileObject.schema = $fileObject.Object.'$schema'
                            #* InnerTemplates (any inner templates found within the object)
                            $fileObject.InnerTemplates = @(if ($fileObject.Text -and $fileObject.Text.Contains('"template"')) {
                                Find-JsonContent -InputObject $fileObject.Object -Key template |
                                    Where-Object { $_.expressionEvaluationOptions.scope -eq 'inner' -or $_.jsonPath -like '*.policyRule.*' } |
                                    Sort-Object JSONPath -Descending
                            })                            
                            #* InnerTemplatesText     (an array of the text of each inner template)
                            $fileObject.InnerTemplatesText = @()
                            #* InnerTemplateNames     (an array of the name of each inner template)
                            $fileObject.InnerTemplatesNames = @()
                            #* InnerTemplateLocations (an array of the resolved locations of each inner template)
                            $fileObject.InnerTemplatesLocations = @()
                            if ($fileObject.innerTemplates) {
                                $anyProblems = $false                                
                                foreach ($it in $fileObject.innerTemplates) {
                                    $foundInnerTemplate = $it | Resolve-JSONContent -JsonText $fileObject.Text
                                    if (-not $foundInnerTemplate) { $anyProblems = $true; continue }
                                    $fileObject.InnerTemplatesText += $foundInnerTemplate.Content -replace '^\s{0,}"template"\s{0,}\:\s{0,}'
                                    $fileObject.InnerTemplatesNames += $it.ParentObject[0].Name
                                    $fileObject.InnerTemplatesLocations += $foundInnerTemplate
                                }
                                
                                if ($anyProblems) {
                                    Write-Error "Could not extract inner templates for '$TemplatePath'." -ErrorId InnerTemplate.Extraction.Error
                                }
                            }
                            $fileObject
                        }

                    })

            if ($isMainTemplate) { # If the file was a main template,
                # we set a few more variables:
                #*MainTemplatePath (the path to the main template file)
                $MainTemplatePath = "$TemplateFullPath"
                #*MainTemplateText (the text of the main template file)
                $MainTemplateText = [IO.File]::ReadAllText($MainTemplatePath)
                #*MainTemplateObject (the main template, converted from JSON)
                $MainTemplateObject = Import-Json -FilePath $MainTemplatePath
                #*MainTemplateResources (the resources and child resources in the main template)
                # TODO this was removed from the only test using it (it wasn't working, can probably remove from the fw)
                $MainTemplateResources = if ($mainTemplateObject.Resources) {
                    Expand-Resource -Resource $MainTemplateObject.resources
                } else { $null }
                #*MainTemplateParameters (a hashtable of parameters in the main template)
                $MainTemplateParameters = [Ordered]@{}
                foreach ($prop in $MainTemplateObject.parameters.psobject.properties) {
                    $MainTemplateParameters[$prop.Name] = $prop.Value
                }
                #*MainTemplateVariables (a hashtable of variables in the main template)
                $MainTemplateVariables = [Ordered]@{}
                foreach ($prop in $MainTemplateObject.variables.psobject.properties) {
                    $MainTemplateVariables[$prop.Name] = $prop.Value
                }
                #*MainTemplateOutputs (a hashtable of outputs in the main template)
                $MainTemplateOutputs = [Ordered]@{}
                foreach ($prop in $MainTemplateObject.outputs.psobject.properties) {
                    $MainTemplateOutputs[$prop.Name] = $prop.Value
                }
            }

            # If we've found a CreateUIDefinition, we'll want to process it first.
            if ($HasCreateUIDefinition) {
                # Loop over the folder files and get every file that isn't createUIDefinition
                $otherFolderFiles = @(foreach ($_ in $FolderFiles) {
                    if ($_.Name -ne 'CreateUIDefinition.json') {
                        $_
                    } else {
                        $createUIDefFile = $_
                    }
                })
                # Then recreate the list with createUIDefinition that the front.
                $FolderFiles = @(@($createUIDefFile) + @($otherFolderFiles) -ne $null)
            }

            
            $innerTemplates = @(if ($templateText -and $TemplateText.Contains('"template"')) {
                Find-JsonContent -InputObject $templateObject -Key template |
                    Where-Object { $_.expressionEvaluationOptions.scope -eq 'inner' -or $_.jsonPath -like '*.policyRule.*' } |
                    Sort-Object JSONPath -Descending
            })

            $innerTemplatesText =@()

            if ($innerTemplates) {
                $anyProblems = $false
                $originalTemplateText = "$TemplateText"
                $OriginalTemplateObject = $TemplateObject
                foreach ($it in $innerTemplates) {
                    $foundInnerTemplate = $it | Resolve-JSONContent -JsonText $TemplateText
                    if (-not $foundInnerTemplate) { $anyProblems = $true; break }
                    $innerTemplatesText += $foundInnerTemplate.Content -replace '"template"\s{0,}\:\s{0,}'
                    $TemplateText = $TemplateText.Remove($foundInnerTemplate.Index, $foundInnerTemplate.Length)
                    $TemplateText = $TemplateText.Insert($foundInnerTemplate.Index, '"template": {}')
                }

                if (-not $anyProblems) {
                    $TemplateObject = $TemplateText | ConvertFrom-Json
                } else {
                    Write-Error "Could not extract inner templates for '$TemplatePath'." -ErrorId InnerTemplate.Extraction.Error
                }
            } else {
                $originalTemplateText = $TemplateText
                $OriginalTemplateObject = $TemplateObject   
            }
            
            
            if ($TemplateText) {
                $variableReferences = $TemplateText | ?<ARM_Variable> 
                $expandedTemplateText = $TemplateText | ?<ARM_Variable> -ReplaceEvaluator {
                    param($match)

                    $templateVariableValue = $templateObject.variables.$($match.Groups['VariableName'])
                    if ($match.Groups["Property"].Success) {
                    
                        $v = $templateVariableValue
                        foreach ($prop in $match.Groups["Property"] -split '\.' -ne '') {
                            if ($prop -match '\[(?<Index>\d+)]$') {
                                $v.($prop.Replace("$($matches.0)", ''))[[int]$matches.Index]
                            } else {
                                $v  = $v.$prop
                            }
                        }
                        return "'$("$v".Replace("'","\'"))'"
                    } else {
                        if ($templateVariableValue -isnot [string]) { # If the value is not a string                            
                            return "json('$(($templateVariableValue | ConvertTo-Json -Depth 100 -Compress) -replace '\\u0027b', "'" -replace '"','\"'))'"
                            # make it JSON
                        }
                        if ("$templateVariableValue".StartsWith('[')) { # If the value is a subexpression
                            if ("$templateVariableValue".EndsWith(']')) { 
                                return "$templateVariableValue" -replace '^\[' -replace '\]$' -replace '"', '\"' # Escape the brackets and quotes
                            } else {
                                return $templateVariableValue
                            }
                        } else {
                            return "'" + "$templateVariableValue".Replace("'","\'") + "'"
                        }
                    
                        return "$($templateObject.variables.$($match.Groups['VariableName']))".Replace("'","\'")
                    }
                }

                if ($expandedTemplateText -ne $TemplateText) {
                    $expandedTemplateObject = try { $expandedTemplateText | ConvertFrom-Json -ErrorAction Stop -ErrorVariable err } catch {
                        "$_" | Write-Debug
                    }
                } else {
                    $expandedTemplateObject = $null
                }
            }

            $out = [Ordered]@{}
            foreach ($v in $WellKnownVariables) {
                $out[$v] = $ExecutionContext.SessionState.PSVariable.Get($v).Value
            }
            $out
        }
        elseif ($PSCmdlet.ParameterSetName -eq 'Expression') {

            # First, we need to see if the expression provided looks like a template language expression
            $matched? =
                [Regex]::Match($Expression, $TemplateLanguageExpression, $regexOptions, $regexTimeout)
            if (-not $matched?.Success) { # If it wasn't
                Write-Verbose "$Expression is not an expression" # Write to the verbose stream
                return $Expression # and return the original expression
            }



            $functionName = $matched?.Groups["Function"].Value

            if (-not $InputObject.$functionName) { # If there wasn't a property on the inputobject
                return $matched?.Value # Return the expression
            }

            # Get the parameters
            $parametersExpression = $matched?.Groups["Parameters"].Value
            # strip off the () (don't use trim, or we might hurt subexpressions)
            $parametersExpression = $parametersExpression.Substring(1,$parametersExpression.Length - 1)

            $functionParameters = @([Regex]::Matches($parametersExpression, $TemplateParametersExpression, $regexOptions, $regexTimeout))
            if (-not $functionParameters) { # If there were no parameters
                return $matched?.Value      # return the partially resolved expression.
            }

            if (-not $functionParameters[0].Groups["StringLiteral"].Success) { # If we didn't get a literal value
                return $matched?.Value     # return the partially resolved expression.
            }

            if ($Include -and $Include -notcontains $functionName) { # If we have a whitelist, and the function isn't in it.
                return $Expression # don't evaluate.
            }

            if ($Exclude -and $Exclude -contains $functionName) { # If we have a blacklist, and the function is in it.
                return $Expression # don't evaluate.
            }


            # Find the target property
            $targetProperty = $functionParameters[0].Groups["StringLiteral"].Value

            # and resolve the target object.
            $targetObject = $InputObject.$functionName.$targetProperty


            if (-not $targetObject) {  # If the object didn't resolve,
                Write-Error ".$functionName.$targetProperty not found" # error out.
                return
            }


            if ($matched?.Groups["Index"].Success) {  # Assuming it did, we have to check for indices
                $index = $matched?.Groups["Index"].Value -replace '[\[\]]', '' -as [int]

                if (-not $targetObject[$index]) {
                    Write-Error "Index $index not found"
                    return
                } else {
                    $targetObject = $targetObject[$index]
                }
            }
            # Since we can nest properties and indices, we just have to work thru each remaining one.
            $propertyMatchGroup = $matched?.Groups["Property"]
            if ($propertyMatchGroup.Success) {
                foreach ($cap in $propertyMatchGroup.Captures) {
                    $propName, $propIndex = $cap.Value -split '[\.\[\]]' -ne ''

                    if (-not $targetObject.$propName) {
                        Write-Error "Property $propName not found"
                        return
                    }

                    $targetObject = $targetObject.$propName
                    if ($propIndex -and $propIndex -as [int] -ne $null) {
                        if (-not $targetObject[$propIndex -as [int]]) {
                            Write-Error "Index $propIndex not found"
                            return
                        } else {
                            $targetObject = $targetObject[$propIndex -as [int]]
                        }
                    }
                }
            }

            # and at last, we can return whatever was resolved.
            return $targetObject
        }
    }
}

# SIG # Begin signature block
# MIInqgYJKoZIhvcNAQcCoIInmzCCJ5cCAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCDiz9L20pQDSrBF
# Mb2gfjjzSHrSk2loUFFoTgaYbeof1qCCDYEwggX/MIID56ADAgECAhMzAAACUosz
# qviV8znbAAAAAAJSMA0GCSqGSIb3DQEBCwUAMH4xCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNpZ25p
# bmcgUENBIDIwMTEwHhcNMjEwOTAyMTgzMjU5WhcNMjIwOTAxMTgzMjU5WjB0MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMR4wHAYDVQQDExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
# AQDQ5M+Ps/X7BNuv5B/0I6uoDwj0NJOo1KrVQqO7ggRXccklyTrWL4xMShjIou2I
# sbYnF67wXzVAq5Om4oe+LfzSDOzjcb6ms00gBo0OQaqwQ1BijyJ7NvDf80I1fW9O
# L76Kt0Wpc2zrGhzcHdb7upPrvxvSNNUvxK3sgw7YTt31410vpEp8yfBEl/hd8ZzA
# v47DCgJ5j1zm295s1RVZHNp6MoiQFVOECm4AwK2l28i+YER1JO4IplTH44uvzX9o
# RnJHaMvWzZEpozPy4jNO2DDqbcNs4zh7AWMhE1PWFVA+CHI/En5nASvCvLmuR/t8
# q4bc8XR8QIZJQSp+2U6m2ldNAgMBAAGjggF+MIIBejAfBgNVHSUEGDAWBgorBgEE
# AYI3TAgBBggrBgEFBQcDAzAdBgNVHQ4EFgQUNZJaEUGL2Guwt7ZOAu4efEYXedEw
# UAYDVR0RBEkwR6RFMEMxKTAnBgNVBAsTIE1pY3Jvc29mdCBPcGVyYXRpb25zIFB1
# ZXJ0byBSaWNvMRYwFAYDVQQFEw0yMzAwMTIrNDY3NTk3MB8GA1UdIwQYMBaAFEhu
# ZOVQBdOCqhc3NyK1bajKdQKVMFQGA1UdHwRNMEswSaBHoEWGQ2h0dHA6Ly93d3cu
# bWljcm9zb2Z0LmNvbS9wa2lvcHMvY3JsL01pY0NvZFNpZ1BDQTIwMTFfMjAxMS0w
# Ny0wOC5jcmwwYQYIKwYBBQUHAQEEVTBTMFEGCCsGAQUFBzAChkVodHRwOi8vd3d3
# Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NlcnRzL01pY0NvZFNpZ1BDQTIwMTFfMjAx
# MS0wNy0wOC5jcnQwDAYDVR0TAQH/BAIwADANBgkqhkiG9w0BAQsFAAOCAgEAFkk3
# uSxkTEBh1NtAl7BivIEsAWdgX1qZ+EdZMYbQKasY6IhSLXRMxF1B3OKdR9K/kccp
# kvNcGl8D7YyYS4mhCUMBR+VLrg3f8PUj38A9V5aiY2/Jok7WZFOAmjPRNNGnyeg7
# l0lTiThFqE+2aOs6+heegqAdelGgNJKRHLWRuhGKuLIw5lkgx9Ky+QvZrn/Ddi8u
# TIgWKp+MGG8xY6PBvvjgt9jQShlnPrZ3UY8Bvwy6rynhXBaV0V0TTL0gEx7eh/K1
# o8Miaru6s/7FyqOLeUS4vTHh9TgBL5DtxCYurXbSBVtL1Fj44+Od/6cmC9mmvrti
# yG709Y3Rd3YdJj2f3GJq7Y7KdWq0QYhatKhBeg4fxjhg0yut2g6aM1mxjNPrE48z
# 6HWCNGu9gMK5ZudldRw4a45Z06Aoktof0CqOyTErvq0YjoE4Xpa0+87T/PVUXNqf
# 7Y+qSU7+9LtLQuMYR4w3cSPjuNusvLf9gBnch5RqM7kaDtYWDgLyB42EfsxeMqwK
# WwA+TVi0HrWRqfSx2olbE56hJcEkMjOSKz3sRuupFCX3UroyYf52L+2iVTrda8XW
# esPG62Mnn3T8AuLfzeJFuAbfOSERx7IFZO92UPoXE1uEjL5skl1yTZB3MubgOA4F
# 8KoRNhviFAEST+nG8c8uIsbZeb08SeYQMqjVEmkwggd6MIIFYqADAgECAgphDpDS
# AAAAAAADMA0GCSqGSIb3DQEBCwUAMIGIMQswCQYDVQQGEwJVUzETMBEGA1UECBMK
# V2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
# IENvcnBvcmF0aW9uMTIwMAYDVQQDEylNaWNyb3NvZnQgUm9vdCBDZXJ0aWZpY2F0
# ZSBBdXRob3JpdHkgMjAxMTAeFw0xMTA3MDgyMDU5MDlaFw0yNjA3MDgyMTA5MDla
# MH4xCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdS
# ZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMT
# H01pY3Jvc29mdCBDb2RlIFNpZ25pbmcgUENBIDIwMTEwggIiMA0GCSqGSIb3DQEB
# AQUAA4ICDwAwggIKAoICAQCr8PpyEBwurdhuqoIQTTS68rZYIZ9CGypr6VpQqrgG
# OBoESbp/wwwe3TdrxhLYC/A4wpkGsMg51QEUMULTiQ15ZId+lGAkbK+eSZzpaF7S
# 35tTsgosw6/ZqSuuegmv15ZZymAaBelmdugyUiYSL+erCFDPs0S3XdjELgN1q2jz
# y23zOlyhFvRGuuA4ZKxuZDV4pqBjDy3TQJP4494HDdVceaVJKecNvqATd76UPe/7
# 4ytaEB9NViiienLgEjq3SV7Y7e1DkYPZe7J7hhvZPrGMXeiJT4Qa8qEvWeSQOy2u
# M1jFtz7+MtOzAz2xsq+SOH7SnYAs9U5WkSE1JcM5bmR/U7qcD60ZI4TL9LoDho33
# X/DQUr+MlIe8wCF0JV8YKLbMJyg4JZg5SjbPfLGSrhwjp6lm7GEfauEoSZ1fiOIl
# XdMhSz5SxLVXPyQD8NF6Wy/VI+NwXQ9RRnez+ADhvKwCgl/bwBWzvRvUVUvnOaEP
# 6SNJvBi4RHxF5MHDcnrgcuck379GmcXvwhxX24ON7E1JMKerjt/sW5+v/N2wZuLB
# l4F77dbtS+dJKacTKKanfWeA5opieF+yL4TXV5xcv3coKPHtbcMojyyPQDdPweGF
# RInECUzF1KVDL3SV9274eCBYLBNdYJWaPk8zhNqwiBfenk70lrC8RqBsmNLg1oiM
# CwIDAQABo4IB7TCCAekwEAYJKwYBBAGCNxUBBAMCAQAwHQYDVR0OBBYEFEhuZOVQ
# BdOCqhc3NyK1bajKdQKVMBkGCSsGAQQBgjcUAgQMHgoAUwB1AGIAQwBBMAsGA1Ud
# DwQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB8GA1UdIwQYMBaAFHItOgIxkEO5FAVO
# 4eqnxzHRI4k0MFoGA1UdHwRTMFEwT6BNoEuGSWh0dHA6Ly9jcmwubWljcm9zb2Z0
# LmNvbS9wa2kvY3JsL3Byb2R1Y3RzL01pY1Jvb0NlckF1dDIwMTFfMjAxMV8wM18y
# Mi5jcmwwXgYIKwYBBQUHAQEEUjBQME4GCCsGAQUFBzAChkJodHRwOi8vd3d3Lm1p
# Y3Jvc29mdC5jb20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dDIwMTFfMjAxMV8wM18y
# Mi5jcnQwgZ8GA1UdIASBlzCBlDCBkQYJKwYBBAGCNy4DMIGDMD8GCCsGAQUFBwIB
# FjNodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2RvY3MvcHJpbWFyeWNw
# cy5odG0wQAYIKwYBBQUHAgIwNB4yIB0ATABlAGcAYQBsAF8AcABvAGwAaQBjAHkA
# XwBzAHQAYQB0AGUAbQBlAG4AdAAuIB0wDQYJKoZIhvcNAQELBQADggIBAGfyhqWY
# 4FR5Gi7T2HRnIpsLlhHhY5KZQpZ90nkMkMFlXy4sPvjDctFtg/6+P+gKyju/R6mj
# 82nbY78iNaWXXWWEkH2LRlBV2AySfNIaSxzzPEKLUtCw/WvjPgcuKZvmPRul1LUd
# d5Q54ulkyUQ9eHoj8xN9ppB0g430yyYCRirCihC7pKkFDJvtaPpoLpWgKj8qa1hJ
# Yx8JaW5amJbkg/TAj/NGK978O9C9Ne9uJa7lryft0N3zDq+ZKJeYTQ49C/IIidYf
# wzIY4vDFLc5bnrRJOQrGCsLGra7lstnbFYhRRVg4MnEnGn+x9Cf43iw6IGmYslmJ
# aG5vp7d0w0AFBqYBKig+gj8TTWYLwLNN9eGPfxxvFX1Fp3blQCplo8NdUmKGwx1j
# NpeG39rz+PIWoZon4c2ll9DuXWNB41sHnIc+BncG0QaxdR8UvmFhtfDcxhsEvt9B
# xw4o7t5lL+yX9qFcltgA1qFGvVnzl6UJS0gQmYAf0AApxbGbpT9Fdx41xtKiop96
# eiL6SJUfq/tHI4D1nvi/a7dLl+LrdXga7Oo3mXkYS//WsyNodeav+vyL6wuA6mk7
# r/ww7QRMjt/fdW1jkT3RnVZOT7+AVyKheBEyIXrvQQqxP/uozKRdwaGIm1dxVk5I
# RcBCyZt2WwqASGv9eZ/BvW1taslScxMNelDNMYIZfzCCGXsCAQEwgZUwfjELMAkG
# A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
# HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEoMCYGA1UEAxMfTWljcm9z
# b2Z0IENvZGUgU2lnbmluZyBQQ0EgMjAxMQITMwAAAlKLM6r4lfM52wAAAAACUjAN
# BglghkgBZQMEAgEFAKCBrjAZBgkqhkiG9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgor
# BgEEAYI3AgELMQ4wDAYKKwYBBAGCNwIBFTAvBgkqhkiG9w0BCQQxIgQgGtdVPZTO
# nmAhkTtRxXtC91EmOfDzzXoHQD4i4iqZZ4owQgYKKwYBBAGCNwIBDDE0MDKgFIAS
# AE0AaQBjAHIAbwBzAG8AZgB0oRqAGGh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbTAN
# BgkqhkiG9w0BAQEFAASCAQCKqaN85aAFjjctVfLDBAhYs3WibYx7q94SONMv4BBT
# hjnHsxWJDUSCErS9+gObG3y4RLk8iB4AMNyY8svJuiYZcnAeeo4k1hyUuCMAGt8I
# CtQKOqw6LHKKHUigqSsmHCGSsXZVVvedyCAFN4qfUYO0XLjTm8VxajoepHZ/hnx+
# hk76iHc04pwwT+WYWHYPA87YDF3oB7ZhoHvA67iPfFK0/ub3J1Crq/cAGq48ecj7
# xPvfr9fdRh1kNOXWURE/Y5VTZQ8z4tIrSJ2eeJYlQkq2eBqgKh9x4MuPZKz7YIbZ
# vElpjIArhKNAdeiUYYriJymqvzqGz9R+affmIFJAZMGkoYIXCTCCFwUGCisGAQQB
# gjcDAwExghb1MIIW8QYJKoZIhvcNAQcCoIIW4jCCFt4CAQMxDzANBglghkgBZQME
# AgEFADCCAVUGCyqGSIb3DQEJEAEEoIIBRASCAUAwggE8AgEBBgorBgEEAYRZCgMB
# MDEwDQYJYIZIAWUDBAIBBQAEIDFfVoShsGiun4hNPsWI9FdNASaVUkwrcxc7QOXo
# d5QdAgZisixRb9gYEzIwMjIwNzEzMjE1NjMxLjU5OVowBIACAfSggdSkgdEwgc4x
# CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
# b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xKTAnBgNVBAsTIE1p
# Y3Jvc29mdCBPcGVyYXRpb25zIFB1ZXJ0byBSaWNvMSYwJAYDVQQLEx1UaGFsZXMg
# VFNTIEVTTjpGODdBLUUzNzQtRDdCOTElMCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUt
# U3RhbXAgU2VydmljZaCCEVwwggcQMIIE+KADAgECAhMzAAABrqoLXLM0pZUaAAEA
# AAGuMA0GCSqGSIb3DQEBCwUAMHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNo
# aW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
# cG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEw
# MB4XDTIyMDMwMjE4NTEzN1oXDTIzMDUxMTE4NTEzN1owgc4xCzAJBgNVBAYTAlVT
# MRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQK
# ExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xKTAnBgNVBAsTIE1pY3Jvc29mdCBPcGVy
# YXRpb25zIFB1ZXJ0byBSaWNvMSYwJAYDVQQLEx1UaGFsZXMgVFNTIEVTTjpGODdB
# LUUzNzQtRDdCOTElMCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vydmlj
# ZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAJOMGvEhNQwLHactznPp
# Y8Jg5qI8Qsgp0mhl2G2ztVPonq4gsOMe5u9p5f17PIM1KXjUaKNl3djncq29Liqm
# qnaKORggPHNEk7Q+tal5Iyc+S8k/R31gCGt4qvQVqBLQNivxOukUfapG41LTdLHe
# M4uwInk+QrGQH2K4wjNtiUpirF2PdCcbkXyALEpyT2RrwzJmzcmbdCscY0N3RHxr
# MeWQ3k7sNt41NBZOT+4pCmkw8UkgKiSJXMzKs38MxUqx/OlS80dLDTHd+Zei1S1/
# qbCtTGzNm0bj6qfklUM3JFAF1JLXwwvqgZRdDQU6224wtGnwalTaOI0R0eX+crcP
# pXGB27EIgYU+0lo2aH79SNrsPWEcdBICd0yfhFU2niVJepGzkXetJvbFxW3iN7sc
# jLfw/S6UXF7wtEzdONXViI5P2UM779P6EIZ+g81E2MWX8XjLVyvIsvzyckJ4FFi+
# h1yPE+vzckPxzHOsiLaafucsyMjAaAM8Wwa+02BujEOylfLSyk0iv9IvSI9ZkJW/
# gLvQ42U0+U035ZhUhCqbKEWEMIr2ya2rYprUMEKcXf4R97LVPBfsJnbkNUubpUA4
# K1i7ijQ1pkUlt+YQ/34mtEy7eSigVpVznqfrNVerCvHG5IwfeFVhPNbAwK6lBEQ2
# 9nMYjRXj4QLyvmKRmqOJM/w1AgMBAAGjggE2MIIBMjAdBgNVHQ4EFgQU0zBv378o
# YIrBqa10/vztZDphUe4wHwYDVR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIw
# XwYDVR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9w
# cy9jcmwvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3Js
# MGwGCCsGAQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDovL3d3dy5taWNyb3Nv
# ZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQlMjBUaW1lLVN0YW1wJTIwUENB
# JTIwMjAxMCgxKS5jcnQwDAYDVR0TAQH/BAIwADATBgNVHSUEDDAKBggrBgEFBQcD
# CDANBgkqhkiG9w0BAQsFAAOCAgEAXb+R8P1VAEQOPK0zAxADIXP4cJQmartjVFLM
# EkLYh39PFtVbt84Rv0Q1GSTYmhP8f/OOvnmC5ejw3Nc1VRi74rWGUITv18Wqr8eB
# vASd4eDAxFbA8knOOm/ZySkMDDYdb6738aQ0yvqf7AWchgPntCc/nhNapSJmjzUk
# e7EvjB8ei0BnY0xl+AQcSxJG/Vnsm9IwOer8E1miVLYfPn9fIDdaav1bq9i+gnZf
# 1hS7apGpxbitCJr1KGD4jIyABkxHheoPOhhtQm1uznE7blKxH8pU7W2A+eqggsNk
# M3VB0nrzRZBqm4SmBSNhOPzy3ofOmLcRK/aloOAr6nehi8i5lhmTg1LkOAxChLwH
# vluiCY9K+2vIpt48ioK/h+tz5RgVdb+S8xwn728lN8KPkkB2Ra5iicrvtgA55wSU
# dh6FFxXxeS+bsgBayn7ZyafTpDM7BQOBYwaodsuVf5XgGryGx84k4R58mPwB3Q09
# CRAGs35NOt6TrPXqcylNu6Zz8xTQDcaJp54pKyOoW5iIDFjpLneXTEjtWCFCgAo4
# zbp9CNITp97KPnc3gZVaMvEpU8Sp7VZwN9ckR2WDKyOjDghIcfuFJTLOdkOuMLGs
# WPdnY6idtWc2bUDQa2QbzmNSZyFthEprwQ2GmgaGbGKuYVVqUj/Yt21HD0PBeDI5
# Mal8ScwwggdxMIIFWaADAgECAhMzAAAAFcXna54Cm0mZAAAAAAAVMA0GCSqGSIb3
# DQEBCwUAMIGIMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4G
# A1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMTIw
# MAYDVQQDEylNaWNyb3NvZnQgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgMjAx
# MDAeFw0yMTA5MzAxODIyMjVaFw0zMDA5MzAxODMyMjVaMHwxCzAJBgNVBAYTAlVT
# MRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQK
# ExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1l
# LVN0YW1wIFBDQSAyMDEwMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA
# 5OGmTOe0ciELeaLL1yR5vQ7VgtP97pwHB9KpbE51yMo1V/YBf2xK4OK9uT4XYDP/
# XE/HZveVU3Fa4n5KWv64NmeFRiMMtY0Tz3cywBAY6GB9alKDRLemjkZrBxTzxXb1
# hlDcwUTIcVxRMTegCjhuje3XD9gmU3w5YQJ6xKr9cmmvHaus9ja+NSZk2pg7uhp7
# M62AW36MEBydUv626GIl3GoPz130/o5Tz9bshVZN7928jaTjkY+yOSxRnOlwaQ3K
# Ni1wjjHINSi947SHJMPgyY9+tVSP3PoFVZhtaDuaRr3tpK56KTesy+uDRedGbsoy
# 1cCGMFxPLOJiss254o2I5JasAUq7vnGpF1tnYN74kpEeHT39IM9zfUGaRnXNxF80
# 3RKJ1v2lIH1+/NmeRd+2ci/bfV+AutuqfjbsNkz2K26oElHovwUDo9Fzpk03dJQc
# NIIP8BDyt0cY7afomXw/TNuvXsLz1dhzPUNOwTM5TI4CvEJoLhDqhFFG4tG9ahha
# YQFzymeiXtcodgLiMxhy16cg8ML6EgrXY28MyTZki1ugpoMhXV8wdJGUlNi5UPkL
# iWHzNgY1GIRH29wb0f2y1BzFa/ZcUlFdEtsluq9QBXpsxREdcu+N+VLEhReTwDwV
# 2xo3xwgVGD94q0W29R6HXtqPnhZyacaue7e3PmriLq0CAwEAAaOCAd0wggHZMBIG
# CSsGAQQBgjcVAQQFAgMBAAEwIwYJKwYBBAGCNxUCBBYEFCqnUv5kxJq+gpE8RjUp
# zxD/LwTuMB0GA1UdDgQWBBSfpxVdAF5iXYP05dJlpxtTNRnpcjBcBgNVHSAEVTBT
# MFEGDCsGAQQBgjdMg30BATBBMD8GCCsGAQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jv
# c29mdC5jb20vcGtpb3BzL0RvY3MvUmVwb3NpdG9yeS5odG0wEwYDVR0lBAwwCgYI
# KwYBBQUHAwgwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGG
# MA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAU1fZWy4/oolxiaNE9lJBb186a
# GMQwVgYDVR0fBE8wTTBLoEmgR4ZFaHR0cDovL2NybC5taWNyb3NvZnQuY29tL3Br
# aS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0XzIwMTAtMDYtMjMuY3JsMFoGCCsG
# AQUFBwEBBE4wTDBKBggrBgEFBQcwAoY+aHR0cDovL3d3dy5taWNyb3NvZnQuY29t
# L3BraS9jZXJ0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5jcnQwDQYJKoZIhvcN
# AQELBQADggIBAJ1VffwqreEsH2cBMSRb4Z5yS/ypb+pcFLY+TkdkeLEGk5c9MTO1
# OdfCcTY/2mRsfNB1OW27DzHkwo/7bNGhlBgi7ulmZzpTTd2YurYeeNg2LpypglYA
# A7AFvonoaeC6Ce5732pvvinLbtg/SHUB2RjebYIM9W0jVOR4U3UkV7ndn/OOPcbz
# aN9l9qRWqveVtihVJ9AkvUCgvxm2EhIRXT0n4ECWOKz3+SmJw7wXsFSFQrP8DJ6L
# GYnn8AtqgcKBGUIZUnWKNsIdw2FzLixre24/LAl4FOmRsqlb30mjdAy87JGA0j3m
# Sj5mO0+7hvoyGtmW9I/2kQH2zsZ0/fZMcm8Qq3UwxTSwethQ/gpY3UA8x1RtnWN0
# SCyxTkctwRQEcb9k+SS+c23Kjgm9swFXSVRk2XPXfx5bRAGOWhmRaw2fpCjcZxko
# JLo4S5pu+yFUa2pFEUep8beuyOiJXk+d0tBMdrVXVAmxaQFEfnyhYWxz/gq77EFm
# PWn9y8FBSX5+k77L+DvktxW/tM4+pTFRhLy/AsGConsXHRWJjXD+57XQKBqJC482
# 2rpM+Zv/Cuk0+CQ1ZyvgDbjmjJnW4SLq8CdCPSWU5nR0W2rRnj7tfqAxM328y+l7
# vzhwRNGQ8cirOoo6CGJ/2XBjU02N7oJtpQUQwXEGahC0HVUzWLOhcGbyoYICzzCC
# AjgCAQEwgfyhgdSkgdEwgc4xCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
# dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9y
# YXRpb24xKTAnBgNVBAsTIE1pY3Jvc29mdCBPcGVyYXRpb25zIFB1ZXJ0byBSaWNv
# MSYwJAYDVQQLEx1UaGFsZXMgVFNTIEVTTjpGODdBLUUzNzQtRDdCOTElMCMGA1UE
# AxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2VydmljZaIjCgEBMAcGBSsOAwIaAxUA
# vJqwk/xnycgV5Gdy5b4IwE/TWuOggYMwgYCkfjB8MQswCQYDVQQGEwJVUzETMBEG
# A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
# cm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFt
# cCBQQ0EgMjAxMDANBgkqhkiG9w0BAQUFAAIFAOZ5q0kwIhgPMjAyMjA3MTQwMDM2
# MjVaGA8yMDIyMDcxNTAwMzYyNVowdDA6BgorBgEEAYRZCgQBMSwwKjAKAgUA5nmr
# SQIBADAHAgEAAgIFcjAHAgEAAgIRCjAKAgUA5nr8yQIBADA2BgorBgEEAYRZCgQC
# MSgwJjAMBgorBgEEAYRZCgMCoAowCAIBAAIDB6EgoQowCAIBAAIDAYagMA0GCSqG
# SIb3DQEBBQUAA4GBAMDs1/Z6engkF97Kbx6vqpvPqpA9MYp9lGoPOE1RucHGRS7X
# c+ERA6DrMc7zh78lohWTYKgechd4Dd3gpgrHXgKSGarC+Papq6XxrNMi+/CGogNu
# pF2AJVVjg0HU8SAEwao9N9pcwXopOzWs6/VmLIzftVVSvYnt5I/GviqKDoTaMYIE
# DTCCBAkCAQEwgZMwfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
# EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
# bjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAGu
# qgtcszSllRoAAQAAAa4wDQYJYIZIAWUDBAIBBQCgggFKMBoGCSqGSIb3DQEJAzEN
# BgsqhkiG9w0BCRABBDAvBgkqhkiG9w0BCQQxIgQg4iHeuegmc5Aboa+E2u10BZfk
# Uj0zVomCb2CvWIWKoLYwgfoGCyqGSIb3DQEJEAIvMYHqMIHnMIHkMIG9BCBJKB0+
# uIzDWqHun09mqTU8uOg6tew0yu1uQ0iU/FJvaDCBmDCBgKR+MHwxCzAJBgNVBAYT
# AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYD
# VQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBU
# aW1lLVN0YW1wIFBDQSAyMDEwAhMzAAABrqoLXLM0pZUaAAEAAAGuMCIEIBAXRXvh
# ft9sq9qrN7pvVdGXhxEEgL3fmCsi24HHDzo/MA0GCSqGSIb3DQEBCwUABIICAFOV
# Lm0UiqglJJ0Uj4zGy1PkLBQCdCgkYBFdi6sRgf38l8r72lJ4rNsCmfOK/yvKdFmg
# mwrC0cCBoFA6M91a7EEWQuoC3FLGsWr7iu8ODj9Ehu99u4eC8xfVw15zg+AdrbA7
# 46uZeUbJVGUNm4vA318f0Oy+PvkX5e18g0XT+4CtbU6G5cN//QDQcNZDk3EpTiAl
# /UQ6q4NPAywBIZ/9FdLyZbuCrTrIoBGdHQk2VX/i4K07KPAjWHpXiTlpiOvpZYjY
# QEV8jdTj5agJKBlWAtFPhFNEGbMUDOMIDcki9W83sjhwIMmzOdec2vhzRQhk2t8M
# EbcAJAGvFq/fkHl8fwBnusVVr7zFBWoydTRCJW2SPk8GPSkFXOjD2G4sea94zInt
# KYohixuji9Mw8stix5O9Hj4imEBqvw33J7EW43wuHP8sCbodmO5KsakhGWUNVy3s
# ItTXdGi0TDVe0u2Ui9HDqSMLtir+hQs6VX/Sz4+aH2JtHZINVQzajYPGJ3uY07Zb
# 9WyL+M7zl1XD2O82/EO1etn3PzgtUIXqhteeIBBUCBDFPag5sRCpfvKGj8CQSl4Q
# s56+/DKT+0WhqbVzzy1ls1B4LTLZ8+MO0VXXS83LjZ7NjZy/zHQC2TZIOB1v4NqL
# 5qCU1PgsqpEAvOLwvDO158P/H5wwA58Nln5MwDpo
# SIG # End signature block
