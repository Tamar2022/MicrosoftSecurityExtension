import { Command, OutputChannel, TextDocument, TreeDataProvider, TreeItemCollapsibleState, workspace } from "vscode";
import { GatesProvider } from "../gate-provider";
import { Category } from "../tree item classes/category";
import { File } from "../tree item classes/file";
import { Gate } from "../tree item classes/gate";
import { TreeItem } from "../tree item classes/tree-item";
import { GateData, ResultsList } from "./gate-data";
import { GateFunctions, GetFileSettings } from "./gate-functions";



//After implementing the gate, a name and path must be added to the file gateList.json

//abstract class for generic gates
export abstract class CustomGate extends Gate {

    //Results of gate
    public gateScanData!: GateData;
    

    //Files to send to gate

    public files: string[] = [];

    //Labels of treeItems in hierarchy of gate
    abstract labels: string[];

    //The name of the gate
    abstract label: string;

    //Description of gate
    abstract description: string;

    //Set functions for generic gate
    private functions = new GateFunctions();



    constructor(label: string = "custom", isActive: boolean = false, contextValue: string = "gate") {
        const con = isActive ? "anyGate" : "gate";
        super(label, TreeItemCollapsibleState.Collapsed, con, isActive);
        this.listenerSaveEvent();
    }


    //This function runs when the gate is enabled
    public async activate() {
        this.setIsActive(true);
        this.scanData().then(data => this.gateScanData = data).then(() => {
            this.myProvider?.refresh();
        });
        this.listenerSaveEvent();
    }

    //This function runs when the gate is disabled
    public async deactivate() {
        this.setIsActive(false);
        this.gateScanData.data.splice(0, this.gateScanData.data.length);
        this.myProvider?.refresh();
    }

    //This function happens when there are changes in the files
    private listenerSaveEvent() {
        workspace.onDidSaveTextDocument((document: TextDocument) => {
            document.uri.scheme === "file" ?
                this.files.push(document.fileName) :
                this.files;
            this.files.length > 0 ?
                this.refresh() :
                console.log('no file has changes');
        });
    }

    //This function refreshes the information and UI
    private async refresh() {
        if (this.files.length > 0) {
            const results = this.gateScanData?.data?.filter((element) => {
                element.result?.map((item) => {
                    let arr = this.files;
                    arr = arr.filter(file => {
                        return file.slice(file.indexOf(':')) === item.filePath.slice(file.indexOf(':'));

                    });
                    return arr.length === 0;
                });

            });
            this.gateScanData.data = results;
            this.scanData().then((data) => {
                for (let index = 0; index < this.labels.length; index++) {
                    this.gateScanData?.data[index]?.result ?
                        this.gateScanData?.data[index].result.concat(data?.data[index]?.result) :
                        this.gateScanData.data[index] = new ResultsList(data?.data[index]?.label, data?.data[index]?.result);
                }
            });
            this.files = [];
            this.myProvider?.refresh();
        }
    }

    //This function return the hierarchy of the gate
    public getMoreChildren(element?: TreeDataProvider<TreeItem> | undefined): Thenable<TreeItem[]> {
        if (this.getIsActive()) {
            this.myProvider = <GatesProvider>element;
            let resultArr: Category[] = [];
            this.labels.map((l) => {
                resultArr.push(new Category(l, TreeItemCollapsibleState.Collapsed, this.gateScanData?.data.find((e) => e.label === l)!));
            });
            for(let item of resultArr)
            {
                if(item.data.result.length>0)
                {
                    return Promise.resolve(resultArr);
                }
            }
            return Promise.resolve([new TreeItem("No results have been found",TreeItemCollapsibleState.None)]);          
        }
        return Promise.resolve([]);
    }

    //This function returns files according to the data sent
    public async getFiles(searchSettings: GetFileSettings) {
        const _files = this.functions.getFiles(searchSettings, this.files);
        this.files = [];
        return _files;
    }

    //This function create output channel
    public createOutputChannel(name: string) {
        return this.functions.createOutputChannel(name);
    }

    //This function write to output channel
    public appendLineToOutputChannel(outputChannel: OutputChannel, message: string) {
        this.functions.appendLineToOutputChannel(outputChannel, message);
    }

    public writeResultsToOutput(results: File, outputChannel: OutputChannel) {
        this.functions.writeResultsToOutput(results, outputChannel);
    }

    //this abstract function that should return the results of the gate
    public abstract scanData(): Promise<GateData>;
}











