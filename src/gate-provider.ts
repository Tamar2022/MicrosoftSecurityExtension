import * as vscode from 'vscode';
import { Gate } from './tree item classes/gate';
import { TreeItem } from './tree item classes/tree-item';
import * as gatesList from './gates/gateList.json';
import { WhispersGate } from './gates/whispers/whispers-gate';
import { TemplateAnalyzerGate } from './gates/templateAnalyzer/Template-analyzer/Template-gate';
import { KubesecGate } from './gates/kubesec/kubesecGate/kubesec-gate';


export class GatesProvider implements vscode.TreeDataProvider<TreeItem> {
  public gates: any[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;


  constructor() {
    this.gates = [new KubesecGate(),new TemplateAnalyzerGate()
    ];
    this.loadGates();
  }

  loadGates() {
    gatesList.forEach((gate) => {
      import(gate.path).then((x: any) => {
        this.gates.push(new x[gate.name]());
      });

    });
  }

  getTreeItem(element: Gate): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem | undefined): Thenable<TreeItem[]> {
    return element === undefined ?
      Promise.resolve(this.gates) :
      element.getMoreChildren(this);
  }

  activeAllGates() {
    this.gates.forEach((gate) => { return gate.setIsActive(true); });
    this.refresh();
  }

  refresh(treeItem?:TreeItem): void {
    treeItem ?
    this._onDidChangeTreeData.fire(treeItem) :
    this._onDidChangeTreeData.fire();
  }
}



