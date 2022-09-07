"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gate = void 0;
const tree_item_1 = require("./tree-item");
class Gate extends tree_item_1.TreeItem {
    constructor(label, collapsibleState, context, isActive = true, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.context = context;
        this.isActive = isActive;
        this.command = command;
        this._isActive = this.isActive;
        //this.command = command;
        this.contextValue = context;
        this.setIsActive(isActive);
    }
    getIsActive() {
        return this._isActive;
    }
    setIsActive(value) {
        this._isActive = value;
    }
}
exports.Gate = Gate;
//# sourceMappingURL=gate.js.map