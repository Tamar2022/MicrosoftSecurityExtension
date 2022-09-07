"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const tree_item_1 = require("../../../tree item classes/tree-item");
const reasonItem_1 = require("./reasonItem");
class File extends tree_item_1.TreeItem {
    constructor(path, fileName, collapsibleState, message, locations, command) {
        command = {
            "title": "",
            "command": "showTextDocument",
            arguments: [path, locations], //.startLine?
        };
        super(fileName, collapsibleState);
        this.path = path;
        this.fileName = fileName;
        this.collapsibleState = collapsibleState;
        this.message = message;
        this.locations = locations;
        this.command = command;
        this.command = command;
    }
    getMoreChildren(element) {
        // let cmdOpenFile = this.command;
        return Promise.resolve([new reasonItem_1.ReasonItem(this.locations, this.message, "openInLine", this.path)]);
    }
}
exports.File = File;
;
//# sourceMappingURL=file.js.map