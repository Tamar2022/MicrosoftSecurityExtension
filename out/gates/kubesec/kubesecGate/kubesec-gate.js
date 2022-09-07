"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubesecGate = void 0;
const vscode = require("vscode");
const vscode_1 = require("vscode");
const category_1 = require("../treeItemClasses/category");
const gate_1 = require("../treeItemClasses/gate");
const kubesec_1 = require("./kubesec");
const documentType = "yaml";
class KubesecGate extends gate_1.Gate {
    constructor(isActive = false) {
        super("Kubesec", vscode.TreeItemCollapsibleState.Collapsed, 'kubesec', isActive);
        this.isActive = isActive;
        this.data = [];
        this.listenerSaveEvent();
    }
    getTreeItem(element) {
        return element;
    }
    async getMoreChildren(element) {
        this.myProvider = element;
        if (this.getIsActive() === true) {
            this.data.length === 0 ? this.data = await (0, kubesec_1.kubesec)() : this.data;
            let criticalData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.critical?.length > 0; });
            let passedData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.passed?.length > 0; });
            let adviseData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.advise?.length > 0; });
            return Promise.resolve([new category_1.Category("Critical", vscode.TreeItemCollapsibleState.Collapsed, criticalData),
                new category_1.Category("Passed", vscode.TreeItemCollapsibleState.Collapsed, passedData),
                new category_1.Category("Advise", vscode.TreeItemCollapsibleState.Collapsed, adviseData)]);
        }
        else {
            return Promise.resolve([]);
        }
    }
    async refresh(changeFiles) {
        if (changeFiles) {
            this.data = this.data.filter(elem => !changeFiles?.includes(elem.filePath));
            const newData = await (0, kubesec_1.sendFilesToKubesec)(changeFiles);
            for (const newFile of newData) {
                this.data.push(newFile);
            }
            this.myProvider?.refresh(this);
        }
    }
    async activate() {
        super.activate();
        this.data = [];
        this.myProvider?.refresh();
    }
    async deactivate() {
        super.deactivate();
        this.myProvider?.refresh();
    }
    listenerSaveEvent() {
        let arrResult = [];
        vscode_1.workspace.onDidSaveTextDocument((document) => {
            arrResult = [];
            document.uri.scheme === "file" && document.languageId === documentType ?
                arrResult.push(document.fileName) :
                arrResult;
            arrResult.length > 0 ?
                this.refresh(arrResult) :
                console.log('no yaml file has changes');
        });
    }
}
exports.KubesecGate = KubesecGate;
//# sourceMappingURL=kubesec-gate.js.map