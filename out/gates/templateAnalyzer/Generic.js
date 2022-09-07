"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jumpSpecifiedLine = exports.highLightTextInFile = exports.appendLineToOutputChannel = exports.createOutputChannel = void 0;
const vscode = require("vscode");
const vscode_1 = require("vscode");
function createOutputChannel(outputChannelName) {
    let outputChannel = vscode_1.window.createOutputChannel(outputChannelName);
    return outputChannel;
}
exports.createOutputChannel = createOutputChannel;
function appendLineToOutputChannel(outputChannel, message) {
    outputChannel.appendLine(message);
}
exports.appendLineToOutputChannel = appendLineToOutputChannel;
function highLightTextInFile(lineNumber, columnNumber) {
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
    let lineToHighLight = [];
    if (text) {
        const line = vscode.window.activeTextEditor?.document.lineAt(lineNumber);
        if (line) {
            const decoration = { range: new vscode.Range(new vscode.Position(line.lineNumber, columnNumber), line.range.end) };
            lineToHighLight.push(decoration);
        }
        vscode.window.activeTextEditor?.setDecorations(sentenceDecorationType, lineToHighLight);
    }
}
exports.highLightTextInFile = highLightTextInFile;
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
async function jumpSpecifiedLine(lineNumber, filePath) {
    var pos1 = new vscode_1.Position(lineNumber - 1, 0);
    var openPath = vscode_1.Uri.file(filePath);
    vscode_1.workspace.openTextDocument(openPath).then((doc) => {
        vscode_1.window.showTextDocument(doc).then((editor) => {
            // Line added - by having a selection at the same position twice, the cursor jumps there
            editor.selections = [new vscode_1.Selection(pos1, pos1)];
            // And the visible range jumps there too
            var range = new vscode.Range(pos1, pos1);
            editor.revealRange(range);
        });
    });
}
exports.jumpSpecifiedLine = jumpSpecifiedLine;
//# sourceMappingURL=Generic.js.map