const fs = require("fs-extra");

const validateBaseUrl = () => {
	let baseurl = process.env.WEAVER_BASE_URL;
	if (baseurl === undefined || baseurl === null) {
		throw new Error(
			"The sitemap-plugin requires a base url in order to generate fully-qualified URLs in the sitemap." +
			" Please set the WEAVER_BASE_URL environment variable to the fully qualified URL to the root of your" +
			" application (e.g. https://my.site.com) with no trailing-slash");
	}
};

module.exports = class SitemapPlugin {

    afterBuild(weaver) {

    	validateBaseUrl();

		let that = this;

        // Sitemap needs to be written to the top level path.
        // See: https://www.sitemaps.org/protocol.html#location
        let pathToSitemap = weaver.siteDir + '/sitemap.xml';

        // Sitemap XML envelope bits
        let sitemapHeader = '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        let sitemapFooter = '</urlset>';

        // Format the page.dateLastModified in the expected format for the lastmod element of a record
        let formatDate = function (date) {
            let d = new Date(date),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;

            return [year, month, day].join('-');
        };

        let isExcluded = function (p) {
            return p.pluginAttributes
                && p.pluginAttributes.hasOwnProperty('sitemap')
                && p.pluginAttributes.sitemap.hasOwnProperty('exclude');
        };

        // Construct the sitemap
        let sitemap = fs.createWriteStream(pathToSitemap);
        sitemap.on('open', function (fd) {

            // Write the start of the XML envelope
            sitemap.write(sitemapHeader);

            // Generate sitemap records for every page
            for(let key in weaver.index.pages) {
                let page = weaver.index.pages[key];

                if (page.key === '/sitemap' && page.extension === 'xml') {
                    throw new Error('/sitemap.xml is a reserved path.'
                        + ' It\'s where the generated sitemap file will be written.'
                        + ' Please save this page with a different file name and/or extension.');
                }

                // Exclude pages with head[data-page-exclude-from-sitemap] from the sitemap
                if (!isExcluded(page)) {

                    // When any ancestor of the page is excluded, all children of the excluded ancestor
                    // will also be excluded
                    let isExcludedByAncestor = false;
                    for(let p of page.ancestors) {
                        // Have to fetch the page from the index because attributes aren't stored on the ancestors
                        // directly. They're only stored in the index.
                        isExcludedByAncestor |= isExcluded(weaver.index.pages[p.key]);
                    }

                    // When neither the page nor any of it's parents are excluded, include it in the sitemap.
                    if (!isExcludedByAncestor) {
                        let record = `\t<url>\n\t\t<loc>${process.env.WEAVER_BASE_URL + page.href}</loc>`;

                        // Support dateLastModified if it's present.
                        if (page.hasOwnProperty('dateLastModified') && page.dateLastModified) {
                            record += `\n\t\t<lastmod>${formatDate(page.dateLastModified)}</lastmod>`;
                        }
                        record += '\n\t</url>\n';
                        sitemap.write(record);
                    }
                }

            }

            // Enclose the sitemap element
            sitemap.write(sitemapFooter);

            // Close the write stream to the sitemap file
            sitemap.end();
        });
    }

};