// Allow attributes to be set on the head element of the page content and then substituted into elements in the
// body of the page.

// Get all attributes of a Node
// Passing in attributes so they can be built cumulatively, though
// that would only ever be needed if there were multiple head elements in a page
const getAllAttributes = function (node, attributes) {
	if (!node || !node.attribs) {
		return;
	}

	Object.keys(node.attribs).forEach((key) => {
		if (key.startsWith('data-page-')) {
			attributes.page[key.substring(10)] = node.attribs[key];
		} else if (key.startsWith('data-plugin-')) {
		    let dataPluginPrefix = key.substring('data-plugin-'.length);
		    if (dataPluginPrefix.indexOf('-') === -1) {
		        attributes.plugins[dataPluginPrefix] = node.attribs[key];
            } else {
                let pluginName = dataPluginPrefix.substring(0, dataPluginPrefix.indexOf('-'));
                let pluginAttributeName = dataPluginPrefix.substring(pluginName.length + 1);
                if (!attributes.plugins.hasOwnProperty(pluginName)) {
                    attributes.plugins[pluginName] = {};
                }
                attributes.plugins[pluginName][pluginAttributeName] = node.attribs[key];
            }
        }
	})
};

// Attributes can be hidden on a given page by adding an attribute to the page head like
// data-plugin-attributes-omit-<name of attribute>
// data-plugin-attributes-empty-<name of attribute>
const getAttributesToHide = function (node, omit, empty) {
    let omitPrefix = 'data-plugin-attributes-omit-';
    let emptyPrefix = 'data-plugin-attributes-empty-';
    Object.keys(node.attribs).forEach((key) => {
        if (key.startsWith(omitPrefix)) {
            omit.push(key.substring(omitPrefix.length));
        }
        if (key.startsWith(emptyPrefix)) {
            empty.push(key.substring(emptyPrefix.length));
        }
    });
};

// Inject all page attributes into the layout wherever they are referenced.
const injectAllPageAttributes = function ($layout, body, attributes, omit, empty) {
	Object.keys(attributes).forEach((key) => {
	    if (omit.includes(key)) {
            $layout(`*[data-page-${key}]`).remove();
        } else if (empty.includes(key)) {
            $layout(`*[data-page-${key}]`).text('');
        } else {
            $layout(`*[data-page-${key}]`).text(attributes[key]);
        }
	})
};

module.exports = class PageAttributesPlugin {

	// Read all data-page-* attributes out of the <head> of the page and set them onto the page as page.attributes
	// This allows the attributes to be stored in the index which may be valuable for searching, or for use by
	// other plugins.
	processIndexPage(weaver, page, $page) {
		let attributes = {
			page: {},
            plugins: {}
		};

		// Read all attributes out of the page head
		$page('head').each(function () {
			getAllAttributes(this, attributes);
		});

		// Save the attributes onto the page so that they're stored in the index.
		page.attributes = attributes.page;
		page.pluginAttributes = attributes.plugins;
	}

	processLayout(weaver, page, $layout, $page) {

	    let omit = [];
	    let empty = [];

        $page('head').each(function () {
            getAttributesToHide(this, omit, empty);
        });

		$page('body').each(function () {
			injectAllPageAttributes($layout, this, page.attributes, omit, empty);
		});
	}
};
