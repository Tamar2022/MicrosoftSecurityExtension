"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const scoring_1 = require("./scoring");
const tree_item_1 = require("./tree-item");
class File extends tree_item_1.TreeItem {
    constructor(path, fileName, collapsibleState, scoringRes, command) {
        super(fileName, collapsibleState);
        this.path = path;
        this.fileName = fileName;
        this.collapsibleState = collapsibleState;
        this.scoringRes = scoringRes;
        this.command = command;
        this.scoring = this.scoringRes;
        command = {
            "title": "",
            "command": "kubesec.showTextDocument",
            arguments: [this],
        };
        this.command = command;
    }
    getMoreChildren(element) {
        let filePath = this.path;
        return Promise.resolve(this.scoring.map(function (obj) {
            return new scoring_1.ScoringItem(obj['id'], obj['selector'], obj['reason'], filePath);
        }));
    }
}
exports.File = File;
;
//# sourceMappingURL=file.js.map