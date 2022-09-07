import * as vscode from 'vscode';
import { Location } from '../customGate/gate-data';
import { TreeItem } from './tree-item';

export class MessageItem extends TreeItem {

  constructor(
    public readonly item: string,
    public readonly location: Location | string,
    public readonly path: string,
    // public readonly reason: string,
    public readonly command?: vscode.Command,

  ) {
    super(item, vscode.TreeItemCollapsibleState.None);
    this.command = {
      "title": "",
      "command": "customGate.showFileData",
      arguments: [this.path, this],
      tooltip: ' '
    };
  }

};