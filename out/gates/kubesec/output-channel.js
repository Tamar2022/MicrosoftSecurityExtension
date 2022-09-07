"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileKubesecResultToOutputChannel = exports.appendLineToOutputChannel = void 0;
const vscode = require("vscode");
const category_1 = require("./treeItemClasses/category");
const outputChannelName = "Kubesec Gate";
const MDCOutputChannel = vscode.window.createOutputChannel(outputChannelName);
function appendLineToOutputChannel(message) {
    MDCOutputChannel.appendLine(message);
}
exports.appendLineToOutputChannel = appendLineToOutputChannel;
function fileKubesecResultToOutputChannel(file, kubesecResult) {
    appendLineToOutputChannel(file);
    const message = kubesecResult[0].message;
    appendLineToOutputChannel(message);
    const critical = kubesecResult[0].scoring?.critical;
    const passed = kubesecResult[0].scoring?.passed;
    const advise = kubesecResult[0].scoring?.advise;
    critical ? critical.forEach(elem => scoringToToOutputChannel(category_1.CategoryType.Critical, elem)) : null;
    passed ? passed.forEach(elem => scoringToToOutputChannel(category_1.CategoryType.Passed, elem)) : null;
    advise ? advise.forEach(elem => scoringToToOutputChannel(category_1.CategoryType.Advise, elem)) : null;
}
exports.fileKubesecResultToOutputChannel = fileKubesecResultToOutputChannel;
function scoringToToOutputChannel(category, data) {
    const critical = "✘", passed = "✔", advise = "->";
    switch (category) {
        case category_1.CategoryType.Critical:
            appendLineToOutputChannel(critical + JSON.stringify(data));
            break;
        case category_1.CategoryType.Passed:
            appendLineToOutputChannel(passed + JSON.stringify(data));
            break;
        case category_1.CategoryType.Advise:
            appendLineToOutputChannel(advise + JSON.stringify(data));
    }
}
//# sourceMappingURL=output-channel.js.map