import * as vscode from 'vscode';
import { TextDocument, workspace } from 'vscode';
import { GatesProvider } from '../gate-provider';
import { TreeItem } from './tree-item';

export class Gate extends TreeItem {
 
  public myProvider: GatesProvider | undefined;
  private _isActive = this.isActive;
  
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public context: string,
    public isActive: boolean = true,
    public  command?: vscode.Command,
  ) {

    super(label, collapsibleState);
    //this.command = command;
    this.contextValue = context;
    this.setIsActive(isActive);
  }

  public getIsActive() {
    return this._isActive;
  }

  public setIsActive(value: boolean) {
    this._isActive = value;
  }




  

}