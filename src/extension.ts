import * as vscode from 'vscode';
import { GatesProvider } from './gate-provider';
import { hierarchySearchInFile } from './search';
import { jumpSpecifiedLine, showTextDocumentWithErrors } from './ShowFileYaml';
import { MessageItem } from './tree item classes/message';
import { GateFunctions, readFileByLines } from './customGate/gate-functions';
import { highLightTextInFile } from './highLight';
import { Location } from './customGate/gate-data';
import { File } from './gates/kubesec/treeItemClasses/file';
import { ScoringItem } from './gates/kubesec/treeItemClasses/scoring';
import { showTextDocumentWithErrorsKubesec } from './gates/kubesec/kubesecGate/kubesec';

export class ExeClass {
	public static exe: string;
	public static sarif: string;
}
export class MyPath {
	public static configPath: string;
}

export async function activate(context: vscode.ExtensionContext) {

  const exePath = context.asAbsolutePath("TemplateAnalyzer-win-x64");
	const sarifPath = context.asAbsolutePath("result.sarif");
	ExeClass.exe = exePath;
	ExeClass.sarif = sarifPath;

  const whispersConfigPath=context.asAbsolutePath("src");
  MyPath.configPath=whispersConfigPath;

  var myGates = new GatesProvider();
  let activeTextDocument: string[] | undefined;

  vscode.window.registerTreeDataProvider(
    'package-gates',
    myGates
  );


  vscode.commands.registerCommand('gates.refreshEntry', () =>
    myGates.refresh()

  );

  vscode.commands.registerCommand('gates.activate', () => {
    myGates.activeAllGates();
  });


  vscode.commands.registerCommand('customGate.showData', async (arg, item) => {
    const filePath = arg;
    const textDocument = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(textDocument);
    activeTextDocument = await readFileByLines(textDocument.fileName);
    await showTextDocumentWithErrors(item, activeTextDocument!);
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

  vscode.commands.registerCommand('customGate.showFileData', async (args, arg: MessageItem) => {
    if (typeof (arg.location) === typeof (" ")) {
      vscode.env.openExternal(vscode.Uri.parse(arg.location.toString()));
    }
    else {
      const textDocument = await vscode.workspace.openTextDocument(args);
      await vscode.window.showTextDocument(textDocument);
      jumpSpecifiedLine((arg.location as Location).lineNumber, args);
    }
  });

  vscode.commands.registerCommand('showTextDocument', async (arg: any, lineNumber: any) => {
		const filePath = arg.toString();
		let textDocument = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(textDocument);
	});

	
	vscode.commands.registerCommand('openInLine', async (arg: any, item,message) => {
		const filePath = item.toString();
		let textDocument = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(textDocument);
    highLightTextInFile(arg.startLine-1,0);
		jumpSpecifiedLine(arg.startLine-1, filePath);
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

  vscode.commands.registerCommand('kubesec.showTextDocument', async (arg:File) => {
		const textDocument = await vscode.workspace.openTextDocument(arg.path);
		await vscode.window.showTextDocument(textDocument);
		await showTextDocumentWithErrorsKubesec(arg.scoringRes, textDocument!);
	});
	
	vscode.commands.registerCommand('kubesec.showScoring', async (arg:ScoringItem) => {
		const textDocument = await vscode.workspace.openTextDocument(arg.filePath);
		await vscode.window.showTextDocument(textDocument);
		await showTextDocumentWithErrorsKubesec([arg],textDocument);

	});
}



export function deactivate() { }






