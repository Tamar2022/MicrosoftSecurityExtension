import { json } from 'stream/consumers';
import * as vscode from 'vscode';
import fs = require('fs');
import { TextDocument, workspace } from 'vscode';
import { Level } from './level';
import { strict } from 'assert';
import { locationDownloadFile } from './TemplateAnalyzer';
import { getAllFilesSync } from 'get-all-files';
import { appendLineToOutputChannel, createOutputChannel } from '../Generic';
import path = require('path');
import { TreeItem } from '../../../tree item classes/tree-item';
import { Gate } from '../gate';
import { GatesProvider } from '../../../gate-provider';
import { ExeClass } from '../../../extension';
const { exec } = require('child_process');
//const exe = getExePath();
let rootPath = workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
let rootPath2 = 'C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension';

export class TemplateAnalyzerGate extends Gate {

    public myProvider: GatesProvider | undefined;

    constructor(public isActive: boolean=false) {
       // const context = isActive ? 'anyGate' : 'gate';
        super("TemplateAnalyzer", vscode.TreeItemCollapsibleState.Collapsed, "templateGate", isActive);
        this.listenerSaveEvent();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
        this.myProvider = <GatesProvider>element;
        return Promise.resolve(this.getSarifFile(this.label));
    }

    public async relativePath() {
        let _files = [];
        let myPath = workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
        myPath === undefined ? myPath = [] : null;
        for (let path of myPath) {
            for (let filename of getAllFilesSync(path)) {
                _files.push(filename);
            }
        }
        return _files;
    }

    async getSarifFile(label: string): Promise<TreeItem[]> {
        const path1 = await this.templateAnalyzer();
        if (this.getIsActive() === true) {
            const data = JSON.parse(await fs.readFileSync(path1, 'utf-8'));
            // level , filePath , locations
            const dataResult = data.runs[0]?.results;
            // massege , helpURI
            const dataMassegeAndHelp = data.runs[0]?.tool?.driver?.rules;
            let errorDataResult = dataResult?.filter((e: any) => { return e.level === 'error'; });
            let warningDataResult = dataResult?.filter((e: any) => { return e.level === 'warning'; });
            let noteDataResult = dataResult?.filter((e: any) => { return e.level === 'note'; });
            let unLevelDataResult = dataResult?.filter((e: any) => { return e.level === 'undefined'; });   
            let p= "C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\ArmTemplateFiles\\VaAssessorGo.Template.json";
           //שמתי פה נתיב אבסולוטי כי מצאנו רק בעיות בקובץ אחד , וכמובן שצריך לשנות לנתיב יחסי
            let errorData: any[] = errorDataResult?.map((e: any) => { return { 'filePath':p, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let warningData: any[] = warningDataResult?.map((e: any) => { return { 'filePath': rootPath![0] +`\\`+ e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let noteData: any[] = noteDataResult?.map((e: any) => { return { 'filePath': rootPath![0] +`\\`+ e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let unLevelData: any[] = unLevelDataResult?.map((e: any) => { return { 'filePath': rootPath![0] +`\\`+ e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            return Promise.resolve([new Level("Error", vscode.TreeItemCollapsibleState.Collapsed, errorData),
            new Level("Warning", vscode.TreeItemCollapsibleState.Collapsed, warningData),
            new Level("Note", vscode.TreeItemCollapsibleState.Collapsed, noteData),
            new Level("Un Level", vscode.TreeItemCollapsibleState.Collapsed, unLevelData)
            ]);
        }
        else {
            return Promise.resolve([]);
        }
    }
    /*Other options:
   יש אופציה להציג שגיאת תוכן תבנית ואת מיקום השגיאה 
   שגיאה:  const masseg = data.runs[0].invocations[0].toolExecutionNotifications[0].message.text;
   מיקום: "message": "The template resource '<name-of-the-resource>' at line '9' and column '9' is not valid: Evaluation result of language expression '<true-to-deploy-this-resource>' is type 'String', expected type is 'Boolean'
   Scenario-  וכן יש עוד אפשרות להציג עוד סוגי שגיאות שאינן קשורות לתוכן הקובץ, 
   יש עוד מידע שאפשר להציג למשתמש 
   helpURI = dataMassegeAndHelp[0]?.rules[0].helpUri;//to output 
   */

    async templateAnalyzer() {
      // const sarifFilePath = `C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13\\microsoft-security-gate\\src\\Template-analyzer\\Try.sarif`;
       
       //console.log(sarifFilePath)
       //const sarifFile = `--report-format "sarif" -o ${sarifFilePath}`;
        //const fileName = `TemplateAnalyzer.zip`;
      //  var downloadFile = `C:\\Users\\USER\\Documents\\${locationDownloadFile}`;//root diractory ./
        //var command1 = `powershell -c "Invoke-WebRequest -Uri 'https://github.com/Azure/template-analyzer/releases/download/v0.2.0/TemplateAnalyzer-win-x64.zip'  -OutFile '${locationDownloadFile}'"`;
        // const pathes = await this.relativePath();
        var command3 = `C:\\Users\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\TemplateAnalyzer-win-x64\\TemplateAnalyzer.exe analyze-directory "C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\ArmTemplateFiles"`;
        var command4 = `C:\\Users\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\TemplateAnalyzer-win-x64\\TemplateAnalyzer.exe analyze-directory ${rootPath![0]} --report-format "sarif" -o"C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\result.sarif"`;
       console.log(command4);
        let _exePath = ExeClass.exe;
       let _sarifPath = ExeClass.sarif;
       const sarifFilePath = "C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\result.sarif";//_sarifPath; //'C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13\\microsoft-security-gate\\src\\Template-analyzer\\result.sarif'; //
     //  console.log(_exePath);
     var command2 = `${_exePath}\\TemplateAnalyzer.exe analyze-directory ${rootPath![0]} --report-format "sarif" -o  ${sarifFilePath}`;//${_sarifPath}
      // console.log(command2);
        exec(command3, async function (error: { stack: any; code: string; signal: string; }, stdout: string, stderr: string) {
            if (error) {
                console.log(error.stack);
                console.log('Error code: ' + error.code);
                console.log('Signal received: ' + error.signal);
            }
            console.log('Child Process STDOUT: ' + stdout);
            const outputChannel = createOutputChannel('TemplateAnalyzer');
            appendLineToOutputChannel(outputChannel,stdout);
        });
        return sarifFilePath;
    }

    public async refresh() {
        this.myProvider?.refresh(this);
    }

    public async activate() {
        super.activate();
        this.myProvider?.refresh();
    }

    public async deactivate() {
        super.deactivate();
        this.myProvider?.refresh();
    }

    public listenerSaveEvent() {
        workspace.onDidSaveTextDocument((document: TextDocument) => {
        });
    }
}


