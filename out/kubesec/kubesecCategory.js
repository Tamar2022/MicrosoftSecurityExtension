"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubesecCategory = void 0;
const vscode_1 = require("vscode");
const file_1 = require("../tree item classes/file");
const tree_item_1 = require("../tree item classes/tree-item");
class KubesecCategory extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, data //|undefined
    ) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.data = data;
        this.files = [];
        this.files = data;
    }
    async getYamlFiles(label) {
        //let files = (await kubesec());
        switch (label) {
            case 'Critical': //files = files.filter((element) => { return element.kubesecResult[0].scoring?.critical?.length > 0; });
                return this.files?.map((obj) => {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode_1.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.critical);
                });
            case 'Passed': //files = files.filter((element) => { return element.kubesecResult[0].scoring?.passed?.length > 0; });
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode_1.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.passed);
                });
            case 'Advise': //files = files.filter((element) => { return element.kubesecResult[0].scoring?.advise?.length > 0; });
                return this.files?.map(function (obj) {
                    return new file_1.File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode_1.TreeItemCollapsibleState.Collapsed, obj.kubesecResult[0].scoring.advise);
                });
        }
        return [];
        // return this.files?.map(function (obj) {
        //   return new File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
        //     obj.kubesecResult[0].scoring.critical);
        // });
    }
    getMoreChildren(element) {
        return Promise.resolve(this.files?.map((file) => {
            return new file_1.File(file.filePath, file.filePath.slice(file.filePath.lastIndexOf('\\') + 1), vscode_1.TreeItemCollapsibleState.None, file.kubesecResult);
        }));
    }
}
exports.KubesecCategory = KubesecCategory;
;
//# sourceMappingURL=kubesecCategory.js.map