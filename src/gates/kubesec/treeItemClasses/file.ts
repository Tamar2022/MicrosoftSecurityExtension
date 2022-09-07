import * as vscode from 'vscode';
import { ScoringItem } from './scoring';
import { TreeItem } from './tree-item';

export class File extends TreeItem {
  private scoring: [] = this.scoringRes;

  constructor(
    public readonly path: string,
    public readonly fileName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public scoringRes: [],
    public readonly command?: vscode.Command,
  ) {
    super(fileName, collapsibleState);
    command = {
      "title": "",
      "command": "kubesec.showTextDocument",
      arguments: [this],
    };
    this.command = command;
  }


  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined):any {
    let filePath = this.path;
    return Promise.resolve(this.scoring.map(function (obj) {
      return new ScoringItem(obj['id'], obj['selector'], obj['reason'], filePath);
    }));
  }
};
