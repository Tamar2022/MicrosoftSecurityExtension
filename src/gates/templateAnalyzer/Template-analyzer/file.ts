import * as vscode from 'vscode';
import { TreeItem } from '../../../tree item classes/tree-item';
import { ReasonItem } from './reasonItem';

export class File extends TreeItem {

    constructor(
        public readonly path: string,
        public readonly fileName: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly message: string,
        public locations: any,
        public readonly command?: vscode.Command,
    ) {
        command = {
            "title": "",
            "command": "showTextDocument",
            arguments: [path,locations],//.startLine?
        };
        super(fileName, collapsibleState);
        this.command = command;
    }

    public getMoreChildren(element?: vscode.TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
       // let cmdOpenFile = this.command;
        return Promise.resolve([new ReasonItem(this.locations, this.message, "openInLine",this.path)]);
    }
};