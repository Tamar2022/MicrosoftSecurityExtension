"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeItem = void 0;
const vscode = require("vscode");
class TreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
    getMoreChildren(element) {
        return Promise.resolve([]);
    }
}
exports.TreeItem = TreeItem;
//# sourceMappingURL=tree-item.js.map