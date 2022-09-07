"use strict";
// import { CustomGate } from '../../customGate/customer-gate';
// import { readFileSync } from 'fs';
// import { GetFileSettings } from '../../customGate/gate-functions';
// import { FileMessages, GateData, GateResult, Location, ResultsList } from '../../customGate/gate-data';
// const fs = require('fs');
// const formData = require('form-data');
// const axios = require('axios');
// export class WhispersGate extends CustomGate {
//     //Labels of treeItems in hierarchy of gate
//     labels: string[] = ["secrets"];
//     //The name of the gate
//     label: string = "whispers";
//     //Description of gate
//     description: string = "Whispers is a static code analysis tool designed for parsing various common data formats in search of hardcoded credentials and dangerous functions.";
//     constructor() {
//         super("whispers");
//     }
//     public async scanData(): Promise<GateData> {
//         debugger;
//         const form = new formData(); //Data to be sent to the api
//         const filePaths = await this.getFiles(new GetFileSettings(".yml")); //the appropriate file paths
//         let files=[];
//         for (let fileNumber = 0; fileNumber < filePaths.length; fileNumber++) {
//             const file =  readFileSync(filePaths[fileNumber], 'utf-8');
//             files.push(fs.createReadStream(filePaths[fileNumber]));
//         }
//         form.append('files',files);
//         debugger;
//         // let filesSecrets:GateData=new GateData();
//         // filePaths.forEach(async (path: any) => {
//         //     const filesSecrets=await this.sendFileToWhispers(path);
//             // const file = readFileSync(path, 'utf-8');
//             // form.append('file'.concat(fileNumber.toString()), fs.createReadStream(path)); //collects the files to send
//             // fileNumber++;
//         // filesSecrets.push(currentFileSecrets.data);
// // });
//     return await this.sendFileToWhispers(form);
//     debugger;
//         // return filesSecrets;
//     }
//     async sendFileToWhispers(data: FormData):Promise<any> {
//         const response = await axios({
//             //sending to the api
//             method: "post",
//             url: 'https://whisper-gate.azurewebsites.net/api/whispersGate',
//             data: data,//new formData(fs.createReadStream(filePath)),
//             headers:
//             {
//                 "Content-type": "multipart/form-data"
//             }
//         });
//         // let data=new GateData();
//         // data.data=[new ResultsList("secrets",[new FileMessages("...","misc",[new GateResult(new Location(1,2),"hiiiiiiiiiiiiiiiii")])])];
//         return response.data;
//         // return data;
//         }
//     // public async scanData(): Promise<GateData> {
//     //     // const form = new formData(); //Data to be sent to the api
//     //     const filePaths = await this.getFiles(new GetFileSettings(".yml")); //the appropriate file paths
//     //     let filesSecrets:GateData=new GateData();
//     //     // filePaths.forEach(async (path: any) => {
//     //         filesSecrets=await this.sendFileToWhispers(filePaths[1]);
//     //     // });
//     //     return filesSecrets;
//     // }
//     // async sendFileToWhispers(filePath: string):Promise<any> {
//     //     let dataToSend=new formData();
//     //     dataToSend.append(fs.createReadStream("config.yml"));
//     //     dataToSend.append(fs.createReadStream(filePath));
//     // const response = await axios({
//     //     //sending to the api
//     //     method: "post",
//     //     url: 'https://whisper-gate.azurewebsites.net/api/whispersGate',
//     //     data:dataToSend ,
//     //     headers:
//     //     {
//     //         "Content-type": "multipart/form-data"
//     //     }
//     // });
//     // // let data=new GateData();
//     // // data.data=[new ResultsList("secrets",[new FileMessages("...","misc",[new GateResult(new Location(1,2),"hiiiiiiiiiiiiiiiii")])])];
//     // return response.data;
//     // // return data;
//     // }
// }
//# sourceMappingURL=y.js.map