import * as vscode from 'vscode';
import { CategoryType } from './treeItemClasses/category';
const outputChannelName = "Kubesec Gate";

const MDCOutputChannel = vscode.window.createOutputChannel(outputChannelName);

export function appendLineToOutputChannel(message: string) {
    MDCOutputChannel.appendLine(message);
}

export function fileKubesecResultToOutputChannel(file: string, kubesecResult: any[]) {
    appendLineToOutputChannel(file);
    const message=kubesecResult[0].message;
    appendLineToOutputChannel(message);
    const critical: [] | undefined = kubesecResult[0].scoring?.critical;
    const passed: [] | undefined = kubesecResult[0].scoring?.passed;
    const advise: [] | undefined = kubesecResult[0].scoring?.advise;
    critical ? critical.forEach(elem => scoringToToOutputChannel(CategoryType.Critical, elem)) : null;
    passed ? passed.forEach(elem => scoringToToOutputChannel(CategoryType.Passed, elem)) : null;
    advise ? advise.forEach(elem => scoringToToOutputChannel(CategoryType.Advise, elem)) : null;
}


function scoringToToOutputChannel(category: CategoryType, data: any) {
    const critical = "✘", passed = "✔", advise = "->";
    switch (category) {
        case CategoryType.Critical:
            appendLineToOutputChannel(critical + JSON.stringify(data)); break;
        case CategoryType.Passed:
            appendLineToOutputChannel(passed + JSON.stringify(data)); break;
        case CategoryType.Advise:
            appendLineToOutputChannel(advise + JSON.stringify(data));
    }
}






