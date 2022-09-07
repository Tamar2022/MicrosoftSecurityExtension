import * as vscode from 'vscode';
import { TreeItem } from '../../../tree item classes/tree-item';
import { File } from './file';

export class Level extends TreeItem {

  public files: { filePath: string; message: string; locations: any }[];

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public data: { filePath: string; message: string; locations: any }[]
  ) {
    super(label, collapsibleState);
    this.files = data;
    }

  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
    return Promise.resolve(this.getSarifFiles(this.label));
  }

  async getSarifFiles(label: string): Promise<TreeItem[]> {
    switch (label) {
      case 'Error':
        return this.files?.map(function (obj) {
          return new File(obj.filePath.replaceAll('/','\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\')+1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.message, obj.locations);
        });
      case 'Warning':
        return this.files?.map(function (obj) {
          return new File(obj.filePath.replaceAll('/','\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.message, obj.locations);
        });
      case 'Note':
        return this.files?.map(function (obj) {
          return new File(obj.filePath.replaceAll('/','\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.message, obj.locations);
        });
      case 'unLevel':
        return this.files?.map(function (obj) {
          return new File(obj.filePath.replaceAll('/','\\'), obj.filePath.slice(obj.filePath.lastIndexOf('\\') + 1), vscode.TreeItemCollapsibleState.Collapsed,
            obj.message, obj.locations);
        });
    }
    return [];
  }
};