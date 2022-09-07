function Test-AzTemplate
{
    [Alias('Test-AzureRMTemplate')] # Added for backward compat with MP
    <#
    .Synopsis
Tests an Azure Resource Manager Template
    .Description
Validates one or more Azure Resource Manager Templates.
    .Notes
Test-AzTemplate validates an Azure Resource Manager template using a number of small test scripts.

Test scripts can be found in /testcases/GroupName, or provided with the -TestScript parameter.

Each test script has access to a set of well-known variables:

* TemplateFullPath (The full path to the template file)
* TemplateFileName (The name of the template file)
* TemplateText (The template text)
* TemplateObject (The template object)
* FolderName (The name of the directory containing the template file)
* FolderFiles (a hashtable of each file in the folder)
* IsMainTemplate (a boolean indicating if the template file name is mainTemplate.json)
* CreateUIDefintionFullPath (the full path to createUIDefintion.json)
* CreateUIDefinitionText (the text of createUIDefintion.json)
* CreateUIDefinitionObject ( the createUIDefintion object)
* HasCreateUIDefintion (a boolean indicating if the directory includes createUIDefintion.json)
* MainTemplateText (the text of the main template file)
* MainTemplateObject (the main template file, converted from JSON)
* MainTemplateResources (the resources and child resources of the main template)
* MainTemplateParameters (a hashtable containing the parameters found in the main template)
* MainTemplateVariables (a hashtable containing the variables found in the main template)
* MainTemplateOutputs (a hashtable containing the outputs found in the main template)
* InnerTemplates (indicates if the template contained or was in inner templates)
* IsInnerTemplate (indicates if currently testing an inner template)
* ExpandedTemplateText (the text of a template, with variables expanded)
* ExpandedTemplateOjbect (the object of a template, with variables expanded)

    .Example
        Test-AzTemplate -TemplatePath ./FolderWithATemplate
        # Tests all files in /FolderWithATemplate
    .Example
        Test-AzTemplate -TemplatePath ./Templates/NameOfTemplate.json
        # Tests the file at the location ./Templates/NameOfTemplate.json.
    .Example
        Test-AzTemplate -TemplatePath ./FolderWithATemplate -Test 'DeploymentTemplate-Schema-Is-Correct' 
        # Runs the test 'DeploymentTemplate-Schema-Is-Correct' on all files in the folder /FolderWithATemplate
    .Example
        Test-AzTemplate -TemplatePath ./FolderWithATemplate -Skip 'DeploymentTemplate-Schema-Is-Correct'
        # Skips the test 'DeploymentTemplate-Schema-Is-Correct'
    .Example
        Test-AzTemplate -TemplatePath ./FolderWithATemplate -SkipByFile @{
            '*azureDeploy*' = '*apiVersions*'
            '*' = '*schema*'
        }
        # Skips tests named like *apiversions* on files with the text "azureDeploy" in the filename, and skips with the text "schema" in the test name for all files.
    .Example
        Test-AzTemplate -TemplatePath ./FolderWithATemplate | Export-Clixml ./Results.clixml
        # Tests all template files in ./FolderWithATemplate, and exports their results to clixml.
    .Example
        Test-AzTemplate -TemplatePath ./DirectoryWithTemplates -GroupName AllFiles
        # Runs all tests included in the group "AllFiles" on all the files located in ./DirectoryWithTemplates
    
    #>
    [CmdletBinding(DefaultParameterSetName='NearbyTemplate')]
    param(
    # The path to an Azure resource manager template
    [Parameter(Mandatory=$true,Position=0,ValueFromPipelineByPropertyName=$true,ParameterSetName='SpecificTemplate')]
    [Alias('Fullname','Path')]
    [string]
    $TemplatePath,

    # One or more test cases or groups.  If this parameter is provided, only those test cases and groups will be run.
    [Parameter(Position=1)]
    [Alias('Tests')]
    [string[]]
    $Test,

    # If provided, will only validate files in the template directory matching one of these wildcards.
    [Parameter(Position=2)]
    [Alias('Files')]
    [string[]]
    $File,

    # A set of test cases.  If not provided, the files in /testcases will be used as input.
    [Parameter(ValueFromPipelineByPropertyName=$true)]
    [ValidateScript({
        foreach ($k in $_.Keys) {
            if ($k -isnot [string]) {
                throw "All keys must be strings"
            }
        }
        foreach ($v in $_.Values) {
            if ($v -isnot [ScriptBlock] -and $v -isnot [string]) {
                throw "All values must be script blocks or strings"
            }
        }
        return $true
    })]
    [Alias('TestCases')]
    [Collections.IDictionary]
    $TestCase = [Ordered]@{},

    # A set of test groups.  Test groups will be automatically populated by the directory names in /testcases.
    [Parameter(ValueFromPipelineByPropertyName=$true)]
    [ValidateScript({
        foreach ($k in $_.Keys) {
            if ($k -isnot [string]) {
                throw "All keys must be strings"
            }
        }
        foreach ($v in $_.Values) {
            if ($v -isnot [string]) {
                throw "All values must be strings"
            }
        }
        return $true
    })]
    [Collections.IDictionary]
    [Alias('TestGroups')]
    $TestGroup = [Ordered]@{},


    # The name of one or more test groups.  This will run tests only from this group.
    # Built-in valid groups are:  All, MainTemplateTests, DeploymentTemplate, DeploymentParameters, CreateUIDefinition.    
    [string[]]
    $GroupName,

    # Any additional parameters to pass to each test.
    # This can be used to supply custom information to validate.
    # For example, passing -TestParameter @{testDate=[DateTime]::Now.AddYears(-1)} 
    # will pass a a custom value to any test with the parameter $TestDate.
    # If the parameter does not exist for a given test case, it will be ignored.
    [Collections.IDictionary]
    [Alias('TestParameters')]
    $TestParameter,    

    # If provided, will skip any tests in this list.
    [string[]]
    $Skip,

    # If provided, will skip tests on a file-by-file basis.
    # The key of this dictionary is a wildcard on a filename.
    # The value of this dictionary is a list of wildcards to exclude.
    [Collections.IDictionary]
    $SkipByFile,

    # If provided, will use this file as the "main" template.
    [string]
    $MainTemplateFile,

    # If set, will run tests in Pester.
    [switch]
    $Pester)

    begin {
        
        # First off, let's get all of the built-in test scripts.
        $testCaseSubdirectory = 'testcases'
        $myLocation =  $MyInvocation.MyCommand.ScriptBlock.File
        $myModule   = $myInvocation.MyCommand.ScriptBlock.Module
        $testScripts= @($myLocation| # To do that, we start from the current file,
            Split-Path | # get the current directory,
            Get-ChildItem -Filter $testCaseSubdirectory | # get the cases directory,
            Get-ChildItem -Filter *.test.ps1 -Recurse)  # and get all test.ps1 files within it.


        $builtInTestCases = @{}
        $script:PassFailTotalPerRun = @{Pass=0;Fail=0;Total=0}
        # Next we'll define some human-friendly built-in groups.
        $builtInGroups = @{
            'all' = 'deploymentTemplate', 'createUIDefinition', 'deploymentParameters'
            'mainTemplateTests' = 'deploymentTemplate', 'deploymentParameters'
        }


        # Now we loop over each potential test script
        foreach ($testScript  in $testScripts) {
            # The test file name (minus .test.ps1) becomes the name of the test.
            $TestName = $testScript.Name -ireplace '\.test\.ps1$', '' -replace '_', ' ' -replace '-', ' '
            $testDirName = $testScript.Directory.Name
            if ($testDirName -ne $testCaseSubdirectory) { # If the test case was in a subdirectory
                if (-not $builtInGroups.$testDirName) {
                    $builtInGroups.$testDirName = @()
                }
                # then the subdirectory name is the name of the test group.
                $builtInGroups.$testDirName += $TestName
            } else {
                # If there was no subdirectory, put the test in a special group called "ungrouped".
                if (-not $builtInGroups.Ungrouped) {
                    $builtInGroups.Ungrouped = @()
                }
                $builtInGroups.Ungrouped += $TestName
            }
            $builtInTestCases[$testName] = $testScript.Fullname
        }

        # This lets our built-in groups be automatically defined by their file structure.

        if (-not $script:AlreadyLoadedCache) { $script:AlreadyLoadedCache = @{} }
        # Next we want to load the cached items
        $cacheDir = $myLocation | Split-Path | Join-Path -ChildPath cache
        $cacheItemNames = @(foreach ($cacheFile in (Get-ChildItem -Path $cacheDir -Filter *.cache.json)) {
            $cacheName = $cacheFile.Name -replace '\.cache\.json', ''
            if (-not $script:AlreadyLoadedCache[$cacheFile.Name]) {
                $script:AlreadyLoadedCache[$cacheFile.Name] =
                    [IO.File]::ReadAllText($cacheFile.Fullname) | Microsoft.PowerShell.Utility\ConvertFrom-Json

            }
            $cacheData = $script:AlreadyLoadedCache[$cacheFile.Name]
            $ExecutionContext.SessionState.PSVariable.Set($cacheName, $cacheData)
            $cacheName
        })


        # Next we want to declare some internal functions:
        
        #*Test-Case (executes a test, given a set of parameters)
        function Test-Case($TheTest, $TestParameters = @{}) {
            $testCommandParameters =
                if ($TheTest -is [ScriptBlock]) {
                    $function:f = $TheTest
                    ([Management.Automation.CommandMetaData]$function:f).Parameters
                    Remove-Item function:f
                } elseif ($TheTest -is [string]) {
                    $testCmd = $ExecutionContext.SessionState.InvokeCommand.GetCommand($TheTest, 'ExternalScript')
                    if (-not $testCmd) { return }
                    ([Management.Automation.CommandMetaData]$testCmd).Parameters
                } else {
                    return
                }

            $parentTemplateText = $testInput.TemplateText
            $testInput = @{IsInnerTemplate=$false} + $TestParameters
            $IsInnerTemplate = $false

            foreach ($k in @($testInput.Keys)) {
                if (-not $testCommandParameters.ContainsKey($k)) {
                    $testInput.Remove($k)
                }
            }

            :IfNotMissingMandatory do {
                foreach ($tcp in $testCommandParameters.GetEnumerator()) {
                    foreach ($attr in $tcp.Value.Attributes) {
                        if ($attr.Mandatory -and -not $testInput[$tcp.Key]) {
                            Write-Warning "Skipped because $($tcp.Key) was missing"
                            break IfNotMissingMandatory
                        }
                    }
                }

                if (-not $Pester) {
                    . $myModule $TheTest @testInput 2>&1 3>&1
                } else {
                    . $myModule $TheTest @testInput
                }

                if ($TestParameters.InnerTemplates.Count) { # If an ARM template has inner templates                    
                    $isInnerTemplate = $testInput['IsInnerTemplate'] = $true
                    if (-not $testCommandParameters.ContainsKey('IsInnerTemplate')) {
                        $testInput.Remove('IsInnerTemplate')
                    }
                    $innerTemplateNumber = 0
                    foreach ($innerTemplate in $testParameters.InnerTemplates) {
                        
                        $usedParameters = $false
                        # Map TemplateText to the inner template text by converting to JSON (if the test command uses -TemplateText)
                        if ($testCommandParameters.ContainsKey("TemplateText")) { 
                            $templateText   = $testInput['TemplateText']   = $TestParameters.InnerTemplatesText[$innerTemplateNumber]
                            $usedParameters = $true
                        }
                        # And Map TemplateObject to the converted json (if the test command uses -TemplateObject)
                        if ($testCommandParameters.ContainsKey("TemplateObject")) { 
                            $templateObject = $testInput['TemplateObject'] = $innerTemplate.template                            
                            $usedParameters = $true
                        }

                        if ($usedParameters) {
                            if (-not $Pester) {
                                $itn = 
                                    if ($TestParameters.InnerTemplatesNames) {
                                        $TestParameters.InnerTemplatesNames[$innerTemplateNumber]
                                    } else { ''}
                                
                                $itl =
                                    if ($TestParameters.InnerTemplatesLocations){
                                        $testParameters.InnerTemplatesLocations[$innerTemplateNumber]
                                    } else { '' }
                                . $myModule $TheTest @testInput 2>&1 3>&1 | # Run the test, and add data about the inner template context it was in.
                                    Add-Member NoteProperty InnerTemplateName $itn -Force -PassThru |
                                    Add-Member NoteProperty InnerTemplateStart $itl.index -Force -PassThru |
                                    Add-Member NoteProperty InnerTemplateLocation $itl  -Force -PassThru |
                                    Add-Member NoteProperty InnerTemplateInput (@{} + $testInput) -Force -PassThru |
                                    Add-Member NoteProperty InnerTemplateText $templateText -Force -PassThru
                            } else {
                                . $myModule $TheTest @testInput
                            }           
                        }
                        $innerTemplateNumber++
                    }
                }
            } while ($false)
        }

        #*Test-Group (executes a group of tests)
        function Test-Group {            
            $testQueue = [Collections.Queue]::new(@($GroupName))
            :nextTestInGroup while ($testQueue.Count) {
                $dq = $testQueue.Dequeue()
                if ($TestGroup.$dq) {
                    foreach ($_ in $TestGroup.$dq) {
                        $testQueue.Enqueue($_)
                    }
                    continue
                }

                if ($ValidTestList -and $ValidTestList -notcontains $dq) {
                    continue
                }

                if ($SkipByFile) {
                    foreach ($sbp in $SkipByFile.GetEnumerator()) {
                        if ($fileInfo.Name -notlike $sbp.Key) { continue }
                        foreach ($v in $sbp.Value) {
                            if ($dq -like $v) { continue nextTestInGroup }
                        }
                    }                    
                }

                if (-not $Pester) {
                    $testStartedAt = [DateTime]::Now
                    $testCaseOutput = Test-Case $testCase.$dq $TestInput 2>&1 3>&1
                    $testTook = [DateTime]::Now - $testStartedAt

                                        
                    $InnerTemplateStartLine = 0
                    $InnerTemplateEndLine   = 0
                    
                    $outputByInnerTemplate = $testCaseOutput | 
                        Group-Object InnerTemplateName | 
                        Sort-Object { $($_.Group.InnerTemplateStart) }
                    if (-not $outputByInnerTemplate) {
                        # If there's no output, the test has passed.
                        $script:PassFailTotalPerRun.Total++ # update the totals
                        $script:PassFailTotalPerRun.Pass++
                        [PSCustomObject][Ordered]@{         # And output the object
                            pstypename = 'Template.Validation.Test.Result'
                            Errors = @()
                            Warnings = @()
                            Output = @()
                            AllOutput = $testCaseOutput
                            Passed = $true
                            Group = $dq                        
                            Name = $dq
                            Timespan = $testTook
                            File = $fileInfo
                            TestInput = @{} + $TestInput
                            Summary = if ($isLastFile -and -not $testQueue.Count) {
                                [PSCustomObject]$script:PassFailTotalPerRun    
                            }
                        }
                        continue nextTestInGroup
                    }
                    foreach ($testOutputGroup in $outputByInnerTemplate) {
                        $testErrors = [Collections.ArrayList]::new()
                        $testWarnings = [Collections.ArrayList]::new()
                        $testOutput = [Collections.ArrayList]::new()

                        $innerGroup = 
                            if ($testOutputGroup.Group.InnerTemplateStart) {
                                $innerTemplateStartIndex = ($($testOutputGroup.Group | Where-Object InnerTemplateStart | Select-Object -First 1).InnerTemplateStart) -as [int]
                                $innerTemplateLength     = ($($testOutputGroup.Group | Where-Object InnerTemplateEnd | Select-Object -First 1).InnerTemplateLength) -as [int]
                                    try {
                                        $InnerTemplateStartLine = 
                                                [Regex]::new('(?>\r\n|\n|\A)', 'RightToLeft').Matches(
                                                    $parentTemplateText, $innerTemplateStartIndex
                                                ).Count
                                        $InnerTemplateEndLine = 
                                                $InnerTemplateStartLine - 1 + [Regex]::new('(?>\r\n|\n|\A)', 'RightToLeft').Matches(
                                                    $testInput.TemplateText, $testInput.TemplateText.Length - 1
                                                ).Count
                                    } catch {
                                        $ex = $_
                                        Write-Error "Error Isolating Nested Template Lines in $templateFileName " -TargetObject $ex
                                    }
                                " NestedTemplate $($testOutputGroup.Name) [ Lines $InnerTemplateStartLine - $InnerTemplateEndLine ]"
                            } else {''}
                        $displayGroup = if ($innerGroup) { $innerGroup } else { $dq }
                        $null= foreach ($testOut in $testOutputGroup.Group) {
                            if ($testOut -is [Exception] -or $testOut -is [Management.Automation.ErrorRecord]) {
                                $testErrors.Add($testOut)
                                if ($testOut.TargetObject -is [Text.RegularExpressions.Match]) {
                                    $wholeText = $testOut.TargetObject.Result('$_')
                                    $lineNumber = 
                                        [Regex]::new('(?>\r\n|\n|\A)', 'RightToLeft').Matches(
                                            $wholeText, $testOut.TargetObject.Index
                                        ).Count + $(if ($InnerTemplateStartLine) { $InnerTemplateStartLine - 1 })

                                    $columnNumber = 
                                        $testOut.TargetObject.Index -
                                        $(
                                            $m = [Regex]::new('(?>\r\n|\n|\A)', 'RightToLeft').Match(
                                                $wholeText, $testOut.TargetObject.Index)
                                            $m.Index + $m.Length
                                        ) + 1
                                    $testOut | Add-Member NoteProperty Location ([PSCustomObject]@{Line=$lineNumber;Column=$columnNumber;Index=$testOut.TargetObject.Index;Length=$testOut.TargetObject.Length}) -Force
                                }
                                elseif ($testOut.TargetObject.PSTypeName -eq 'JSON.Content' -or $testOut.TargetObject.JSONPath) {
                                    $jsonPath = "$($testOut.TargetObject.JSONPath)".Trim()
                                    $location = 
                                        if ($GroupName -eq 'CreateUIDefinition') {                                                         
                                            Resolve-JSONContent -JSONPath $jsonPath -JSONText $createUIDefinitionText
                                        } elseif ($GroupName -eq 'DeploymentParameters') {
                                            Resolve-JSONContent -JSONPath $jsonPath -JSONText $parameterText
                                        } elseif ($testOut.InnerTemplateLocation) {                                            
                                            Resolve-JSONContent -JSONPath $jsonPath -JSONText $testOut.InnerTemplateText                                            
                                        } else {
                                            $resolvedLocation = Resolve-JSONContent -JSONPath $jsonPath -JSONText $TemplateText
                                            if (-not $resolvedLocation) {
                                                Write-Verbose "Unable to Resolve location in $($jsonPath) in $($fileInfo.Name)"
                                            } else {
                                                $resolvedLocation.Line += $(if ($InnerTemplateStartLine) { $InnerTemplateStartLine - 1 })
                                                $resolvedLocation
                                            }
                                        }

                                    if ($testOut.InnerTemplateLocation) {
                                        $location.Line += $testOut.InnerTemplateLocation.Line - 1
                                    }

                                    $testOut | Add-Member NoteProperty Location $location -Force
                                }
                            }
                            elseif ($testOut -is [Management.Automation.WarningRecord]) {
                                $testWarnings.Add($testOut)
                            } else {
                                $testOutput.Add($testOut)
                            }
                        }
                    
                        $script:PassFailTotalPerRun.Total++
                        if ($testErrors.Count -lt 1) {
                            $script:PassFailTotalPerRun.Pass++
                        } else {
                            $script:PassFailTotalPerRun.Fail++
                        }

                        [PSCustomObject][Ordered]@{
                            pstypename = 'Template.Validation.Test.Result'
                            Errors = $testErrors
                            Warnings = $testWarnings
                            Output = $testOutput
                            AllOutput = $testOutputGroup.Group
                            Passed = $testErrors.Count -lt 1
                            Group = $displayGroup
                        
                            Name = $dq
                            Timespan = $testTook
                            File = $fileInfo
                            TestInput = @{} + $TestInput
                            Summary = if ($isLastFile -and -not $testQueue.Count) {
                                [PSCustomObject]$script:PassFailTotalPerRun    
                            }
                        }
                    }
                    

                    
                } else {
                    it $dq {
                        # Pester tests only fail on a terminating error,
                        $errorMessages = Test-Case $testCase.$dq $TestInput 2>&1 |
                            Where-Object { $_ -is [Management.Automation.ErrorRecord] } |
                            # so collect all non-terminating errors.
                            Select-Object -ExpandProperty Exception |
                            Select-Object -ExpandProperty Message

                        if ($errorMessages) { # If any were found,
                            throw ($errorMessages -join ([Environment]::NewLine)) # throw.
                        }
                    }
                }
            }
        }

        #*Test-FileList (tests a list of files)
        function Test-FileList {
            $lastFile = $FolderFiles[-1]
            $isFirstFile = $true                        
            $mainInnerTemplates = $InnerTemplates
            $mainInnerTemplatesText = $InnerTemplatesText
            $MainInnerTemplatesNames = $InnerTemplatesNames
            $MainInnerTemplatesLocations = $innerTemplatesLocations
            foreach ($fileInfo in $FolderFiles) { # We loop over each file in the folder.
                $isLastFile = $fileInfo -eq $lastFile
                $matchingGroups =
                    @(if ($fileInfo.Schema) { # If a given file has a schema,
                        if ($isFirstFile) {   # see if it's the first file.
                            'AllFiles'        # If it is, add it to the group 'AllFiles'.
                            $isFirstFile = $false
                        }
                        
                        foreach ($key in $TestGroup.Keys) { # Then see if the schema matches the name of the testgroup
                            if ("$key".StartsWith("_") -or "$key".StartsWith('.')) { continue }
                            if ($fileInfo.Schema -match $key) {
                                $key # then run that group of tests.
                            }
                        }
                        
                    } else {
                        foreach ($key in $TestGroup.Keys) { # If it didn't have a schema
                            if ($key -eq 'AllFiles') {
                                $key; continue
                            }
                            if ($fileInfo.Extension -eq '.json') { # and it was a JSON file
                                $fn = $fileInfo.Name -ireplace '\.json$',''
                                if ($fn -match $key) { # check to see if it's name matches the key
                                    $key; continue # (this handles CreateUIDefinition.json, even if no schema is present).
                                }
                                if ($key -eq 'DeploymentParameters' -and # checking the deploymentParamters and file pattern
                                   $fn -like '*.parameters') { # and the file name is something we _know_ will be an ARM parameters template
                                   $key; continue # then run the deployment tests regardless of schema.
                                }
                                if ($key -eq 'DeploymentTemplate' -and # Otherwise, if we're checking the deploymentTemplate
                                    'maintemplate', 'azuredeploy', 'prereq.azuredeploy' -contains $fn) { # and the file name is something we _know_ will be an ARM template
                                    $key; continue # then run the deployment tests regardless of schema.
                                } elseif (
                                    $key -eq 'DeploymentTemplate' -and # Otherwise, if we're checking for the deploymentTemplate
                                    $fileInfo.Object.resources # and the file has a .resources property.                                    
                                ) {
                                    Write-Warning "File '$($fileInfo.Name)' has no schema, but has .resources.  Treating as a DeploymentTemplate."
                                    $key; continue # then run the deployment tests regardless of schema.
                                }                                
                            }
                            if (-not ("$key".StartsWith('_') -or "$key".StartsWith('.'))) { continue } # Last, check if the test group is for a file extension.
                            if ($fileInfo.Extension -eq "$key".Replace('_', '.')) { # If it was, run tests associated with that extension.
                                $key
                            }
                        }
                    })

                if ($TestGroup.Ungrouped) {
                    $matchingGroups += 'Ungrouped'
                }

                if (-not $matchingGroups) { continue }

                if ($fileInfo.Schema -like '*deploymentParameters*' -or $fileInfo.Name -like '*.parameters.json') { #  
                    $isMainTemplateParameter = 'maintemplate.parameters.json', 'azuredeploy.parameters.json', 'prereq.azuredeploy.parameters.json' -contains $fileInfo.Name
                    $parameterFileName = $fileInfo.Name
                    $parameterObject = $fileInfo.Object
                    $parameterText = $fileInfo.Text
                }
                if ($fileInfo.Schema -like '*deploymentTemplate*') {
                    $isMainTemplate = 
                        if ($MainTemplateFile) {
                            $(
                                $MainTemplateFile -eq $fileInfo.Name -or
                                $MainTemplateFile -eq $fileInfo.Fullname
                            )
                        } else {
                            'mainTemplate.json', 'azureDeploy.json', 'prereq.azuredeploy.json' -contains $fileInfo.Name
                        }
                        
                    $templateFileName = $fileInfo.Name                    
                    $TemplateObject = $fileInfo.Object
                    $TemplateText = $fileInfo.Text
                    if ($fileInfo.InnerTemplates) {
                        $InnerTemplates          = $fileInfo.InnerTemplates
                        $InnerTemplatesText      = $fileInfo.InnerTemplatesText
                        $InnerTemplatesNames     = $fileInfo.InnerTemplatesNames
                        $innerTemplatesLocations = $fileInfo.InnerTemplatesLocations
                    } else {
                        $InnerTemplates = $mainInnerTemplates
                        $InnerTemplatesText = $mainInnerTemplatesText
                        $InnerTemplatesNames = $MainInnerTemplatesNames
                        $innerTemplatesLocations = $MainInnerTemplatesLocations
                    }
                    if ($InnerTemplates.Count) {
                        $anyProblems = $false
                            foreach ($it in $innerTemplates) {
                                $foundInnerTemplate = $it | Resolve-JSONContent -JsonText $TemplateText
                                if (-not $foundInnerTemplate) { $anyProblems = $true; break }
                                $TemplateText = $TemplateText.Remove($foundInnerTemplate.Index, $foundInnerTemplate.Length)
                                $TemplateText = $TemplateText.Insert($foundInnerTemplate.Index, '"template": {}')
                            }

                            if (-not $anyProblems) {
                                $TemplateObject = $TemplateText | ConvertFrom-Json
                            } else {
                                Write-Error "Could not extract inner templates for '$TemplatePath'." -ErrorId InnerTemplate.Extraction.Error
                            }
                    }
                }
                foreach ($groupName in $matchingGroups) {
                    $testInput = @{}
                    foreach ($_ in $WellKnownVariables) {
                        $testInput[$_] = $ExecutionContext.SessionState.PSVariable.Get($_).Value
                    }
                    $ValidTestList = 
                        if ($test) {
                            $testList = @(Get-TestGroups ($test -replace '[_-]',' ') -includeTest)
                            if (-not $testList) {
                                Write-Warning "Test '$test' was not found, all tests will be run"
                            }
                            if ($skip) {
                                foreach ($tl in $testList) {
                                    if ($skip -replace '[_-]', ' ' -notcontains $tl) {
                                        $tl
                                    }
                                }
                            } 
                            else {
                                $testList
                            }
                        } elseif ($skip) {
                            $testList = @(Get-TestGroups -GroupName $groupName -includeTest)
                            foreach ($tl in $testList) {
                                if ($skip -replace '[_-]', ' ' -notcontains $tl) {
                                    $tl
                                }
                            }
                        } else {
                            $null
                        }

                    
                    if (-not $Pester) {
                        $context = "$($fileInfo.Name)->$groupName"
                        Test-Group
                    } else {
                        context "$($fileInfo.Name)->$groupName" ${function:Test-Group}
                    }
                }
            }

        }

        #*Get-TestGroups (expands nested test groups)
        function Get-TestGroups([string[]]$GroupName, [switch]$includeTest) {
            foreach ($gn in $GroupName) {
                if ($TestGroup[$gn]) {
                    Get-TestGroups $testGroup[$gn] -includeTest:$includeTest
                } elseif ($IncludeTest -and $TestCase[$gn]) {
                    $gn
                }
            }
        }

        $accumulatedTemplates = [Collections.Arraylist]::new()
    }

    process {
        # If no template was passed,
        if ($PSCmdlet.ParameterSetName -eq 'NearbyTemplate') {
            # attempt to find one in the current directory and it's subdirectories
            $possibleJsonFiles = @(Get-ChildItem -Filter *.json -Recurse |
                Sort-Object Name -Descending | # (sort by name descending so that MainTemplate.json comes first).
                Where-Object {
                    'azureDeploy.json', 'mainTemplate.json' -contains $_.Name
                })


            # If more than one template was found, warn which one we'll be testing.
            if ($possibleJsonFiles.Count -gt 1) {
                Write-Error "More than one potential template file found beneath '$pwd'.  Please have only azureDeploy.json or mainTemplate.json, not both."
                return
            }


            # If no potential files were found, write and error and return.
            if (-not $possibleJsonFiles) {
                Write-Error "No potential templates found beneath '$pwd'.  Templates should be named azureDeploy.json or mainTemplate.json."
                return
            }


            # If we could find a potential json file, recursively call yourself.
            $possibleJsonFiles |
                Select-Object -First 1 |
                Test-AzTemplate @PSBoundParameters

            return
        }

        # First, merge the built-in groups and test cases with any supplied by the user.
        foreach ($kv in $builtInGroups.GetEnumerator()) {
            if ($GroupName -and $GroupName -notcontains $kv.Key) { continue }
            if (-not $testGroup[$kv.Key]) {
                $TestGroup[$kv.Key] = $kv.Value
            }
        }
        foreach ($kv in $builtInTestCases.GetEnumerator()) {
            if (-not $testCase[$kv.Key]) {
                $TestCase[$kv.Key]= $kv.Value
            }
        }

        $null = $accumulatedTemplates.Add($TemplatePath)
    }

    end {
        $c, $t = 0, $accumulatedTemplates.Count
        $progId = Get-Random

        foreach ($TemplatePath in $accumulatedTemplates) {
            $C++
            $p = $c * 100 / $t
            $templateFileName = $TemplatePath | Split-Path -Leaf
            Write-Progress "Validating Templates" "$templateFileName" -PercentComplete $p -Id $progId
            $expandedTemplate =Expand-AzTemplate -TemplatePath $templatePath
            if (-not $expandedTemplate) { continue }
            foreach ($kv in $expandedTemplate.GetEnumerator()) {
                $ExecutionContext.SessionState.PSVariable.Set($kv.Key, $kv.Value)
            }
            
            $wellKnownVariables = @($expandedTemplate.Keys) + $cacheItemNames

            if ($testParameter) {
                $wellKnownVariables += foreach ($kv in $testParameter.GetEnumerator()) {
                    $ExecutionContext.SessionState.PSVariable.Set($kv.Key, $kv.Value)
                    $kv.Key
                }
            }

            # If a file list was provided,
            if ($PSBoundParameters.File) {
                $FolderFiles = @(foreach ($ff in $FolderFiles) { # filter the folder files.
                    $matched = @(foreach ($_ in $file) {
                        $ff.Name -like $_ # If file the name matched any of valid patterns.
                    })
                    if ($matched -eq $true)
                    {
                        $ff # then we include it.
                    }
                })
            }



            # Now that the filelist and test groups are set up, we use Test-FileList to test the list of files.
            if ($Pester) {
                $IsPesterLoaded? = $(
                    $loadedModules = Get-module
                    foreach ($_ in $loadedModules) {
                        if ($_.Name -eq 'Pester') {
                            $true
                            break
                        }
                    }
                )
                $DoesPesterExist? =
                    if ($IsPesterLoaded?) {
                        $true
                    } else {

                        if ($PSVersionTable.Platform -eq 'Unix') {
                            $delimiter = ':' # used for bash
                        } else {
                            $delimiter = ';' # used for windows
                        }

                        $env:PSModulePath -split $delimiter |
                        Get-ChildItem -Filter Pester |
                        Import-Module -Global -PassThru
                    }

                if (-not $DoesPesterExist?){
                    Write-Warning "Pester not found.  Please install Pester (Install-Module Pester)"
                    $Pester = $false
                }
            }

            if (-not $Pester) { # If we're not running Pester,
                Test-FileList # we just call it directly.
            }
            else {
                # If we're running Pester, we pass the function defintion as a parameter to describe.
                describe "Validating Azure Template $TemplateName" ${function:Test-FileList}
            }

        }

        Write-Progress "Validating Templates" "Complete" -Completed -Id $progId
    }
}

# SIG # Begin signature block
# MIIntwYJKoZIhvcNAQcCoIInqDCCJ6QCAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCDIVMiHCIPAB8Ra
# SEcR8hOPtYI57v6Q8NhVFXtoi0q03qCCDYEwggX/MIID56ADAgECAhMzAAACUosz
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
# RcBCyZt2WwqASGv9eZ/BvW1taslScxMNelDNMYIZjDCCGYgCAQEwgZUwfjELMAkG
# A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
# HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEoMCYGA1UEAxMfTWljcm9z
# b2Z0IENvZGUgU2lnbmluZyBQQ0EgMjAxMQITMwAAAlKLM6r4lfM52wAAAAACUjAN
# BglghkgBZQMEAgEFAKCBrjAZBgkqhkiG9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgor
# BgEEAYI3AgELMQ4wDAYKKwYBBAGCNwIBFTAvBgkqhkiG9w0BCQQxIgQgxauedkhE
# oftkFw7mfIHw10AfQv4Lw+K7CTdJ198x0lQwQgYKKwYBBAGCNwIBDDE0MDKgFIAS
# AE0AaQBjAHIAbwBzAG8AZgB0oRqAGGh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbTAN
# BgkqhkiG9w0BAQEFAASCAQCcxcZIPLcxziWUjG2Cn8f3cSR3/l+DIsPOMEJlD34G
# wD3Vy2Z8pDSCW+bN2GdKy1ksBLDPdJNq6kpf1jm5tUQwWh58kAa0YogkxQYT+R1J
# /Klceg0WZiLsbWpHCjPfHc18xtQz4W9UK1uX1j4bFn9iEm3okQK94pNAu0Ep8ZGk
# Ph1q4SmTcMRwd8t35CzayKes5p5vk+RlSqfflQyrV842UL9QfcWhLm6WeFEgU6lh
# a9uiVJcKSHAgbH6lLwVswsn2Mdx+MC14LDjFxAXrNt9JB6pzwcxwA2GSTO29ZZNl
# ZZENxkEwIKqGQdcvvM7kHOBCcR3AtwXzELWDUGqnL07NoYIXFjCCFxIGCisGAQQB
# gjcDAwExghcCMIIW/gYJKoZIhvcNAQcCoIIW7zCCFusCAQMxDzANBglghkgBZQME
# AgEFADCCAVkGCyqGSIb3DQEJEAEEoIIBSASCAUQwggFAAgEBBgorBgEEAYRZCgMB
# MDEwDQYJYIZIAWUDBAIBBQAEIONK2mIMlt5QmTagd8oHwnAcR7gx5wpx2hy9RUI2
# q8saAgZiu0ZJF+8YEzIwMjIwNzEzMjE1NjA5LjU5MlowBIACAfSggdikgdUwgdIx
# CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
# b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xLTArBgNVBAsTJE1p
# Y3Jvc29mdCBJcmVsYW5kIE9wZXJhdGlvbnMgTGltaXRlZDEmMCQGA1UECxMdVGhh
# bGVzIFRTUyBFU046QTI0MC00QjgyLTEzMEUxJTAjBgNVBAMTHE1pY3Jvc29mdCBU
# aW1lLVN0YW1wIFNlcnZpY2WgghFlMIIHFDCCBPygAwIBAgITMwAAAY16VS54dJkq
# twABAAABjTANBgkqhkiG9w0BAQsFADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMK
# V2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
# IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0Eg
# MjAxMDAeFw0yMTEwMjgxOTI3NDVaFw0yMzAxMjYxOTI3NDVaMIHSMQswCQYDVQQG
# EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwG
# A1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMS0wKwYDVQQLEyRNaWNyb3NvZnQg
# SXJlbGFuZCBPcGVyYXRpb25zIExpbWl0ZWQxJjAkBgNVBAsTHVRoYWxlcyBUU1Mg
# RVNOOkEyNDAtNEI4Mi0xMzBFMSUwIwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFt
# cCBTZXJ2aWNlMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA2jRILZg+
# O6U7dLcuwBPMB+0tJUz0wHLqJ5f7KJXQsTzWToADUMYV4xVZnp9mPTWojUJ/l3O4
# XqegLDNduFAObcitrLyY5HDsxAfUG1/2YilcSkSP6CcMqWfsSwULGX5zlsVKHJ7t
# vwg26y6eLklUdFMpiq294T4uJQdXd5O7mFy0vVkaGPGxNWLbZxKNzqKtFnWQ7jMt
# Z05XvafkIWZrNTFv8GGpAlHtRsZ1A8KDo6IDSGVNZZXbQs+fOwMOGp/Bzod8f1YI
# 8Gb2oN/mx2ccvdGr9la55QZeVsM7LfTaEPQxbgAcLgWDlIPcmTzcBksEzLOQsSpB
# zsqPaWI9ykVw5ofmrkFKMbpQT5EMki2suJoVM5xGgdZWnt/tz00xubPSKFi4B4IM
# FUB9mcANUq9cHaLsHbDJ+AUsVO0qnVjwzXPYJeR7C/B8X0Ul6UkIdplZmncQZSBK
# 3yZQy+oGsuJKXFAq3BlxT6kDuhYYvO7itLrPeY0knut1rKkxom+ui6vCdthCfnAi
# yknyRC2lknqzz8x1mDkQ5Q6Ox9p6/lduFupSJMtgsCPN9fIvrfppMDFIvRoULsHO
# dLJjrRli8co5M+vZmf20oTxYuXzM0tbRurEJycB5ZMbwznsFHymOkgyx8OeFnXV3
# car45uejI1B1iqUDbeSNxnvczuOhcpzwackCAwEAAaOCATYwggEyMB0GA1UdDgQW
# BBR4zJFuh59GwpTuSju4STcflihmkzAfBgNVHSMEGDAWgBSfpxVdAF5iXYP05dJl
# pxtTNRnpcjBfBgNVHR8EWDBWMFSgUqBQhk5odHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20vcGtpb3BzL2NybC9NaWNyb3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAx
# MCgxKS5jcmwwbAYIKwYBBQUHAQEEYDBeMFwGCCsGAQUFBzAChlBodHRwOi8vd3d3
# Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NlcnRzL01pY3Jvc29mdCUyMFRpbWUtU3Rh
# bXAlMjBQQ0ElMjAyMDEwKDEpLmNydDAMBgNVHRMBAf8EAjAAMBMGA1UdJQQMMAoG
# CCsGAQUFBwMIMA0GCSqGSIb3DQEBCwUAA4ICAQA1r3Oz0lEq3VvpdFlh3YBxc4hn
# YkALyYPDa9FO4XgqwkBm8Lsb+lK3tbGGgpi6QJbK3iM3BK0ObBcwRaJVCxGLGtr6
# Jz9hRumRyF8o4n2y3YiKv4olBxNjFShSGc9E29JmVjBmLgmfjRqPc/2rD25q4ow4
# uA3rc9ekiaufgGhcSAdek/l+kASbzohOt/5z2+IlgT4e3auSUzt2GAKfKZB02ZDG
# WKKeCY3pELj1tuh6yfrOJPPInO4ZZLW3vgKavtL8e6FJZyJoDFMewJ59oEL+AK3e
# 2M2I4IFE9n6LVS8bS9UbMUMvrAlXN5ZM2I8GdHB9TbfI17Wm/9Uf4qu588PJN7vC
# Jj9s+KxZqXc5sGScLgqiPqIbbNTE+/AEZ/eTixc9YLgTyMqakZI59wGqjrONQSY7
# u0VEDkEE6ikz+FSFRKKzpySb0WTgMvWxsLvbnN8ACmISPnBHYZoGssPAL7foGGKF
# LdABTQC2PX19WjrfyrshHdiqSlCspqIGBTxRaHtyPMro3B/26gPfCl3MC3rC3NGq
# 4xGnIHDZGSizUmGg8TkQAloVdU5dJ1v910gjxaxaUraGhP8IttE0RWnU5XRp/sGa
# NmDcMwbyHuSpaFsn3Q21OzitP4BnN5tprHangAC7joe4zmLnmRnAiUc9sRqQ2bms
# MAvUpsO8nlOFmiM1LzCCB3EwggVZoAMCAQICEzMAAAAVxedrngKbSZkAAAAAABUw
# DQYJKoZIhvcNAQELBQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
# dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9y
# YXRpb24xMjAwBgNVBAMTKU1pY3Jvc29mdCBSb290IENlcnRpZmljYXRlIEF1dGhv
# cml0eSAyMDEwMB4XDTIxMDkzMDE4MjIyNVoXDTMwMDkzMDE4MzIyNVowfDELMAkG
# A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
# HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9z
# b2Z0IFRpbWUtU3RhbXAgUENBIDIwMTAwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAw
# ggIKAoICAQDk4aZM57RyIQt5osvXJHm9DtWC0/3unAcH0qlsTnXIyjVX9gF/bErg
# 4r25PhdgM/9cT8dm95VTcVrifkpa/rg2Z4VGIwy1jRPPdzLAEBjoYH1qUoNEt6aO
# RmsHFPPFdvWGUNzBRMhxXFExN6AKOG6N7dcP2CZTfDlhAnrEqv1yaa8dq6z2Nr41
# JmTamDu6GnszrYBbfowQHJ1S/rboYiXcag/PXfT+jlPP1uyFVk3v3byNpOORj7I5
# LFGc6XBpDco2LXCOMcg1KL3jtIckw+DJj361VI/c+gVVmG1oO5pGve2krnopN6zL
# 64NF50ZuyjLVwIYwXE8s4mKyzbnijYjklqwBSru+cakXW2dg3viSkR4dPf0gz3N9
# QZpGdc3EXzTdEonW/aUgfX782Z5F37ZyL9t9X4C626p+Nuw2TPYrbqgSUei/BQOj
# 0XOmTTd0lBw0gg/wEPK3Rxjtp+iZfD9M269ewvPV2HM9Q07BMzlMjgK8QmguEOqE
# UUbi0b1qGFphAXPKZ6Je1yh2AuIzGHLXpyDwwvoSCtdjbwzJNmSLW6CmgyFdXzB0
# kZSU2LlQ+QuJYfM2BjUYhEfb3BvR/bLUHMVr9lxSUV0S2yW6r1AFemzFER1y7435
# UsSFF5PAPBXbGjfHCBUYP3irRbb1Hode2o+eFnJpxq57t7c+auIurQIDAQABo4IB
# 3TCCAdkwEgYJKwYBBAGCNxUBBAUCAwEAATAjBgkrBgEEAYI3FQIEFgQUKqdS/mTE
# mr6CkTxGNSnPEP8vBO4wHQYDVR0OBBYEFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMFwG
# A1UdIARVMFMwUQYMKwYBBAGCN0yDfQEBMEEwPwYIKwYBBQUHAgEWM2h0dHA6Ly93
# d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvRG9jcy9SZXBvc2l0b3J5Lmh0bTATBgNV
# HSUEDDAKBggrBgEFBQcDCDAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNV
# HQ8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBTV9lbLj+iiXGJo
# 0T2UkFvXzpoYxDBWBgNVHR8ETzBNMEugSaBHhkVodHRwOi8vY3JsLm1pY3Jvc29m
# dC5jb20vcGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5j
# cmwwWgYIKwYBBQUHAQEETjBMMEoGCCsGAQUFBzAChj5odHRwOi8vd3d3Lm1pY3Jv
# c29mdC5jb20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dF8yMDEwLTA2LTIzLmNydDAN
# BgkqhkiG9w0BAQsFAAOCAgEAnVV9/Cqt4SwfZwExJFvhnnJL/Klv6lwUtj5OR2R4
# sQaTlz0xM7U518JxNj/aZGx80HU5bbsPMeTCj/ts0aGUGCLu6WZnOlNN3Zi6th54
# 2DYunKmCVgADsAW+iehp4LoJ7nvfam++Kctu2D9IdQHZGN5tggz1bSNU5HhTdSRX
# ud2f8449xvNo32X2pFaq95W2KFUn0CS9QKC/GbYSEhFdPSfgQJY4rPf5KYnDvBew
# VIVCs/wMnosZiefwC2qBwoEZQhlSdYo2wh3DYXMuLGt7bj8sCXgU6ZGyqVvfSaN0
# DLzskYDSPeZKPmY7T7uG+jIa2Zb0j/aRAfbOxnT99kxybxCrdTDFNLB62FD+Cljd
# QDzHVG2dY3RILLFORy3BFARxv2T5JL5zbcqOCb2zAVdJVGTZc9d/HltEAY5aGZFr
# DZ+kKNxnGSgkujhLmm77IVRrakURR6nxt67I6IleT53S0Ex2tVdUCbFpAUR+fKFh
# bHP+CrvsQWY9af3LwUFJfn6Tvsv4O+S3Fb+0zj6lMVGEvL8CwYKiexcdFYmNcP7n
# tdAoGokLjzbaukz5m/8K6TT4JDVnK+ANuOaMmdbhIurwJ0I9JZTmdHRbatGePu1+
# oDEzfbzL6Xu/OHBE0ZDxyKs6ijoIYn/ZcGNTTY3ugm2lBRDBcQZqELQdVTNYs6Fw
# ZvKhggLUMIICPQIBATCCAQChgdikgdUwgdIxCzAJBgNVBAYTAlVTMRMwEQYDVQQI
# EwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
# ZnQgQ29ycG9yYXRpb24xLTArBgNVBAsTJE1pY3Jvc29mdCBJcmVsYW5kIE9wZXJh
# dGlvbnMgTGltaXRlZDEmMCQGA1UECxMdVGhhbGVzIFRTUyBFU046QTI0MC00Qjgy
# LTEzMEUxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2WiIwoB
# ATAHBgUrDgMCGgMVAIBzlZM9TRND4PgtpLWQZkSPYVcJoIGDMIGApH4wfDELMAkG
# A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
# HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9z
# b2Z0IFRpbWUtU3RhbXAgUENBIDIwMTAwDQYJKoZIhvcNAQEFBQACBQDmeYrZMCIY
# DzIwMjIwNzE0MDIxODAxWhgPMjAyMjA3MTUwMjE4MDFaMHQwOgYKKwYBBAGEWQoE
# ATEsMCowCgIFAOZ5itkCAQAwBwIBAAICNwYwBwIBAAICeoAwCgIFAOZ63FkCAQAw
# NgYKKwYBBAGEWQoEAjEoMCYwDAYKKwYBBAGEWQoDAqAKMAgCAQACAwehIKEKMAgC
# AQACAwGGoDANBgkqhkiG9w0BAQUFAAOBgQBycc/R3FWJAgS8z0aHDwMDY2IjIpQ1
# Gt4mzpGsc2WDSeTIhD5EJ/LzxTVMwLRaaUzXsGTsAFYDBm7Vyu2xPsQnrtUaGzPE
# w0KjFYk2/yFkOaiAG2Z5tN0JZMcSnFOkPHIPwC7HdvAb9QO07OFUhnqqHw3bibQZ
# wbeATNfK8Ol7mzGCBA0wggQJAgEBMIGTMHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQI
# EwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
# ZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBD
# QSAyMDEwAhMzAAABjXpVLnh0mSq3AAEAAAGNMA0GCWCGSAFlAwQCAQUAoIIBSjAa
# BgkqhkiG9w0BCQMxDQYLKoZIhvcNAQkQAQQwLwYJKoZIhvcNAQkEMSIEIMzliEvU
# KwTmLbmcOtTnDce9B3IgAPX/sp22Vjf+996HMIH6BgsqhkiG9w0BCRACLzGB6jCB
# 5zCB5DCBvQQgnpYRM/odXkDAnzf2udL569W8cfGTgwVuenQ8ttIYzX8wgZgwgYCk
# fjB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
# UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQD
# Ex1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAY16VS54dJkqtwAB
# AAABjTAiBCBzAscPmNm+X1wQdeXHNq3AljcSlE6FSANmlZyUC+lywzANBgkqhkiG
# 9w0BAQsFAASCAgAUJSz9Np9z/F3o8jrKbUFIwcLrWyMNC8NEuDpRSgVyDm0gyeOc
# Siff+wd9yTw3gGa48mDAXZT4CQZUW0qnrKBaC2XJinhlAHPEx2Ngvq8cLP0g9ncC
# kJHulkPpyR1wYu4yoExhXYmdzY9wmvPTqpJFL1kiNwWHPdeeGbG2pOwjJfhvGp33
# +WsH819FmslxgX6jxh/akOj9CYcRf6p5jeRLaavJZ+WJNKcYIp+mU/UP0Q/UYTuz
# Ixd/zfptLGell0iZAgId7/zfpxMZd6gI1/0N0WMqGLlXu+SgJ6QnZzBC91sbZNGv
# GwE+BlEsoUFKIiWAabQBeSuPyhnYO//8R1pz2UKoX3LU/8A4goTHTQ+TLyfPmhpm
# tCSxAiFJcN757jtLmm4N/GSMIDMAuCjCfIJ3IsuMsa0gO67GpAujAO/cngaAdKQW
# 1wYfYSEm1oV6wkot+ta1sj2l4IGhFLwmcE3TClyZBFfX9bRWT7LmbijAKHM+b8Mp
# yW7kJTh0G7wTabBQ7mCwxczIKNlJmqmoYZONC5tkHOGyjcBOJlu24eRvIqzl29/9
# 6lpp4+T7/lUk/SEreJGzXp4I+3pgKhsO1G28WKDQoEJ7E8ur/U9GncTVu/cLMamJ
# AiL31BzYCFanomNUvPPL6aoXNmWVqFvUCRZrOqjPgIFQ4UNxNbdLJdqJCA==
# SIG # End signature block
