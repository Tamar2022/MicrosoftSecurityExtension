"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level = void 0;
const vscode = require("vscode");
const tree_item_1 = require("../../../tree item classes/tree-item");
const file_1 = require("./file");
class Level extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, data) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.data = data;
        this.files = data;
    }
    getMoreChildren(element) {
        return Promise.resolve(this.getSarifFiles(this.label));
    }
    async getSarifFiles(label) {
        switch (label) {
            case 'Error':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath.replaceAll('/', '\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.message, obj.locations);
                });
            case 'Warning':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath.replaceAll('/', '\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.message, obj.locations);
                });
            case 'Note':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath.replaceAll('/', '\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.message, obj.locations);
                });
            case 'unLevel':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath.replaceAll('/', '\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.message, obj.locations);
                });
        }
        return [];
    }
}
exports.Level = Level;
;
//# sourceMappingURL=level.js.map