"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubesecGate = void 0;
const vscode = require("vscode");
const vscode_1 = require("vscode");
const gate_1 = require("../tree item classes/gate");
const kubesec_1 = require("./kubesec");
const kubesecCategory_1 = require("./kubesecCategory");
//const kubesecData= kubesec();
class KubesecGate extends gate_1.Gate {
    constructor(isActive = false) {
        super("Kubesec", vscode.TreeItemCollapsibleState.Collapsed, 'kubesec', isActive);
        this.isActive = isActive;
        this.data = [];
        (0, kubesec_1.kubesec)().then(data => this.data = data);
        this.listenerSaveEvent();
    }
    getTreeItem(element) {
        return element;
    }
    getMoreChildren(element) {
        this.myProvider = element;
        let criticalData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.critical?.length > 0; });
        let passedData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.passed?.length > 0; });
        let adviseData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.advise?.length > 0; });
        return this.getIsActive() === true ?
            Promise.resolve([new kubesecCategory_1.KubesecCategory("Critical", vscode.TreeItemCollapsibleState.Collapsed, criticalData),
                new kubesecCategory_1.KubesecCategory("Passed", vscode.TreeItemCollapsibleState.Collapsed, passedData),
                new kubesecCategory_1.KubesecCategory("Advise", vscode.TreeItemCollapsibleState.Collapsed, adviseData)]) :
            Promise.resolve([]);
    }
    async refresh(changeFiles) {
        if (changeFiles) {
            this.data = this.data.filter((element) => {
                let arr = changeFiles;
                arr = arr.filter(file => {
                    // return file===element.filePath;
                    return file.slice(file.indexOf(':')) === element.filePath.slice(file.indexOf(':'));
                });
                return arr.length === 0;
            });
            for (const file of changeFiles) {
                this.data.push({
                    'filePath': file,
                    'kubesecResult': await (0, kubesec_1.sendFile)(file)
                });
            }
            // changeFiles.forEach(element=>{
            //   sendFile(element).then(fileResult=>{
            //     this.data.push({
            //       'filePath':element,
            //       'kubesecResult':fileResult
            //   })
            //     ;}).then( ()=>{this.myProvider?.refresh();}   
            //     );
            // });
            this.myProvider?.refresh();
        }
        // this.myProvider?.refresh();
        // this.myProvider?.getChildren(undefined);
    }
    async activate() {
        this.setIsActive(true);
        (0, kubesec_1.kubesec)().then(data => this.data = data).then(() => {
            this.myProvider?.refresh();
        });
        this.listenerSaveEvent();
        //this.myProvider?.getChildren(undefined);
    }
    async deactivate() {
        this.setIsActive(false);
        this.myProvider?.refresh();
        //this.myProvider?.getChildren(undefined);
    }
    listenerSaveEvent() {
        let arrResult = [];
        vscode_1.workspace.onDidSaveTextDocument((document) => {
            arrResult = [];
            console.log(document.fileName);
            document.languageId === "yaml" && document.uri.scheme === "file" ?
                arrResult.push(document.fileName) :
                arrResult;
            arrResult.length > 0 ?
                //this.myProvider?.refresh() :
                this.refresh(arrResult) :
                console.log('no yaml file has changes');
        });
    }
}
exports.KubesecGate = KubesecGate;
//   class TreeItem extends vscode.TreeItem {
//     children: TreeItem[] | undefined;
//     constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, children?: TreeItem[]) {
//       super(
//         label,
//         children === undefined ? vscode.TreeItemCollapsibleState.None :
//           vscode.TreeItemCollapsibleState.Expanded
//       );
//       this.children = children;
//     }
//   }
//# sourceMappingURL=kubesec-gate.js.map