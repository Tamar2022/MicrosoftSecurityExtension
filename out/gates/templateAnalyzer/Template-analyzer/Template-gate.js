"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateAnalyzerGate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const vscode_1 = require("vscode");
const level_1 = require("./level");
const get_all_files_1 = require("get-all-files");
const Generic_1 = require("../Generic");
const gate_1 = require("../gate");
const extension_1 = require("../../../extension");
const { exec } = require('child_process');
//const exe = getExePath();
let rootPath = vscode_1.workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
let rootPath2 = 'C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension';
class TemplateAnalyzerGate extends gate_1.Gate {
    constructor(isActive = false) {
        // const context = isActive ? 'anyGate' : 'gate';
        super("TemplateAnalyzer", vscode.TreeItemCollapsibleState.Collapsed, "templateGate", isActive);
        this.isActive = isActive;
        this.listenerSaveEvent();
    }
    getTreeItem(element) {
        return element;
    }
    getMoreChildren(element) {
        this.myProvider = element;
        return Promise.resolve(this.getSarifFile(this.label));
    }
    async relativePath() {
        let _files = [];
        let myPath = vscode_1.workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
        myPath === undefined ? myPath = [] : null;
        for (let path of myPath) {
            for (let filename of (0, get_all_files_1.getAllFilesSync)(path)) {
                _files.push(filename);
            }
        }
        return _files;
    }
    async getSarifFile(label) {
        const path1 = await this.templateAnalyzer();
        if (this.getIsActive() === true) {
            const data = JSON.parse(await fs.readFileSync(path1, 'utf-8'));
            // level , filePath , locations
            const dataResult = data.runs[0]?.results;
            // massege , helpURI
            const dataMassegeAndHelp = data.runs[0]?.tool?.driver?.rules;
            let errorDataResult = dataResult?.filter((e) => { return e.level === 'error'; });
            let warningDataResult = dataResult?.filter((e) => { return e.level === 'warning'; });
            let noteDataResult = dataResult?.filter((e) => { return e.level === 'note'; });
            let unLevelDataResult = dataResult?.filter((e) => { return e.level === 'undefined'; });
            let p = "C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\ArmTemplateFiles\\VaAssessorGo.Template.json";
            //שמתי פה נתיב אבסולוטי כי מצאנו רק בעיות בקובץ אחד , וכמובן שצריך לשנות לנתיב יחסי
            let errorData = errorDataResult?.map((e) => { return { 'filePath': p, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let warningData = warningDataResult?.map((e) => { return { 'filePath': rootPath[0] + `\\` + e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let noteData = noteDataResult?.map((e) => { return { 'filePath': rootPath[0] + `\\` + e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            let unLevelData = unLevelDataResult?.map((e) => { return { 'filePath': rootPath[0] + `\\` + e.locations[0]?.physicalLocation?.artifactLocation?.uri, 'message': dataMassegeAndHelp[e.ruleIndex]?.fullDescription?.text, 'locations': e.locations[0]?.physicalLocation?.region }; });
            return Promise.resolve([new level_1.Level("Error", vscode.TreeItemCollapsibleState.Collapsed, errorData),
                new level_1.Level("Warning", vscode.TreeItemCollapsibleState.Collapsed, warningData),
                new level_1.Level("Note", vscode.TreeItemCollapsibleState.Collapsed, noteData),
                new level_1.Level("Un Level", vscode.TreeItemCollapsibleState.Collapsed, unLevelData)
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
        var command4 = `C:\\Users\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\TemplateAnalyzer-win-x64\\TemplateAnalyzer.exe analyze-directory ${rootPath[0]} --report-format "sarif" -o"C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\result.sarif"`;
        console.log(command4);
        let _exePath = extension_1.ExeClass.exe;
        let _sarifPath = extension_1.ExeClass.sarif;
        const sarifFilePath = "C:\\Users\\user1\\finalExtension\\MicrosoftSecurityExtension\\src\\gates\\templateAnalyzer\\Template-analyzer\\result.sarif"; //_sarifPath; //'C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13\\microsoft-security-gate\\src\\Template-analyzer\\result.sarif'; //
        //  console.log(_exePath);
        var command2 = `${_exePath}\\TemplateAnalyzer.exe analyze-directory ${rootPath[0]} --report-format "sarif" -o  ${sarifFilePath}`; //${_sarifPath}
        // console.log(command2);
        exec(command3, async function (error, stdout, stderr) {
            if (error) {
                console.log(error.stack);
                console.log('Error code: ' + error.code);
                console.log('Signal received: ' + error.signal);
            }
            console.log('Child Process STDOUT: ' + stdout);
            const outputChannel = (0, Generic_1.createOutputChannel)('TemplateAnalyzer');
            (0, Generic_1.appendLineToOutputChannel)(outputChannel, stdout);
        });
        return sarifFilePath;
    }
    async refresh() {
        this.myProvider?.refresh(this);
    }
    async activate() {
        super.activate();
        this.myProvider?.refresh();
    }
    async deactivate() {
        super.deactivate();
        this.myProvider?.refresh();
    }
    listenerSaveEvent() {
        vscode_1.workspace.onDidSaveTextDocument((document) => {
        });
    }
}
exports.TemplateAnalyzerGate = TemplateAnalyzerGate;
//# sourceMappingURL=Template-gate.js.map