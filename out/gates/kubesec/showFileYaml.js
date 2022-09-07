"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jumpSpecifiedLine = void 0;
const vscode_1 = require("vscode");
// export async function showTextDocumentWithErrors(result: any, documentText: string[]) {
// 	result.forEach(async (res: any) => {
// 		if (typeof (res.location) === typeof (Location)) {
// 			res.location.lineNumber = hierarchySearchInFile(documentText, [res.message.split(' ')[0]]).requestedLine;
// 			highLightTextInFile(res.location.lineNumber, res.location.columnNumber);
// 		}
// 	});
// }
async function jumpSpecifiedLine(lineNumber, filePath) {
    var pos1 = new vscode_1.Position(lineNumber, 0);
    var openPath = vscode_1.Uri.file(filePath);
    vscode_1.workspace.openTextDocument(openPath).then((doc) => {
        vscode_1.window.showTextDocument(doc).then((editor) => {
            // Line added - by having a selection at the same position twice, the cursor jumps there
            editor.selections = [new vscode_1.Selection(pos1, pos1)];
            // And the visible range jumps there too
            var range = new vscode_1.Range(pos1, pos1);
            editor.revealRange(range);
        });
    });
}
exports.jumpSpecifiedLine = jumpSpecifiedLine;
//# sourceMappingURL=showFileYaml.js.map