const path = require('path');
const fs = require('fs-extra');

const ipc = require('node-ipc');
ipc.config.id = 'weaver';
ipc.config.retry = 1500;
ipc.config.silent = true;

const {_error, _log} = require("./helpers");

const configure = require('../../../configure');

const Indexer = require('./indexer');
const Builder = require('./builder');
const States = require('./states');

// Standard readers for different types of templates and content files
const MarkdownReader = require('./readers/markdown-reader');
const HtmlReader = require('./readers/html-reader');
const PugReader = require('./readers/pug-reader');
const LiquidReader = require('./readers/liquid-reader');

// Standard plugins
const AncestryPlugin = require('./plugins/ancestry-plugin');
const PageAttributesPlugin = require('./plugins/page-attributes-plugin');
const LinkCheckerPlugin = require('./plugins/linkchecker-plugin');
const PageDatesPlugin = require('./plugins/page-dates-plugin');
const SitemapPlugin = require('./plugins/sitemap-plugin');
const TagsPlugin = require('./plugins/tags-plugin');
const ContentHasherPlugin = require('./plugins/content-hasher-plugin');

module.exports = class Weaver {

	constructor(root, options = {}) {
		const that = this;

		this.root = root;
		this.contentDir = path.resolve(root, '../content');
		this.staticDir = path.resolve(root, '../static');
		this.indexDir = path.resolve(root, '_index');
		this.siteDir = path.resolve(root, '_site');

		this.stateFile = path.resolve(root, '.state');
		this.state = this.getState(true);

		// Use the 'default' theme by default.
		// This should be overridden in configure.js as needed.
		this.theme = 'default';

		this.indexer = new Indexer(this);
		this.builder = new Builder(this);

		// Define plugins that are used in multiple phases below
		let pageAttributesPlugin = new PageAttributesPlugin();

		// --- Load core plugins

		// NOTE: I realize that the syntax below is more complicated than simply initializing the plugin lists directly
		// NOTE: I wrote it this way to demonstrate use of use*Plugin(plugin) methods

		// --- Index plugins

		this.indexPlugins = [];

		// Add index plugins here in whatever order makes sense
		[
			pageAttributesPlugin,
            new PageDatesPlugin(),
			new AncestryPlugin(),
			new LinkCheckerPlugin(),
			new TagsPlugin(),
			new ContentHasherPlugin()
		].forEach((plugin) => {
			this.useIndexPlugin(plugin);
		});

		// --- Page content plugins

		// Add page content plugins
		this.pageContentPlugins = [];

		// Add page content plugins here in whatever order makes sense
		[
		].forEach((plugin) => {
			this.usePageContentPlugin(plugin);
		});

		// --- Template plugins

		this.templatePlugins = [];

		// Add template plugins here in whatever order makes sense
		[
		].forEach((plugin) => {
			this.useTemplatePlugin(plugin);
		});

		// --- Layout plugins

		this.layoutPlugins = [];

		// Add layout plugins here in whatever order makes sense
		[
			pageAttributesPlugin
		].forEach((plugin) => {
			this.useLayoutPlugin(plugin);
		});

		// --- Build plugins

		this.buildPlugins = [];

		// Add build plugins here in whatever order makes sense
		[
			new SitemapPlugin()
		].forEach((plugin) => {
			this.useBuildPlugin(plugin);
		});

		// initialize the core set of readers
		let markdownReader = new MarkdownReader();
		let pugReader = new PugReader();
		this.readers = {
			md: markdownReader,
			markdown: markdownReader,
			html: new HtmlReader(),
			pug: pugReader,
			jade: pugReader,
			liquid: new LiquidReader()
		};

		// initialize the index
		this.index = {
			pages: {},
			tags: {},
			updates: {}
		};

		// configure the build
		configure(this);

	}

	weave() {
		const that = this;

		// index all content and build the site
		that.setState(States.INDEXING);
		this.indexer.indexAllContent(() => {
			that.setState(States.BUILDING);
			this.builder.buildSite(() => {
				that.setState(States.READY);
			});
		});
	}

	setState(state) {
		this.state = state;
		_log('State is now ' + state);
		ipc.connectTo('weaver-server', () => {
			ipc.of['weaver-server'].on('connect', () => {
				ipc.of['weaver-server'].emit('weaver-state-change', state);
			});
		});
		this.state = state;
	}

	getState() {
		return this.state;
	}

	useTheme(name) {
		this.theme = name;
	}

	// plugins that operate on the index after it's constructed and before it is persisted
	useIndexPlugin(plugin) {
		this.indexPlugins.push(plugin);
	}

	// plugins that operate on the the layout AFTER all templates and page content are injected
	usePageContentPlugin(plugin) {
		this.pageContentPlugins.push(plugin);
	}

	// plugins that process each template when it's loaded and before the template is injected into the layout
	useTemplatePlugin(plugin) {
		this.templatePlugins.push(plugin);
	}

	// plugins that operate on the the layout AFTER all templates and page content are injected
	useLayoutPlugin(plugin) {
		this.layoutPlugins.push(plugin);
	}

	// plugins that operate on the index after it's constructed and before it is persisted
	useBuildPlugin(plugin) {
		this.buildPlugins.push(plugin);
	}

	// readers read/interpret/transform content stored in content files
	useReader(extension, reader) {
		// Give readers access to weaver
		extension.weaver = this;
		this.readers[extension] = reader;
	}

	pathToPageContent(page) {
		return this.contentDir + page.key + (page.key.endsWith('/') ? 'index' : '') + '.' + page.extension;
	}

	pathToPageIndex(page) {
		return this.indexDir + '/pages' + (page.key.endsWith('/') ? page.key + 'index' : page.key) + '.json';
	}

    pathToRenderedLayout(page) {
		// always render files to a .html extension
		return this.siteDir + page.href;
	}

	pathToStaticFile(relativePath) {
		return this.staticDir + '/' + relativePath;
	}

	// read the actual content for the page
	contentFor(page) {
		let reader = this.readers[page.extension];
		let pathToFile = this.pathToPageContent(page);

		let content = '';
		if (typeof reader.readFile !== 'undefined') {
			content = reader.readFile(pathToFile);
		} else {
			content = fs.readFileSync(pathToFile, 'utf8');
		}

		if (!reader) {
			throw new Error(`No reader for file extension '${page.extension}'`)
		} else if (typeof reader.read !== 'function') {
			throw new Error(`Reader for file extension '${page.extension}' has no read method`);
		}

		return reader.read(content);
	}

	// Recursively walk a directory and call callback() on each file path.
	walkSync(dir, rootPath, callback) {
		let files = fs.readdirSync(dir);

		let i;
		for (i = 0; i < files.length; i++) {
			let pathToFile = path.join(dir, files[i]);
			let isDirectory = fs.statSync(pathToFile).isDirectory();
			if (isDirectory) {
				this.walkSync(pathToFile, rootPath, callback);
			} else {
				callback(pathToFile);
			}
		}
	}

};
