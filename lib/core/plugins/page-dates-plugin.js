const fs = require("fs-extra");

module.exports = class PageDatesPlugin {

	processIndex(weaver) {

		weaver.index.updates = [];

		for(let key in weaver.index.pages) {
			let page = weaver.index.pages[key];

			// Capture the lastModified date for the file
			let pathToContentFile = weaver.pathToPageContent(page);
			let stats = fs.statSync(pathToContentFile);
			page.dateLastModified = stats.mtime;
			page.dateCreated = stats.birthtime;

			// Capture the update in the set of changes
			weaver.index.updates.push({pageKey: page.key, dateLastModified: page.dateLastModified});
		}

		// Sort latest updates in DESCENDING order
		weaver.index.updates.sort(function(a, b) {
			if (a.dateLastModified < b.dateLastModified) {
				return 1;
			} else if (a.dateLastModified === b.dateLastModified) {
				return 0;
			}
			return -1;
		});

		// Save latest updates
		fs.writeJsonSync(weaver.indexDir + '/updates.json', weaver.index.updates);

	}

};