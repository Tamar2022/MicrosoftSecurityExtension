"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gate2 = void 0;
const customer_gate_1 = require("../customGate/customer-gate");
class Gate2 extends customer_gate_1.CustomGate {
    constructor() {
        super("22");
        this.contextValue = "gate";
        this.changedContext = "gate2";
        this.labels = ["oo"];
        this.label = "Gate2";
        this.description = "";
    }
    scanData() {
        throw new Error("Method not implemented.");
    }
}
exports.Gate2 = Gate2;
//# sourceMappingURL=myGate.js.map