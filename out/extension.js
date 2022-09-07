"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.MyPath = exports.ExeClass = void 0;
const vscode = require("vscode");
const gate_provider_1 = require("./gate-provider");
const ShowFileYaml_1 = require("./ShowFileYaml");
const gate_functions_1 = require("./customGate/gate-functions");
const highLight_1 = require("./highLight");
const kubesec_1 = require("./gates/kubesec/kubesecGate/kubesec");
class ExeClass {
}
exports.ExeClass = ExeClass;
class MyPath {
}
exports.MyPath = MyPath;
async function activate(context) {
    const exePath = context.asAbsolutePath("TemplateAnalyzer-win-x64");
    const sarifPath = context.asAbsolutePath("result.sarif");
    ExeClass.exe = exePath;
    ExeClass.sarif = sarifPath;
    const whispersConfigPath = context.asAbsolutePath("src");
    MyPath.configPath = whispersConfigPath;
    var myGates = new gate_provider_1.GatesProvider();
    let activeTextDocument;
    vscode.window.registerTreeDataProvider('package-gates', myGates);
    vscode.commands.registerCommand('gates.refreshEntry', () => myGates.refresh());
    vscode.commands.registerCommand('gates.activate', () => {
        myGates.activeAllGates();
    });
    vscode.commands.registerCommand('customGate.showData', async (arg, item) => {
        const filePath = arg;
        const textDocument = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(textDocument);
        activeTextDocument = await (0, gate_functions_1.readFileByLines)(textDocument.fileName);
        await (0, ShowFileYaml_1.showTextDocumentWithErrors)(item, activeTextDocument);
    });
    vscode.commands.registerCommand('customGate.activate', async (arg) => {
        arg.activate();
        arg.contextValue = "anyGate";
        vscode.commands.executeCommand('setContext', 'anyGateActive', true);
        myGates.refresh();
        vscode.window.showInformationMessage(arg.label + '.activate');
    });
    vscode.commands.registerCommand('customGate.deactivate', async (arg) => {
        arg.deactivate();
        arg.contextValue = "gate";
        vscode.commands.executeCommand('setContext', 'gateActive', false);
        myGates.refresh();
        vscode.window.showInformationMessage(arg.label + '.deactivate');
    });
    vscode.commands.registerCommand('customGate.showFileData', async (args, arg) => {
        if (typeof (arg.location) === typeof (" ")) {
            vscode.env.openExternal(vscode.Uri.parse(arg.location.toString()));
        }
        else {
            const textDocument = await vscode.workspace.openTextDocument(args);
            await vscode.window.showTextDocument(textDocument);
            (0, ShowFileYaml_1.jumpSpecifiedLine)(arg.location.lineNumber, args);
        }
    });
    vscode.commands.registerCommand('showTextDocument', async (arg, lineNumber) => {
        const filePath = arg.toString();
        let textDocument = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(textDocument);
    });
    vscode.commands.registerCommand('openInLine', async (arg, item, message) => {
        const filePath = item.toString();
        let textDocument = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(textDocument);
        (0, highLight_1.highLightTextInFile)(arg.startLine - 1, 0);
        (0, ShowFileYaml_1.jumpSpecifiedLine)(arg.startLine - 1, filePath);
    });
    vscode.commands.registerCommand('templateGate.deactivate', async (arg) => {
        arg.deactivate();
        //arg.contextValue = "gate";
        vscode.commands.executeCommand('setContext', 'templateGateActive', false);
        myGates.refresh();
    });
    vscode.commands.registerCommand('templateGate.activate', async (arg) => {
        arg.activate();
        //arg.contextValue = "anyGate";
        vscode.commands.executeCommand('setContext', 'templateGateActive', true);
        myGates.refresh();
    });
    vscode.commands.registerCommand('gate.activate', async (arg) => {
        arg.activate();
    });
    vscode.commands.registerCommand('gate.deactivate', async (arg) => {
        arg.deactivate();
    });
    vscode.commands.registerCommand('kubesec.showTextDocument', async (arg) => {
        const textDocument = await vscode.workspace.openTextDocument(arg.path);
        await vscode.window.showTextDocument(textDocument);
        await (0, kubesec_1.showTextDocumentWithErrorsKubesec)(arg.scoringRes, textDocument);
    });
    vscode.commands.registerCommand('kubesec.showScoring', async (arg) => {
        const textDocument = await vscode.workspace.openTextDocument(arg.filePath);
        await vscode.window.showTextDocument(textDocument);
        await (0, kubesec_1.showTextDocumentWithErrorsKubesec)([arg], textDocument);
    });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map