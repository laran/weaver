const fs = require('fs-extra');
const path = require("path");
const chalk = require('chalk');
const cheerio = require('cheerio');
const {_log} = require("../helpers");

module.exports = class LinkcheckerPlugin {

    processIndex(weaver) {

        let index = weaver.index;

        //  Helper to log links
        let logLinks = (hrefs, header, style) => {
            if (hrefs && hrefs.length > 0) {
                _log('  - ' + header, style.bold);
                hrefs.forEach((_href) => {
                    _log(style('    -> ' + _href));
                });
            }
        };

        Object.keys(index.pages).forEach((key) => {
            let page = index.pages[key];

            let headerShown = false;

            let valid = [];
            let invalid = [];
            let ignored = [];

            let $ = cheerio.load(weaver.contentFor(page));

            $('a').not('[target=_blank]').each(function (i, el) {

                // Only show page if it has links
                if (!headerShown) {
                    _log('Page: key=\'' + page.key + '\'', chalk.bold);
                    _log(chalk.bold('- ' + chalk.underline('Links')));
                    headerShown = true;
                }

                let href = $(el).attr('href');

                if (typeof href === 'undefined' || href.trim() === '') {
                    return;
                }

                // Accept but ignore external links.
                if (href.toLowerCase().startsWith('http://')
                    || href.toLowerCase().startsWith('https://')) {
                    ignored.push(href);
					return;
                }

                // Strip off any query string
                if (href.indexOf('?') > -1) {
                    href = href.substring(0, href.indexOf('?'));
                }

                // Remove the hash
                let hrefNoHash = href;
                let hashPos = href.indexOf('#');
                if (hashPos > -1) {
                    if (hashPos === 0) {
                        hrefNoHash = '';
                    } else {
                        hrefNoHash = href.substring(0, hashPos);
                    }
                }

                if (hrefNoHash === '') {
                    // links to self are always valid
                    ignored.push(href);
                } else if (hrefNoHash.startsWith('/static')) {
                    // Ensure that the static file exists
                    if (fs.existsSync(weaver.pathToStaticFile(hrefNoHash.substring('/static'.length + 1)))) {
                        valid.push(href);
                    } else {
                        invalid.push(href);
                    }
                } else if (hrefNoHash.endsWith("/")) {
                    // All rendered files will end with .html
                    // All paths ending in '/' are OK provided that that a file name index.* exists in that folder
                    // let pageKey = page.key;//page.key.endsWith('/') ? page.key + 'index' : page.key;
                    let indexPageKey = path.resolve(page.key, (page.key.endsWith('/') ? '' : '../'), hrefNoHash + 'index');
                    indexPageKey = indexPageKey.substring(0, indexPageKey.length - 'index'.length);
                    if (typeof weaver.index.pages[indexPageKey] === 'undefined') {
                        invalid.push(href);
                    } else {
                        valid.push(href);
                    }
                } else {
                    if (!hrefNoHash.endsWith(".html")) {
                        invalid.push(href);
                    } else {
                        // Resolve the link
                        // Add the additional '../' because all paths look like directories without their file extension.
                        // The additional '../' resolves them properly.
                        let targetPageKey = path.resolve(
                            page.key, (page.key.endsWith('/') ? '' : '../'), hrefNoHash.substring(0, hrefNoHash.length - '.html'.length));
                        if (targetPageKey.endsWith('/index')) {
                            targetPageKey = targetPageKey.substring(0, targetPageKey.length - 'index'.length);
                        }

                        // Ignore links to self
                        if (page.key === targetPageKey) {
                            ignored.push(href);
                        } else {
                            if (typeof weaver.index.pages[targetPageKey] === 'undefined') {
                                invalid.push(href);
                            } else {
                                valid.push(href);
                            }
                        }
                    }
                }
            });

            logLinks(invalid, 'NOT Valid', chalk.red);
            logLinks(ignored, 'Ignored', chalk.yellow);
            logLinks(valid, 'Valid', chalk.green);

            if (invalid.length > 0) {
                throw new Error('Could not index page. The page contains invalid links.');
            }
        });
    }
};