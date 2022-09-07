"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasonItem = void 0;
const vscode = require("vscode");
const tree_item_1 = require("../../../tree item classes/tree-item");
class ReasonItem extends tree_item_1.TreeItem {
    constructor(location, massege, command1, path) {
        super(massege, vscode.TreeItemCollapsibleState.None);
        this.location = location;
        this.massege = massege;
        this.command1 = command1;
        this.path = path;
        this.command = {
            "command": command1,
            "title": "openLine",
            arguments: [location, path, massege]
        };
    }
}
exports.ReasonItem = ReasonItem;
;
//# sourceMappingURL=reasonItem.js.map