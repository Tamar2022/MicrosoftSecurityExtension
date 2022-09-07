
export class GateData
{ 
    public data!:ResultsList[];
    public metadata?:string;
}

export class ResultsList{
    public label!:string;
    public result!:FileMessages[];

    constructor(label:string,result:FileMessages[]) {
        this.label=label;
        this.result=result;
    }
}

export class FileMessages{
    public filePath!:string;
    public fileName!:string;
    public messages!:GateResult[];

    constructor(filePath:string,fileName:string,messages:GateResult[]) {
        this.filePath=filePath;
        this.fileName=fileName;
        this.messages=messages;
    }
}

export class GateResult
{   
    public location:Location | string;
    public message:string;

    constructor(location:Location |string,message:string) {       
        this.location=location;
        this.message=message;
    }
}

export class Location{
    public lineNumber:number;
    public columnNumber?:number;

    constructor(line:number,column:number=0) {
        this.lineNumber=line;
        this.columnNumber=column;
    }
}



