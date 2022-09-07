"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetireGate = void 0;
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
const customer_gate_1 = require("../customGate/customer-gate");
const gate_data_1 = require("../customGate/gate-data");
const appRoot = require('app-root-path');
const axios = require('axios');
class RetireGate extends customer_gate_1.CustomGate {
    constructor() {
        super(...arguments);
        this.labels = ["High", "Medium", "Low"];
        this.label = "RetireJS";
        this.description = "";
    }
    async scanData() {
        const resultData = new gate_data_1.GateData();
        const outputChannel = this.createOutputChannel('Retire');
        //    const path = workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
        //     const response = await axios.default({
        //         method: "post",
        //         url: 'https://myfunctionruth.azurewebsites.net/api/TryFunc1?code=DlsIH3aoATO_ybCePc3-7HG1igC5wtwKaKuzp1asc9ymAzFuUHiKNQ==',          
        //         data: path![0],
        //         headers:
        //         {
        //             "Content-Type": `multipart/form-data`
        //         }
        //     });
        //     console.log(response);
        await this.execGate(outputChannel).then((response) => {
            const resultArr = [];
            resultArr.push(new gate_data_1.ResultsList(this.labels[0], []));
            resultArr.push(new gate_data_1.ResultsList(this.labels[1], []));
            resultArr.push(new gate_data_1.ResultsList(this.labels[2], []));
            response.data?.forEach((item) => {
                let filePath = item.file;
                item.results.forEach((re) => {
                    const high = [];
                    const medium = [];
                    const low = [];
                    re.vulnerabilities.forEach((v) => {
                        switch (v.severity) {
                            case "high":
                                high.push(new gate_data_1.GateResult(v.info[0], v.identifiers.summary));
                                break;
                            case "medium":
                                medium.push(new gate_data_1.GateResult(v.info[0], v.identifiers.summary));
                                break;
                            case "low": low.push(new gate_data_1.GateResult(v.info[0], v.identifiers.summary));
                        }
                    });
                    high.length > 0 ? resultArr[0].result.push(new gate_data_1.FileMessages(filePath, filePath.slice(filePath.lastIndexOf('\\') + 1), high)) : null;
                    medium.length > 0 ? resultArr[1].result.push(new gate_data_1.FileMessages(filePath, filePath.slice(filePath.lastIndexOf('\\') + 1), medium)) : null;
                    low.length > 0 ? resultArr[2].result.push(new gate_data_1.FileMessages(filePath, filePath.slice(filePath.lastIndexOf('\\') + 1), low)) : null;
                });
            });
            resultData.data = resultArr;
        });
        return Promise.resolve(resultData);
    }
    async execGate(outputChannel) {
        const path = vscode_1.workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
        const command1 = `npm i -g retire`;
        const command2 = `retire --path ${path} --outputformat json --outputpath ${appRoot}\\results.json`;
        try {
            await (0, child_process_1.execSync)(command1);
        }
        catch (err) {
            console.log(err);
        }
        try {
            this.appendLineToOutputChannel(outputChannel, "Retire scanning the project...");
            await (0, child_process_1.execSync)(command2);
        }
        catch (err) {
            console.log(err);
        }
        this.appendLineToOutputChannel(outputChannel, "The scan is finished");
        let result;
        try {
            result = require(appRoot + "\\results.json");
        }
        catch (err) {
            result = { data: [] };
        }
        return result;
    }
}
exports.RetireGate = RetireGate;
//# sourceMappingURL=retireGate.js.map