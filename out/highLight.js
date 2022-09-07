"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highLightTextInFile = void 0;
const vscode = require("vscode");
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
//# sourceMappingURL=highLight.js.map