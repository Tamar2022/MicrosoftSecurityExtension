"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Location = exports.GateResult = exports.FileMessages = exports.ResultsList = exports.GateData = void 0;
class GateData {
}
exports.GateData = GateData;
class ResultsList {
    constructor(label, result) {
        this.label = label;
        this.result = result;
    }
}
exports.ResultsList = ResultsList;
class FileMessages {
    constructor(filePath, fileName, messages) {
        this.filePath = filePath;
        this.fileName = fileName;
        this.messages = messages;
    }
}
exports.FileMessages = FileMessages;
class GateResult {
    constructor(location, message) {
        this.location = location;
        this.message = message;
    }
}
exports.GateResult = GateResult;
class Location {
    constructor(line, column = 0) {
        this.lineNumber = line;
        this.columnNumber = column;
    }
}
exports.Location = Location;
//# sourceMappingURL=gate-data.js.map