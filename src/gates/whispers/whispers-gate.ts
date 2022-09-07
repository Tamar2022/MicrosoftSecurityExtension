import { CustomGate } from '../../customGate/customer-gate';
import { displayErrorMessage, GetFileSettings, readFileByLines } from '../../customGate/gate-functions';
import { FileMessages, GateData, GateResult, Location, ResultsList } from '../../customGate/gate-data';
import * as vscode from 'vscode';
import FormData = require('form-data');
import { hierarchySearchInFile } from '../../search';
import path = require('path');
import { MyPath } from '../../extension';
const appRoot = require('app-root-path');
const fs = require('fs');
const axios = require('axios');

export class WhispersGate extends CustomGate {
    contextValue?: string | undefined;

    //Labels of treeItems in hierarchy of gate
    labels: string[] = ["secrets"];

    //The name of the gate
    label: string = "whispers";

    //Description of gate
    description: string = "Whispers is a static code analysis tool designed for parsing various common data formats in search of hardcoded credentials and dangerous functions.";

    constructor() {
        super("whispers");
    }

    public async scanData(): Promise<GateData> {

        const form: FormData = new FormData(); //Data to be sent to the api

        const configFilePath = path.join(appRoot.toString(), "src\\gates\\whispers\\config.yaml");//my configuration file path
        form.append(configFilePath, fs.createReadStream(configFilePath));//The config file should be sent first   

        const filePaths = await this.getFiles(new GetFileSettings([".yaml", ".json"])); //the appropriate file paths
        filePaths.forEach(path => {
            let fileStream = fs.createReadStream(path);// create file stream from file path
            form.append(path, fileStream);//Append all files to the data
        });
        try {

            let whispersResult = await this.sendFilesToWhispers(form);//Sending the files to whispers api
            let whispersResultArr = JSON.parse(whispersResult.replaceAll("'", '"'));// parse the result to JSON object
            let secrets = new GateData();// Init secrets of files for the function response
            secrets.data = [new ResultsList("secrets", [])];//Init secrets data with label: secrets
            let resultNumber = 0;

            whispersResultArr.forEach(async (res: any) => {
                if (res['secrets'].length !== 0) //there are secrets in the file
                {
                    const filePath = res['name'];// Path of the file
                    const fileName = filePath.slice(filePath.lastIndexOf('\\'), filePath.length).slice(1);//Name of the file
                    secrets.data[0].result!.push(new FileMessages(filePath, fileName, []));//Init FileMessages of the current file

                    let documentText = await readFileByLines(filePath);// My current file contents

                    res['secrets'].forEach((sec: any) => {//Running through all the secrets
                        const searchResults = hierarchySearchInFile(documentText!, [sec.split(' ')[0]]); //Searching the secret location in the file
                        documentText = searchResults.fileToSearchIn; //Updating the file content in case of duplicate secrets
                        secrets.data[0].result[resultNumber].messages!.push(new GateResult(new Location(searchResults.requestedLine, 0), sec));//Push secret with its location
                    });

                    resultNumber++;//next file
                }
            });
            vscode.window.showInformationMessage("Whispers is ready!");
            return secrets;
        } catch (ex: any) {
            displayErrorMessage(ex.message);
            return new GateData();
        }
    }

    async sendFilesToWhispers(data: FormData): Promise<any> {

        const response = await axios({
            //sending to the api
            method: "post",
            url: 'https://whisper-gate.azurewebsites.net/api/whispersGate',
            data: data,
            headers:
            {
                "Content-type": "multipart/form-data"
            }
        });


        return response.data;

    }

}
