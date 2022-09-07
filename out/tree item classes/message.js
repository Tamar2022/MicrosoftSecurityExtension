"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageItem = void 0;
const vscode = require("vscode");
const tree_item_1 = require("./tree-item");
class MessageItem extends tree_item_1.TreeItem {
    constructor(item, location, path, 
    // public readonly reason: string,
    command) {
        super(item, vscode.TreeItemCollapsibleState.None);
        this.item = item;
        this.location = location;
        this.path = path;
        this.command = command;
        this.command = {
            "title": "",
            "command": "customGate.showFileData",
            arguments: [this.path, this],
            tooltip: ' '
        };
    }
}
exports.MessageItem = MessageItem;
;
//# sourceMappingURL=message.js.map