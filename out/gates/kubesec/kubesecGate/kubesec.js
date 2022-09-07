"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showTextDocumentWithErrorsKubesec = exports.sendFilesToKubesec = exports.arrangeKubesecSelectorBeforeSearch = exports.readFileByLines = exports.readKubesecFileByLines = exports.removeInvalidCharctersInSentence = exports.kubesec = void 0;
const vscode = require("vscode");
const fs_1 = require("fs");
const get_all_files_1 = require("get-all-files");
const output_channel_1 = require("../output-channel");
const search_1 = require("../search");
const highLight_1 = require("../highLight");
const showFileYaml_1 = require("../showFileYaml");
const axios = require('axios');
const fs = require('fs');
const fileType = '.yaml';
const kubesecSelectorInvalidCharcters = ['|', '==', '-'];
async function kubesec() {
    const files = await getFiles();
    return await sendFilesToKubesec(files);
}
exports.kubesec = kubesec;
async function getFiles() {
    let myPath = vscode.workspace.workspaceFolders?.map(elem => elem.uri.fsPath);
    myPath === undefined ? myPath = [] : null;
    let files = [];
    for (const path of myPath) {
        for (const filename of (0, get_all_files_1.getAllFilesSync)(path)) {
            if (filename.endsWith(fileType)) {
                files.push(filename);
            }
        }
    }
    return files;
}
function removeInvalidCharctersInSentence(searchSentence, invalidCharcters) {
    invalidCharcters.forEach(ch => {
        const indexOfInvalidCharacter = searchSentence.indexOf(ch);
        if (indexOfInvalidCharacter !== -1) {
            searchSentence = searchSentence.slice(0, indexOfInvalidCharacter);
        }
    });
    return searchSentence;
}
exports.removeInvalidCharctersInSentence = removeInvalidCharctersInSentence;
async function readKubesecFileByLines(pathOfFileToSearchIn) {
    try {
        const document = await fs.readFileSync(pathOfFileToSearchIn, "utf8");
        const documentStringLines = document.trim().split('\n');
        return documentStringLines;
    }
    catch (Error) {
        displayErrorMessage("There is no such file!");
    }
}
exports.readKubesecFileByLines = readKubesecFileByLines;
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
function arrangeKubesecSelectorBeforeSearch(fileToSearchIn, searchSentence) {
    if (searchSentence[0] === '.') {
        //example:
        //".spec .serviceAccountName" 
        searchSentence = searchSentence.slice(1, searchSentence.length);
    }
    //Examples of kubesec results that need character removal before sending to search.
    //To get a correct search result:
    //"containers[] .securityContext .capabilities .drop | index(\"ALL\")"
    //"containers[] .securityContext .readOnlyRootFilesystem == true"
    //"containers[] .securityContext .runAsUser -gt 10000"
    searchSentence = removeInvalidCharctersInSentence(searchSentence, kubesecSelectorInvalidCharcters);
    let searchSentenceSplit = searchSentence.replaceAll(' ', '').split('.');
    if (searchSentenceSplit[0].includes("containers[]")) {
        searchSentenceSplit[0] = searchSentenceSplit[0].trim().slice(0, -2);
    }
    if (searchSentenceSplit[0].includes("metadata")) {
        searchSentenceSplit = ["metadata"];
    }
    return searchSentenceSplit;
}
exports.arrangeKubesecSelectorBeforeSearch = arrangeKubesecSelectorBeforeSearch;
async function sendFileToKubesec(filePath) {
    const file = (0, fs_1.readFileSync)(filePath, 'utf-8');
    const response = await axios({
        method: "post",
        url: 'https://v2.kubesec.io/scan',
        data: Buffer.from(file),
        headers: {
            "Content-Type": `text/yaml`
        }
    });
    (0, output_channel_1.fileKubesecResultToOutputChannel)(filePath, response.data);
    return response.data;
}
async function sendFilesToKubesec(files) {
    let kubesecResults = [];
    for (const file of files) {
        kubesecResults.push({
            'filePath': file,
            'kubesecResult': await sendFileToKubesec(file)
        });
    }
    return kubesecResults;
}
exports.sendFilesToKubesec = sendFilesToKubesec;
async function showTextDocumentWithErrorsKubesec(kubesecResult, textDocument) {
    let documentText;
    kubesecResult.forEach(async (res) => {
        documentText = await readFileByLines(textDocument.fileName);
        const searchSentence = res['selector'];
        const searchSentenceReadyToSearch = arrangeKubesecSelectorBeforeSearch(documentText, searchSentence);
        const searchResult = (0, search_1.hierarchySearchInFile)(documentText, searchSentenceReadyToSearch);
        if (searchResult) {
            const requestedLine = searchResult.requestedLine;
            const numOfTabs = searchResult.numOfTabs;
            if (requestedLine === -1) {
                displayErrorMessage(searchSentence + " not found!");
            }
            else {
                (0, highLight_1.highLightTextInFile)(requestedLine, numOfTabs);
                (0, showFileYaml_1.jumpSpecifiedLine)(requestedLine, textDocument.uri.path);
            }
        }
    });
}
exports.showTextDocumentWithErrorsKubesec = showTextDocumentWithErrorsKubesec;
function displayErrorMessage(message) {
    vscode.window.showInformationMessage(message);
}
//# sourceMappingURL=kubesec.js.map