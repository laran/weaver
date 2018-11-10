module.exports = class Page {

	constructor(key, extension) {
		this.key = key;

		// default the title to the key
		this.attributes = { title: key };
		this.extension = extension;

		// the href for directories is the index.html file within it
		this.href = key.endsWith('/') ? (key + 'index.html') : (key + '.html');
	}

};