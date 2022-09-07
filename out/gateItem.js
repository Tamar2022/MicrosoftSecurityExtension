"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyGate = void 0;
const axios_1 = require("axios");
const fs_1 = require("fs");
const customer_gate_1 = require("./customGate/customer-gate");
const gate_data_1 = require("./customGate/gate-data");
const gate_functions_1 = require("./customGate/gate-functions");
class MyGate extends customer_gate_1.CustomGate {
    constructor() {
        super(...arguments);
        this.label = "kubesec gate";
        this.description = "gate for yaml files";
        this.outputChannel = this.createOutputChannel("kubesec-output-channel");
        this.labels = ["critical", "passed", "advise"];
    }
    // constructor() {
    //     super();
    // }
    async getScanData() {
        this.myData?.data?.splice(0, this.myData.data.length);
        let arr = [];
        //writeKubesecResultsToOutput(_kubesecResults,MDCOutputChannel);   
        await this.getKubesec().then((data) => {
            arr = data;
        }).then(() => {
            arr.map((value) => {
                let labelGate = "";
                value.kubesecResult[0]?.scoring?.critical?.length > 0 ? labelGate = this.labels[0] : labelGate;
                value.kubesecResult[0]?.scoring?.passed?.length > 0 ? labelGate = this.labels[1] : labelGate;
                value.kubesecResult[0]?.scoring?.advise?.length > 0 ? labelGate = this.labels[2] : labelGate;
                // this.myData.data.push(  { fileName: value.filePath.slice(value.filePath.lastIndexOf('\\') + 1), filePath: value.filePath, result: value.kubesecResult });
            });
        });
        this.myData = new gate_data_1.GateData();
        this.myData.data = [];
        this.myData.data.push(new gate_data_1.ResultsList("critical", [new gate_data_1.FileMessages("C:/Users/user1/.vscode/extensions/MicrosoftSecurityExtension/src/yaml files/criti.yaml", "criti.yaml", [new gate_data_1.GateResult(4, "very bad problem")])]));
        return this.myData;
    }
    async getKubesec() {
        let _kubesecResults = [];
        let myFiles = [];
        myFiles = await this.getFiles(new gate_functions_1.GetFileSettings(".yaml"));
        for (const file of myFiles) {
            //  appendLineToOutputChannel(MDCOutputChannel,"send "+file+" file for checking");
            const myFile = (0, fs_1.readFileSync)(file, 'utf-8');
            const response = await (0, axios_1.default)({
                method: "post",
                url: 'https://v2.kubesec.io/scan',
                data: Buffer.from(myFile),
                headers: {
                    "Content-Type": `text/yaml`
                }
            });
            _kubesecResults.push({
                'filePath': file,
                'kubesecResult': response.data
            });
        }
        return _kubesecResults;
    }
}
exports.MyGate = MyGate;
_a = MyGate;
MyGate.dummy = customer_gate_1.CustomGate.derived.add(_a.name);
// export function gateDecorator() {
//         return function gateDecorator(constructor:any) {
//           try{
//               CustomGate.children.push(constructor);
//           }catch(err)
//           {
//               console.log(err);
//           }
//       };   
// }
//# sourceMappingURL=gateItem.js.map