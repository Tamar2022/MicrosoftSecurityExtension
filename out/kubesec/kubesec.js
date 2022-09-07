"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFile = exports.getFiles = exports.writeResultsToOutput = exports.appendLineToOutputChannel = exports.createOutputChannel = exports.kubesec = void 0;
const vscode = require("vscode");
const axios = require('axios');
//import { getVSCodeDownloadUrl } from '@vscode/test-electron/out/util';
//const fs = require('fs');
const fs_1 = require("fs");
const get_all_files_1 = require("get-all-files");
//import { TextDocument, workspace } from 'vscode';
const fileType = '.yaml';
async function kubesec() {
    const MDCOutputChannel = createOutputChannel("MDC-Microsoft Security Gate");
    var _files = await getFiles();
    appendLineToOutputChannel(MDCOutputChannel, "get all files");
    var _kubesecResults = [];
    for (const file of _files) {
        appendLineToOutputChannel(MDCOutputChannel, "send " + file + " file for checking");
        _kubesecResults.push({
            'filePath': file,
            'kubesecResult': await sendFile(file)
        });
        //  writeResultsToOutput(_kubesecResults, MDCOutputChannel);
    }
    for (const fileWithKubesecResult of _kubesecResults) {
        returnKubesecMessage(fileWithKubesecResult);
    }
    return _kubesecResults;
}
exports.kubesec = kubesec;
function createOutputChannel(outputChannelName) {
    //Create output channel
    let outputChannel = vscode.window.createOutputChannel(outputChannelName);
    return outputChannel;
}
exports.createOutputChannel = createOutputChannel;
function appendLineToOutputChannel(outputChannel, message) {
    outputChannel.appendLine(message);
}
exports.appendLineToOutputChannel = appendLineToOutputChannel;
function writeResultsToOutput(results, MDCOutputChannel) {
    // const currentResult = _kubesecResults[_kubesecResults.length - 1].kubesecResult[0];
    // const message = "message:" + currentKubesecResult.message + ',\n';
    // const scoring = currentKubesecResult.scoring;
    // const advise = currentKubesecResult.scoring.advise;
    // const passed = currentKubesecResult.scoring.passed;
    // const critical = currentKubesecResult.scoring.critical;
    // let scoringResult = "";
    // if (scoring) {
    //     scoringResult = scoringResult.concat('scoring:');
    //     if (advise) {
    //         scoringResult = scoringResult.concat("advise-");
    //         advise.forEach((adv: any) => {
    //             scoringResult = scoringResult.concat("reason:" + adv.reason + ',\n' + "selector:" + adv.selector + ',\n');
    //         });
    //     }
    //     if (passed) {
    //         scoringResult = scoringResult.concat("passed-");
    //         passed.forEach((pass: any) => {
    //             scoringResult = scoringResult.concat("reason:" + pass.reason + ',\n' + "selector:" + pass.selector + ',\n');
    //         });
    //     }
    //     if (critical) {
    //         scoringResult = scoringResult.concat("critical-");
    //         critical.forEach((criti: any) => {
    //             scoringResult = scoringResult.concat("reason:" + criti.reason + ',\n' + "selector:" + criti.selector + ',\n');
    //         });
    //     }
    // }
    appendLineToOutputChannel(MDCOutputChannel, "in file: " + results.fileName + " /n");
    results.results.forEach((item) => {
        appendLineToOutputChannel(MDCOutputChannel, item.message);
    });
}
exports.writeResultsToOutput = writeResultsToOutput;
async function getFiles() {
    var _files = [];
    for (const filename of (0, get_all_files_1.getAllFilesSync)('C:\\Users\\user1\\.vscode\\extensions\\MicrosoftSecurityExtension')) {
        if (filename.endsWith(fileType)) {
            _files.push(filename);
        }
    }
    return _files;
}
exports.getFiles = getFiles;
async function sendFile(filePath) {
    const file = (0, fs_1.readFileSync)(filePath, 'utf-8');
    const response = await axios({
        method: "post",
        url: 'https://v2.kubesec.io/scan',
        data: Buffer.from(file),
        headers: {
            "Content-Type": `text/yaml`
        }
    });
    return response.data;
}
exports.sendFile = sendFile;
// export async function listenerSaveEvent() {
//     let arrResult: string[] = [];
//     workspace.onDidSaveTextDocument((document: TextDocument) => {
//         arrResult=[];
//         console.log(document.fileName);
//         return document.languageId === "yaml" && document.uri.scheme === "file" ?
//          arrResult.push(document.fileName) :arrResult;
//     });
// }
async function returnKubesecMessage(fileResult) {
    // fileResult.kubesecResult[0].valid===false?
    // await vscode.window.showErrorMessage(fileResult.filePath + ': ' + fileResult.kubesecResult[0].message):
    // await vscode.window.showErrorMessage(fileResult.filePath);   
}
//# sourceMappingURL=kubesec.js.map