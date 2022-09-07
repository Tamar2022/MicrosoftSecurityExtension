"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const vscode = require("vscode");
const tree_item_1 = require("./tree-item");
const file_1 = require("./file");
class Category extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, data) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.data = data;
        this.files = data;
    }
    getMoreChildren(element) {
        return Promise.resolve(this.files?.result.map((file) => {
            return new file_1.File(file.filePath, file.fileName, vscode.TreeItemCollapsibleState.Collapsed, file.messages);
        }));
    }
}
exports.Category = Category;
;
//# sourceMappingURL=category.js.map