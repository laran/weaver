const Liquid = require('liquidjs');

// NOTE Not yet properly implemented for a couple of reasons:
//
// 1) Liquid renders asynchronously, which I will have to look into how to handle.
// 2) Render from file is supported but requires configuration that I still have to look into.
//    See: https://github.com/harttle/liquidjs#render-from-file

module.exports = class LiquidReader {

	constructor() {
		this.engine = Liquid();
	}

	read(content) {
		throw new Error("Not yet implemented");
		// return this.engine.parseAndRender(content);
	}

	readFile(filename) {
		throw new Error("Not yet implemented");
		// return this.engine.parseAndRender(content);
	}

};