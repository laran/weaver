const path = require("path");
const fs = require('fs-extra');
const express = require('express');

const {_error, _log} = require("./helpers");
const Page = require(path.resolve(__dirname, 'page'));
const Weaver = require('./weaver');

module.exports = class Server {

	constructor(root, port) {
		const that = this;
		this.root = path.resolve(root, '_site');
		this.app = express();
		this.port = port;
		this.weaver = new Weaver(root);

		// Default to production.
		// Better to default to the strictest mode and forget to disable it for development ...
		// vs. assuming non-prod and forgetting to lock it down when deploying to prod.
		const ENABLE_HEAD_REQUESTS = !!process.env.ENABLE_HEAD_REQUESTS;

		if (!!ENABLE_HEAD_REQUESTS) {
			_log("HEAD requests are enabled");

			const that = this;

			this.app.head('*', (req, res, next) => {
				let parsedPath = path.parse(req.path);
				let pathToIndexFile = parsedPath.dir + parsedPath.name;
				let pathToPageIndex = that.weaver.pathToPageIndex(new Page(pathToIndexFile));
				let pageIndex = fs.readFileSync(pathToPageIndex, 'utf8');
				let pageIndexBase64 = Buffer.from(pageIndex).toString('base64');
				res.set('X-Weaver-Index', pageIndexBase64);
				next();
			});
		}
		this.app.use(
			express.static(this.root, {
				extensions: ['html', 'md', 'markdown'],
				redirect: false
			}));
	}

	serve() {
		this.app.listen(this.port, () => {
			console.log('\n---\n'); // just an empty line for spacing
			_log(`Weaver server listening on port ${this.port}!`)
			console.log('\n---\n'); // just an empty line for spacing
		});
	}

};