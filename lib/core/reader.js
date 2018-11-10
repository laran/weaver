module.exports = class Reader {

	// base case: just return the content
	read(content) {
		return content;
	}

	// Read file content directly.
	// This adds support for template engines with their own include capabilities
	readFile(pathToFile) {

	}

};