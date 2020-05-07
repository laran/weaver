const path = require("path");
const fs = require("fs-extra");
const chalk = require('chalk');
const cheerio = require('cheerio');
const {_error, _errorDir, _log} = require("./helpers");

const Page = require('./page');

module.exports = class Indexer {

	constructor(weaver) {
		this.weaver = weaver;
	}

	// extract metadata from a whole collection (directory full of pages)
	indexAllContent(callback) {

		_log("Indexing:", chalk.bold);
		_log(chalk.bold('- ' + 'contentDir: ') + this.weaver.contentDir);
		_log(chalk.bold('- ' + 'indexDir: ') + this.weaver.indexDir);
        _log(chalk.bold('- ' + 'siteDir: ') + this.weaver.siteDir);

		// reset the saved index
		if (fs.existsSync(this.weaver.indexDir)) {
			fs.removeSync(this.weaver.indexDir);
		}
		fs.mkdirpSync(this.weaver.indexDir);

		let that = this;

		new Promise((resolve) => {

			// Step 1: Index all content
			that.weaver.walkSync(that.weaver.contentDir, that.weaver.contentDir, (pathToContentFile) => {
				let page = that.stub(pathToContentFile);

				// Ensure that there isn't any content in a folder named 'static' directly under the content folder
				if (page.key.startsWith('/static')) {
					throw new Error("'/content/static' is a reserved path in Weaver."
						+ " After the site is built, all files in "
						+ path.resolve(that.weaver.contentDir, '../static')
						+ " will be put where files in '/content/static' would go."
						+ " A '/content/static' folder is therefore forbidden"
						+ " in order to avoid the conflict. Please put any files that you want to serve"
						+ " in their raw form in a folder named 'static' alongside the 'content' folder.");
				}

				// Add the file to the index
				that.weaver.index.pages[page.key] = page;
			});

			_log('All pages added to index', chalk.bold.green);

			if (resolve)
				resolve();

		}).then((resolve) => {

			// Now that the index is fully built ...

			// Step 2: Execute plugins that want to operate on each page in the index. Having this step saves the
			//         plugin author the trouble of having to write the loop to iterate over each page in every plugin.
			that.weaver.indexPlugins.forEach((plugin) => {
				if (typeof plugin.processIndexPage === 'function') {
					Object.keys(that.weaver.index.pages).forEach((key) => {
						let page = that.weaver.index.pages[key];
						let $page = cheerio.load(that.weaver.contentFor(page));
						plugin.processIndexPage(that.weaver, page, $page);
					});
				}
			});

			// Step 3: Execute plugins that want to operate on the index as a whole.
			that.weaver.indexPlugins.forEach((plugin) => {
				if (typeof plugin.processIndex === 'function') {
					plugin.processIndex(that.weaver);
				}
			});

			// Step 4: Save all pages after all plugins have had a chance with them.
			Object.keys(that.weaver.index.pages).forEach((key) => {
				that.savePage(that.weaver.index.pages[key]);
			});

			// save the page index
			fs.writeJsonSync(that.weaver.indexDir + '/pages.json', that.weaver.index.pages);

			_log('Indexer indexed successfully', chalk.bold.green);

			if (resolve)
				resolve();

		}).then((resolve) => {

			callback(that);

			if (resolve)
				resolve();

		}).catch(function (err) {
			_error('Collection could not be indexed because of the following error:', chalk.bold.red);
			_error(' - ' + err, chalk.red);

			_errorDir(err);
		});
	}

	// create a stub for a page from a content file
	stub(pathToContentFile) {

		let key = pathToContentFile.substring(this.weaver.contentDir.length, pathToContentFile.lastIndexOf('.'));
		if (key.endsWith('/index')) {
			key = key.substring(0, key.length - 'index'.length);
		}

		return new Page(key, pathToContentFile.substring(pathToContentFile.lastIndexOf('.') + 1));
	}

	// write a page to disk
	savePage(page) {

		if (!this.weaver.indexDir)
			throw new Error("Cannot save page. indexDir is not set");

		// derive the path for the new index file
		let pagePath = this.weaver.pathToPageIndex(page);

		// ensure we haven't already indexed the page
		if (fs.existsSync(pagePath)) {
			fs.unlinkSync(pagePath);
		}

		// ensure that the directory exists for the page.
		// this is necessary for pages that have a '/' in the key.
		fs.mkdirpSync(pagePath.substring(0, pagePath.lastIndexOf('/')));

		// write the index record to the index
		fs.writeJsonSync(pagePath, page);
	}

};