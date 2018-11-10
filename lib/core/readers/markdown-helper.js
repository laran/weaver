const unified = require('unified'),
    parseMarkdown = require('remark-parse'),
    markdownToHtml = require('remark-rehype'),
    translateToHtml = require('rehype-stringify'),
    format = require('rehype-format'),
    raw = require('rehype-raw'),
    interpretAttributesInMarkdown = require('remark-attr'),
    gemojiToEmoji = require('remark-gemoji-to-emoji');

module.exports = class MarkdownHelper {
    constructor() {
        this.processor = unified()
            .use(parseMarkdown, {gfm: true, footnotes: true})
            .use(gemojiToEmoji)
            .use(interpretAttributesInMarkdown)
            .use(markdownToHtml, {allowDangerousHTML: true}) // allowDangerousHTML is necessary to keep head/body elements
            .use(raw)
            .use(format)
            .use(translateToHtml);
    }

    render(text) {
        return this.processor.processSync(text);
    }
};