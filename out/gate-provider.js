"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatesProvider = void 0;
const vscode = require("vscode");
const gatesList = require("./gates/gateList.json");
const Template_gate_1 = require("./gates/templateAnalyzer/Template-analyzer/Template-gate");
const kubesec_gate_1 = require("./gates/kubesec/kubesecGate/kubesec-gate");
class GatesProvider {
    constructor() {
        this.gates = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.gates = [new kubesec_gate_1.KubesecGate(), new Template_gate_1.TemplateAnalyzerGate()
        ];
        this.loadGates();
    }
    loadGates() {
        gatesList.forEach((gate) => {
            Promise.resolve().then(() => require(gate.path)).then((x) => {
                this.gates.push(new x[gate.name]());
            });
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return element === undefined ?
            Promise.resolve(this.gates) :
            element.getMoreChildren(this);
    }
    activeAllGates() {
        this.gates.forEach((gate) => { return gate.setIsActive(true); });
        this.refresh();
    }
    refresh(treeItem) {
        treeItem ?
            this._onDidChangeTreeData.fire(treeItem) :
            this._onDidChangeTreeData.fire();
    }
}
exports.GatesProvider = GatesProvider;
//# sourceMappingURL=gate-provider.js.map