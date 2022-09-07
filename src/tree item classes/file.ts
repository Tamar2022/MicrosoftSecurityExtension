import * as vscode from 'vscode';
import { GateResult } from '../customGate/gate-data';
import { MessageItem } from './message';
import { TreeItem } from './tree-item';

export class File extends TreeItem {

  constructor(
    public readonly path: string,
    public readonly fileName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public results: GateResult[],
    public readonly command?: vscode.Command,
  ) {
    command = {
      "title": "",
      "command": "customGate.showData",
      arguments: [path, results],
      tooltip: ' '
    };
    super(fileName, collapsibleState);
    this.command = command;

  }


  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
    let path = this.path;
    return Promise.resolve(this.results.map(function (r) {
      return new MessageItem(r.message, r.location, path);
    }));
  }

};