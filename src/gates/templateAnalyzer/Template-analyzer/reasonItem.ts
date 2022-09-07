import * as vscode from 'vscode';
import { TreeItem } from '../../../tree item classes/tree-item';


export class ReasonItem extends TreeItem {
  constructor(
    public readonly location: any,
    public readonly massege: string,
    public readonly command1:string,
    public readonly path:string,
  ) {
    super(massege, vscode.TreeItemCollapsibleState.None);
    this.command={
      "command":command1,
      "title":"openLine",
      arguments:[location,path,massege]

    };
  }
};