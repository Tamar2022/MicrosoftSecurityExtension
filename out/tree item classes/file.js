"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const message_1 = require("./message");
const tree_item_1 = require("./tree-item");
class File extends tree_item_1.TreeItem {
    constructor(path, fileName, collapsibleState, results, command) {
        command = {
            "title": "",
            "command": "customGate.showData",
            arguments: [path, results],
            tooltip: ' '
        };
        super(fileName, collapsibleState);
        this.path = path;
        this.fileName = fileName;
        this.collapsibleState = collapsibleState;
        this.results = results;
        this.command = command;
        this.command = command;
    }
    getMoreChildren(element) {
        let path = this.path;
        return Promise.resolve(this.results.map(function (r) {
            return new message_1.MessageItem(r.message, r.location, path);
        }));
    }
}
exports.File = File;
;
//# sourceMappingURL=file.js.map