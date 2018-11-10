const cheerio = require('cheerio'),
	MarkdownHelper = require('./markdown-helper');

module.exports = class MarkdownReader {
	constructor() {
		this.markdown = new MarkdownHelper();
	}

	read(content) {
		let that = this;

		// Markdown content is interpreted as an HTML wrapper, where the content of the <body> tag is interpreted as
		// Markdown

		// Load the content as an html document
		let $ = cheerio.load(content);

		// Process the text of the body as markdown and replace the contents of the body with the processed Markdown
		$('body').each(function() {
			let textToProcess = $(this).text();
			$(this).html(that.markdown.render(textToProcess));
		});

		// Render only the content of the HTML
		return $('html').html();
	}
};