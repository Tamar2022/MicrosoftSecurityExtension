import * as vscode from 'vscode';


export function hierarchySearchInFile(fileToSearchIn: string[], searchSentence: string[]) {
	let searchSentenceIndex = 0;
	let requestedLine = -1;
	let lineNumber = 0;
	let numOfTabs = 0;
	for (; lineNumber < fileToSearchIn.length; lineNumber++) {
		let currentSentence = fileToSearchIn[lineNumber].split(':')[0];//The hierarchical search result includes only the first word in the sentence
		let currentNumOfTabs = numberOfTabs(currentSentence);//The number of tabs at the beginning of the sentence

		// Search for a word only in descendants of the previous word found.
		if (currentNumOfTabs < numOfTabs) {
			//If it came out of the descendants of the previous word found.

			searchSentenceIndex = 0;//Re-search begins by reset searchSentenceIndex.
			requestedLine = -1;
		}
		let currentSearchWord = searchSentence[searchSentenceIndex];
		if (currentSentence.includes(currentSearchWord)) {// The search sentence was found
			numOfTabs = currentNumOfTabs;
			searchSentenceIndex++;
			requestedLine = lineNumber; //The line of the search sentence

			//In case the search phrase repeats itself,
			//we will delete the line we found and it will continue to search further
			fileToSearchIn[lineNumber]="";

			if (searchSentenceIndex === searchSentence.length) {//whole search sentence was found
				break;
			}
		}
	}
	const res = {requestedLine,numOfTabs,fileToSearchIn};
	return res;
}


function numberOfTabs(text: string) {
	var count = 0;
	var index = 0;
	while (text.charAt(index++) === ' ') {
		count += 0.5;
		if (text.charAt(index) !== ' ') {//If next character is not part of tab
			break;
		}
	}
	return count;
}