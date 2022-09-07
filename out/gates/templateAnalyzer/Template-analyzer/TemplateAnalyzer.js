"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTemplateAnalyzer = exports.locationDownloadFile = void 0;
const fs = require('fs');
const { exec } = require('child_process');
exports.locationDownloadFile = "C:\\Users\\USER\\Documents\\Template-analyzer.zip"; //root diractory
function initTemplateAnalyzer() {
    const uri = `https://github.com/Azure/template-analyzer/releases/download/v0.2.0/TemplateAnalyzer-win-x64.zip`;
    const command1 = `powershell -c "Invoke-WebRequest -Uri ${uri}  -OutFile '${exports.locationDownloadFile}'"`;
    exec(command1, async function (error, stdout, stderr) {
        if (error) {
            console.log(error.stack);
            console.log('Error code: ' + error.code);
            console.log('Signal received: ' + error.signal);
        }
        console.log('Child Process STDOUT: ' + stdout);
    });
}
exports.initTemplateAnalyzer = initTemplateAnalyzer;
//Print installation errors
// export function TemplateAnalyzer(){
// const SarifFile = `--report-format "sarif" -o"C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13\\microsoft-security-gate\\src\\Template-analyzer\\Try.sarif"`;
// const SarifFilePath = "C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13\\microsoft-security-gate\\src\\Try.sarif";
// var command = `C:\\Users\\USER\\Documents\\TemplateAnalyzer-win-x64\\TemplateAnalyzer.exe analyze-directory "C:\\Users\\USER\\Documents\\bootcamp Microsoft\\Lesson 13"  ${SarifFile}`;
// exec(command, async function (error: { stack: any; code: string; signal: string; }, stdout: string, stderr: string) {
//     if (error) {
//         console.log(error.stack);
//         console.log('Error code: ' + error.code);
//         console.log('Signal received: ' + error.signal);
//     }
//     console.log('Child Process STDOUT: ' + stdout);
// });
//const mySarif2 = fs.readFile(SarifFilePath);
//const mySarif = JSON.stringify(mySarif2);
//fs.readFile("");
//load( readFile(SarifFilePath));
//console.log("ddddddd");
//}
//# sourceMappingURL=TemplateAnalyzer.js.map