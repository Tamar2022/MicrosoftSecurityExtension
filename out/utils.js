"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreviewChunks = exports.asResourceUrl = exports.tail = exports.del = void 0;
const vscode_1 = require("vscode");
function del(array, e) {
    const idx = array.indexOf(e);
    if (idx >= 0) {
        array.splice(idx, 1);
    }
}
exports.del = del;
function tail(array) {
    return array[array.length - 1];
}
exports.tail = tail;
function asResourceUrl(uri, range) {
    return uri.with({ fragment: `L${1 + range.start.line},${1 + range.start.character}-${1 + range.end.line},${1 + range.end.character}` });
}
exports.asResourceUrl = asResourceUrl;
function getPreviewChunks(doc, range, beforeLen = 8, trim = true) {
    let previewStart = range.start.with({ character: Math.max(0, range.start.character - beforeLen) });
    let wordRange = doc.getWordRangeAtPosition(previewStart);
    let before = doc.getText(new vscode_1.Range(wordRange ? wordRange.start : previewStart, range.start));
    let inside = doc.getText(range);
    let previewEnd = range.end.translate(0, 331);
    let after = doc.getText(new vscode_1.Range(range.end, previewEnd));
    if (trim) {
        before = before.replace(/^\s*/g, '');
        after = after.replace(/\s*$/g, '');
    }
    return { before, inside, after };
}
exports.getPreviewChunks = getPreviewChunks;
//# sourceMappingURL=utils.js.map