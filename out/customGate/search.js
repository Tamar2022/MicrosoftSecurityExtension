"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export function hierarchySearchInFile(fileToSearchIn: string[], searchSentence: string[]) {
// 	let searchSentenceIndex = 0;
// 	let requestedLine = -1;
// 	let lineNumber = 0;
// 	let numOfTabs = 0;
// 	for (; lineNumber < fileToSearchIn.length; lineNumber++) {
// 		let currentSentence = fileToSearchIn[lineNumber].split(':')[0];//only for kubesec?-The hierarchical search result includes only the first word in the sentence
// 		let currentNumOfTabs = numberOfTabs(currentSentence);
// 		// Search for a word only in descendants of the previous word found.
// 		if (currentNumOfTabs < numOfTabs) {
// 			//If it came out of the descendants of the previous word found.
// 			searchSentenceIndex = 0;//Re-search begins by reset searchSentenceIndex.
// 			requestedLine = -1;
// 		}
// 		let currentSearchWord = searchSentence[searchSentenceIndex];
// 		if (currentSentence.includes(currentSearchWord)) {
// 			numOfTabs = currentNumOfTabs;
// 			searchSentenceIndex++;
// 			requestedLine = lineNumber;
// 			if (searchSentenceIndex === searchSentence.length) {
// 				break;
// 			}
// 		}
// 	}
// 	const res = { requestedLine, numOfTabs };
// 	return res;
// }
function numberOfTabs(text) {
    var count = 0;
    var index = 0;
    while (text.charAt(index++) === ' ') {
        count += 0.5;
        if (text.charAt(index) !== ' ') { //If next character is not part of tab
            break;
        }
    }
    return count;
}
//# sourceMappingURL=search.js.map