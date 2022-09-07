import { exec } from 'child_process';
import * as vscode from 'vscode';
import { TextDocument, Uri, workspace } from 'vscode';
import { GatesProvider } from '../../../gate-provider';
import { Category } from '../treeItemClasses/category';
import { Gate } from '../treeItemClasses/gate';
import { TreeItem } from '../treeItemClasses/tree-item';

import { kubesec, sendFilesToKubesec } from './kubesec';

const documentType = "yaml";
export class KubesecGate extends Gate {

  public myProvider: GatesProvider | undefined;
  public data: { filePath: string; kubesecResult: any; }[] = [];

  constructor(public isActive: boolean = false) {
    super("Kubesec", vscode.TreeItemCollapsibleState.Collapsed, 'kubesec', isActive);
    this.listenerSaveEvent();

  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }


  public async getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Promise<TreeItem[]> {
    this.myProvider = <GatesProvider>element;
    if (this.getIsActive() === true) {
      this.data.length === 0 ? this.data = await kubesec() : this.data;
      let criticalData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.critical?.length > 0; });
      let passedData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.passed?.length > 0; });
      let adviseData = this.data.filter((element) => { return element.kubesecResult[0].scoring?.advise?.length > 0; });
      return Promise.resolve([new Category("Critical", vscode.TreeItemCollapsibleState.Collapsed, criticalData),
      new Category("Passed", vscode.TreeItemCollapsibleState.Collapsed, passedData),
      new Category("Advise", vscode.TreeItemCollapsibleState.Collapsed, adviseData)]);

    }
    else {
      return Promise.resolve([]);
    }

  }

  public async refresh(changeFiles: string[] | undefined) {

    if (changeFiles) {
      this.data = this.data.filter(elem => !changeFiles?.includes(elem.filePath));
      const newData = await sendFilesToKubesec(changeFiles);
      for (const newFile of newData) {
        this.data.push(newFile);
      }
      this.myProvider?.refresh(this);

    }
  }

  public async activate() {
    super.activate();
    this.data = [];
    this.myProvider?.refresh();

  }

  public async deactivate() {
    super.deactivate();
    this.myProvider?.refresh();
  }

  public listenerSaveEvent() {
    let arrResult: string[] = [];
    workspace.onDidSaveTextDocument((document: TextDocument) => {
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
