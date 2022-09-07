"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = exports.CategoryType = void 0;
const vscode = require("vscode");
const file_1 = require("./file");
const tree_item_1 = require("./tree-item");
var CategoryType;
(function (CategoryType) {
    CategoryType[CategoryType["Critical"] = 0] = "Critical";
    CategoryType[CategoryType["Passed"] = 1] = "Passed";
    CategoryType[CategoryType["Advise"] = 2] = "Advise";
})(CategoryType = exports.CategoryType || (exports.CategoryType = {}));
class Category extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, data) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.data = data;
        this.files = [];
        this.files = data;
    }
    getMoreChildren(element) {
        return Promise.resolve(this.getYamlFiles(this.label));
    }
    async getYamlFiles(label) {
        switch (label) {
            case 'Critical':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.critical);
                });
            case 'Passed':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.passed);
                });
            case 'Advise':
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.advise);
                });
        }
        return [];
    }
}
exports.Category = Category;
;
//# sourceMappingURL=category.js.map