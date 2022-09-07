import * as vscode from 'vscode';
import { TreeItem } from '../../tree item classes/tree-item';

const { writeFileSync,readFileSync } = require('fs');


export class Gate extends TreeItem {
  private _isActive = this.isActive;
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public context:string,
    public isActive: boolean = false,
  ) {
    super(label, collapsibleState);
    this.contextValue = context;
    this.setIsActive(isActive);
  }

  public getIsActive() {
    return this._isActive;
  }

  public async setIsActive(value: boolean) {
    this._isActive = value;
    this.isActive? vscode.commands.executeCommand('setContext','templateGateActive', true) :
    vscode.commands.executeCommand('setContext', 'templateGateActive', false);
   // vscode.commands.executeCommand('setContext', this.context + 'Active', value);
    const settings=vscode.workspace.getConfiguration().get('microsoft.security.gate.gates.activity.settings',{});
	  const newSetting = { ...settings, ...{[this.label]:value} };
		await vscode.workspace.getConfiguration().update('microsoft.security.gate.gates.activity.settings', newSetting, vscode.ConfigurationTarget.Global);
  }

  public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
    return Promise.resolve([]);
  }

  public async activate(){
    await this.setIsActive(true);
    vscode.window.showInformationMessage('The gate was successfully activated'); 


  }
  public async deactivate(){
    await this.setIsActive(false);
    vscode.window.showInformationMessage('The gate was successfully deactivated');
  }

}
