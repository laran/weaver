const sha256 = require('crypto-js/sha256');
const Base64 = require('crypto-js/enc-base64');

module.exports = class ContentHasherPlugin {

	// Save a hash of the rendered page content in the index
	processIndexPage(weaver, page, $page) {
		page.hash = Base64.stringify(sha256($page.html()));
	}

};