module.exports = class Plugin {

	// ------------------------------
	// INDEX PLUGIN METHODS
	// ------------------------------

	// Process the index AFTER all pages have been indexed
	// and BEFORE the index is persisted. At this point
	// pages in the index can be modified, added or removed.
	// Metadata can be generated or extracted before the
	// index is stored.
	processIndex(weaver) {

	}

	// Process a single page in the index.
	processIndexPage(weaver, page, $page) {

	}

	// ------------------------------
	// PAGE CONTENT PLUGIN METHODS
	// ------------------------------

	// Process the content of a page BEFORE it is injected
	// into either a template or the layout (depending on
	// where the tag is placed. The content is RAW content
	// (not a cheerio object) to support non-html content.
	processPageContentBeforeTemplatesInjected(weaver, page, $page) {

	}

	processPageContentAfterTemplatesInjected(weaver, page, $page) {

	}

	// ------------------------------
	// TEMPLATE PLUGIN METHODS
	// ------------------------------

	// Process a single template when adding it to a layout
	processTemplate(weaver, page, $template, $page, context) {

	}

	// ------------------------------
	// LAYOUT PLUGIN METHODS
	// ------------------------------

	// Process a fully rendered layout after all templates and page head and body are injected
	processLayout(weaver, page, $layout, $page) {

	}

	// Execute logic before the site is built and pages are all rendered to files
	beforeBuild(weaver) {

	}

	// Execute logic after the site is built
	afterBuild(weaver) {

	}

};