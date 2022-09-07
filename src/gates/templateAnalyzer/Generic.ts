import * as vscode from 'vscode';
import { OutputChannel, Position, Selection, Uri, window, workspace } from "vscode";

export function createOutputChannel(outputChannelName: string) {
    let outputChannel = window.createOutputChannel(outputChannelName);
    return outputChannel;
}

export function appendLineToOutputChannel(outputChannel: OutputChannel, message: string) {
    outputChannel.appendLine(message);
}

export function highLightTextInFile(lineNumber: number, columnNumber: number) {
    let sentenceDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline red',
      overviewRulerColor: 'red',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      light: {
        // this color will be used in light color themes
        textDecoration: 'underline red'
      },
      dark: {
        // this color will be used in dark color themes
        textDecoration: 'underline red'
      }
    });
    const text = vscode.window.activeTextEditor?.document.getText();
    let lineToHighLight: vscode.DecorationOptions[] = [];
    if (text) {
      const line = vscode.window.activeTextEditor?.document.lineAt(lineNumber);
      if (line) {
        const decoration = { range: new vscode.Range(new vscode.Position(line.lineNumber, columnNumber), line.range.end) };
        lineToHighLight.push(decoration);
      }
      vscode.window.activeTextEditor?.setDecorations(sentenceDecorationType, lineToHighLight);
    }
}
// export function highLightTextInFile(lineNumber: number, numOfTabs: number) {
//     let sentenceDecorationType = vscode.window.createTextEditorDecorationType({
//         textDecoration: 'underline red',
//         overviewRulerColor: 'red',
//         overviewRulerLane: vscode.OverviewRulerLane.Right,
//         light: {
//             // this color will be used in light color themes
//             textDecoration: 'underline red'
//         },
//         dark: {
//             // this color will be used in dark color themes
//             textDecoration: 'underline red'
//         }
//     });
//     const text = vscode.window.activeTextEditor?.document.getText();
//     let lineToHighLight: vscode.DecorationOptions[] = [];
//     if (text) {
//         const line = vscode.window.activeTextEditor?.document.lineAt(lineNumber);
//         if (line) {
//             const numOfCharacters = numOfTabs * 2;
//             const decoration = { range: new vscode.Range(new vscode.Position(line.lineNumber, numOfCharacters), line.range.end) };
//             lineToHighLight.push(decoration);
//         }
//         vscode.window.activeTextEditor?.setDecorations(sentenceDecorationType, lineToHighLight);
//     }
// } 

export async function jumpSpecifiedLine(lineNumber: number, filePath: string) {
    var pos1 = new Position(lineNumber-1, 0);
    var openPath = Uri.file(filePath);
    workspace.openTextDocument(openPath).then((doc: any) => {
        window.showTextDocument(doc).then((editor: any) => {
            // Line added - by having a selection at the same position twice, the cursor jumps there
            editor.selections = [new Selection(pos1, pos1)];
            // And the visible range jumps there too
            var range = new vscode.Range(pos1, pos1);
            editor.revealRange(range);
        });
    });
}