const path = require("path");
const express = require('express');

module.exports = class Server {

	constructor(root, port) {
		this.root = path.resolve(root, '_site');
		this.app = express();
		this.port = port;
		this.app.use(
			express.static(this.root, {
				extensions: ['html', 'md', 'markdown'],
				redirect: false
			}));
	}

	serve() {
		this.app.listen(this.port, () => {
			console.log(`Weaver server listening on port ${this.port}!`)
		});
	}

};