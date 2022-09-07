import * as vscode from 'vscode';
import { File } from './file';
import { TreeItem } from './tree-item';

export enum CategoryType {
  Critical,
  Passed,
  Advise
}
export class Category extends TreeItem {
  public files: { filePath: string; kubesecResult: any; }[] = [];

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public data: { filePath: string; kubesecResult: any; }[]
  ) {
    super(label, collapsibleState);
    this.files = data;
  }

  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined):any {
    return Promise.resolve(this.getYamlFiles(this.label));
  }

  async getYamlFiles(label: string): Promise<TreeItem[]> {
    switch (label) {
      case 'Critical':
        return this.files?.map(function (obj) {
          return new File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.kubesecResult[0].scoring.critical);
        });
      case 'Passed':
        return this.files?.map(function (obj) {
          return new File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.kubesecResult[0].scoring.passed);
        });
      case 'Advise':
        return this.files?.map(function (obj) {
          return new File(obj.filePath, obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.kubesecResult[0].scoring.advise);
        });
    }
    return [];
  }


};
