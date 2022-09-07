import * as vscode from 'vscode';
import { TreeItem } from './tree-item';
import { File } from './file';
import { GateResult, ResultsList } from '../customGate/gate-data';


export class Category extends TreeItem {
  public files:ResultsList;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public data: ResultsList

  ) {
    super(label, collapsibleState);
    this.files = data;
  }

  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
    return Promise.resolve(this.files?.result.map((file) => {
      return new File(file.filePath, file.fileName, vscode.TreeItemCollapsibleState.Collapsed,
       file.messages);
    }));
  }
};
