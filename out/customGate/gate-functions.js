"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayErrorMessage = exports.readFileByLines = exports.GetFileSettings = exports.GateFunctions = void 0;
const get_all_files_1 = require("get-all-files");
const vscode_1 = require("vscode");
const fs = require("fs");
const vscode = require("vscode");
class GateFunctions {
    async getFiles(searchSettings, files) {
        let _files = [];
        let myPath = vscode_1.workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
        myPath === undefined ? myPath = [] : null;
        for (let path of searchSettings.pathToSearch ? searchSettings.pathToSearch : myPath) {
            for (let filename of files?.length > 0 ? files : (0, get_all_files_1.getAllFilesSync)(path)) {
                for (let fileExtension of searchSettings.fileExtension) {
                    if (filename.endsWith(fileExtension)) {
                        _files.push(filename);
                    }
                }
            }
        }
        return _files;
    }
    createOutputChannel(outputChannelName) {
        let outputChannel = vscode_1.window.createOutputChannel(outputChannelName);
        return outputChannel;
    }
    appendLineToOutputChannel(outputChannel, message) {
        outputChannel.appendLine(message);
    }
    writeResultsToOutput(results, outputChannel) {
        this.appendLineToOutputChannel(outputChannel, "in file: " + results.fileName + " /n");
        results.results.forEach((item) => {
            this.appendLineToOutputChannel(outputChannel, item.message);
        });
    }
}
exports.GateFunctions = GateFunctions;
class GetFileSettings {
    constructor(fileExtension, pathToSearch) {
        this.fileExtension = fileExtension;
        this.pathToSearch = pathToSearch;
    }
}
exports.GetFileSettings = GetFileSettings;
async function readFileByLines(pathOfFileToSearchIn) {
    try {
        const document = await fs.readFileSync(pathOfFileToSearchIn, "utf8");
        const documentStringLines = document.trim().split('\n');
        return documentStringLines;
    }
    catch (Error) {
        displayErrorMessage("There is no such file!");
    }
}
exports.readFileByLines = readFileByLines;
function displayErrorMessage(message) {
    vscode.window.showErrorMessage(message);
}
exports.displayErrorMessage = displayErrorMessage;
//# sourceMappingURL=gate-functions.js.map