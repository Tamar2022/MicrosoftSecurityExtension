"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gate = void 0;
const vscode = require("vscode");
const tree_item_1 = require("../../tree item classes/tree-item");
const { writeFileSync, readFileSync } = require('fs');
class Gate extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, context, isActive = false) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.context = context;
        this.isActive = isActive;
        this._isActive = this.isActive;
        this.contextValue = context;
        this.setIsActive(isActive);
    }
    getIsActive() {
        return this._isActive;
    }
    async setIsActive(value) {
        this._isActive = value;
        this.isActive ? vscode.commands.executeCommand('setContext', 'templateGateActive', true) :
            vscode.commands.executeCommand('setContext', 'templateGateActive', false);
        // vscode.commands.executeCommand('setContext', this.context + 'Active', value);
        const settings = vscode.workspace.getConfiguration().get('microsoft.security.gate.gates.activity.settings', {});
        const newSetting = { ...settings, ...{ [this.label]: value } };
        await vscode.workspace.getConfiguration().update('microsoft.security.gate.gates.activity.settings', newSetting, vscode.ConfigurationTarget.Global);
    }
    getMoreChildren(element) {
        return Promise.resolve([]);
    }
    async activate() {
        await this.setIsActive(true);
        vscode.window.showInformationMessage('The gate was successfully activated');
    }
    async deactivate() {
        await this.setIsActive(false);
        vscode.window.showInformationMessage('The gate was successfully deactivated');
    }
}
exports.Gate = Gate;
//# sourceMappingURL=gate.js.map