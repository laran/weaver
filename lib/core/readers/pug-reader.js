const pug = require('pug'),
    MarkdownHelper = require('./markdown-helper');

const helper = new MarkdownHelper();
const markdown = function(text) {
    return helper.render(text).toString();
};

module.exports = class PugReader {

    constructor() {
        this.options = {
            filters: {
                "markdown": markdown,
                "md": markdown
            }
        };
    }

    read(content) {
        return pug.render(content, this.options);
    }

    readFile(filename) {
        return pug.renderFile(filename, this.options);
    }

};