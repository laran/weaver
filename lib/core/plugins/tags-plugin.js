const fs = require("fs-extra");
const {attributeToArray} = require('../helpers');

module.exports = class TagsPlugin {

	processIndexPage(weaver, page, $page) {
		let index = weaver.index;

		// Ensure that the index is aware of tags
		if (typeof index.tags === 'undefined') {
			index.tags = {};
		}

		// Split the tags attribute into an array of tag names
		page.tags = attributeToArray($page('head').data('tags')) || [];

		// Add the page to the tag
		for(let tag of page.tags) {

			if (tag.trim() !== '') {
				if (!tag.match(/^[a-zA-Z0-9\-]*$/)) {
					throw new Error("Invalid tag. Tags must contain only " +
						"letters (a-zA-Z), numbers (0-9) or hyphens ('-')");
				}

				if (!index.tags.hasOwnProperty(tag)) {
					index.tags[tag] = {
						key: tag,
						pages: []
					};
				}

				index.tags[tag].pages.push({
					key: page.key, attributes: {title: page.attributes.title}
				});
			}
		}
	}

	processIndex(weaver) {

		let index = weaver.index;

		// save each tag
		Object.keys(index.tags).forEach((key) => {
			this.saveTag(index.tags[key], weaver);
		});

		// save all tags
		fs.writeJsonSync(weaver.indexDir + '/tags.json', index.tags);

	}

	// write a tag to disk
	saveTag(tag, weaver) {

		if (!weaver.indexDir)
			throw new Error("Cannot save tag. indexDir is not set on weaver");

		// derive the path for the new index file
		let tagPath = weaver.indexDir + '/tags/' + tag.key + '.json';

		// ensure we haven't already indexed the page
		if (fs.existsSync(tagPath)) {
			fs.unlinkSync(tagPath);
		}

		// ensure that the directory exists for the page.
		// this is necessary for pages that have a '/' in the key.
		fs.mkdirpSync(tagPath.substring(0, tagPath.lastIndexOf('/')));

		// write the index record to the index
		fs.writeJsonSync(tagPath, tag);
	}
};