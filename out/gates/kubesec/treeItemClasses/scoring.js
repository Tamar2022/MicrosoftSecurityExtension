"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringItem = void 0;
const vscode = require("vscode");
const tree_item_1 = require("./tree-item");
class ScoringItem extends tree_item_1.TreeItem {
    constructor(name, selector, reason, filePath, command) {
        super(reason, vscode.TreeItemCollapsibleState.None);
        this.name = name;
        this.selector = selector;
        this.reason = reason;
        this.filePath = filePath;
        this.command = command;
        command = {
            "title": "",
            "command": "kubesec.showScoring",
            arguments: [this],
        };
        this.command = command;
    }
}
exports.ScoringItem = ScoringItem;
;
//# sourceMappingURL=scoring.js.map