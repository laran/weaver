const fs = require('fs-extra');
const path = require("path");
const cheerio = require('cheerio');

module.exports = class Builder {

	constructor(weaver) {
		this.weaver = weaver;
	}

	buildSite(callback) {

		// Clean the siteDir
		if (typeof this.weaver.siteDir !== 'undefined' && fs.existsSync(this.weaver.siteDir)) {
			fs.removeSync(this.weaver.siteDir);
		}

		// ensure that the siteDir exists before invoking beforeBuild plugins
		fs.mkdirpSync(this.weaver.siteDir);

		// Invoke beforeBuild plugins
		if (this.weaver.buildPlugins) {
			this.weaver.buildPlugins.forEach((plugin) => {
				if (typeof plugin.beforeBuild === 'function') {
					plugin.beforeBuild(this.weaver);
				}
			});
		}

		Object.keys(this.weaver.index.pages).forEach((key) => {
			let page = this.weaver.index.pages[key];

			// Construct the layout by assembling the layout and templates
			let layout = this.layout(page);

			// Apply layout plugins
			if (this.weaver.layoutPlugins) {
				this.weaver.layoutPlugins.forEach((plugin) => {
					if (typeof plugin.processLayout === 'function') {
						plugin.processLayout(this.weaver, page, layout.$layout, layout.$page);
					}
				});
			}

			// Save the fully rendered HTML to the build directory.
			this.save(page, layout.$layout.html());
		});

		// Copy all static files
		this.copyStaticFiles();

		// Invoke afterBuild plugins as the VERY last thing
		if (this.weaver.buildPlugins) {
			this.weaver.buildPlugins.forEach((plugin) => {
				if (typeof plugin.afterBuild === 'function') {
					plugin.afterBuild(this.weaver);
				}
			});
		}

		if (!!callback) {
			callback();
		}
	}

	layout(page) {
		// First inject templates into the page head and body elements
		let content = this.weaver.contentFor(page);
		let $page = cheerio.load(this.injectTemplates(content, page));

		// Apply before-template-injection page content plugins
		if (this.weaver.pageContentPlugins) {
			this.weaver.pageContentPlugins.forEach((plugin) => {
				if (typeof plugin.processPageContentBeforeTemplatesInjected === 'function') {
					plugin.processPageContentBeforeTemplatesInjected(this.weaver, page, $page);
				}
			});
		}

		// After pre-template plugins have processed the raw content, inject templates
		$page = cheerio.load(this.injectTemplates($page.html(), page));

		// Apply after-template-injection page content plugins
		if (this.weaver.pageContentPlugins) {
			this.weaver.pageContentPlugins.forEach((plugin) => {
				if (typeof plugin.processPageContentAfterTemplatesInjected === 'function') {
					plugin.processPageContentAfterTemplatesInjected(this.weaver, page, $page);
				}
			});
		}

		// Then inject templates and the body into the layout
		let layoutName = $page('head').data('layout') || 'default.html';
		let $layout = cheerio.load(
			this.injectTemplates(this.readLayoutFile(layoutName), page, $page));

		// Copy all children of the <head> element in the page to the <head> of the layout
		$page('head').children().each(function () {
			$layout('head').append($page(this));
		});

		// Inject the body into the layout
		$layout('*[data-page-body]').each(function () {
			$layout(this).replaceWith($page('body').html());
		});

		return {$layout: $layout, $page: $page};
	}

	openTagFor($, template) {
		let keys = Object.keys(template.attribs);
		return '<' + template.name + (keys.length > 0 ? ' ' : '') +
			keys.map((key) => {

				// omit data-template attributes
				if (key.startsWith('data-template')) {
					return '';
				}

				let str = key + '=';
				let val = template.attribs[key];
				if (val.indexOf('"') > -1) {
					str += "'" + val + "'";
				} else {
					str += '"' + val + '"';
				}
				return str;
			}).join(' ') + '>';
	}

	closeTagFor($, template) {
		return '</' + template.name + '>';
	}

	injectTemplates(content, page, $page, context=[], templateStack={names:{}, stack:[]}) {
		let that = this;
		let $ = cheerio.load(content);
		$('*[data-template]').each(function () {

			// Ensure that the template is not being called recursively
			let templateName = $(this).data('template');
			if(templateStack.names.hasOwnProperty(templateName)) {
				throw new Error('Templates cannot be called recursively.'
				+ `Template '${templateName}' is being called recursively. `
				+ `path=(${templateStack.stack.join(' -> ')} -> ${templateName})`)
			}

			// push the current template onto the stack
			templateStack.names[templateName] = true;
			templateStack.stack.push(templateName);

			// NOTE: 'wrap' and 'replace' are the two supported behaviors
			let behavior = ($(this).data('template-behavior') || 'replace').toLowerCase();
			context.push($);

			$(this).replaceWith(
				(behavior === 'wrap' ? that.openTagFor($, this) : '')
				+ that.injectTemplates(
					that.processTemplate(
						$(this).data('template'), page, $page, context), page, $page, context, templateStack)
				+ (behavior === 'wrap' ? that.closeTagFor($, this) : '')
			);

			context.pop();

			// pop the current template off the stack
			delete templateStack.names[templateName];
			templateStack.stack.pop();
		});

		return $.html();
	}

	read(prefix, relativePath, type) {
		let idot = relativePath.lastIndexOf('.');
		if (idot === -1) {
			throw new Error(`No file extension on ${type} '${relativePath}'. `
				+ 'Please include the file extension for the template file');
		}
		let extension = relativePath.substring(idot + 1);
		let reader = this.weaver.readers[extension];
		return reader.read(this.readFileInTheme(prefix + relativePath));
	}

	processTemplate(relativePath, page, $page, context = []) {
		let content = this.readTemplate(relativePath);
		let $ = cheerio.load(content);

		// Apply template plugins
		if (this.weaver.templatePlugins) {
			this.weaver.templatePlugins.forEach((plugin) => {
				if (typeof plugin.processTemplate === 'function') {
					plugin.processTemplate(this.weaver, page, $, $page, context);
				}
			});
		}

		return $.html();
	}

	readTemplate(relativePath) {
		return this.read('templates/', relativePath, 'template');
	}

	readLayoutFile(relativePath) {
		return this.read('layouts/', relativePath, 'layout');
	}

	// read the contents of the file relative to the theme
	readFileInTheme(filename) {
		return fs.readFileSync(
			path.resolve(__dirname, '../../../themes', this.weaver.theme || 'default', filename), 'utf8');
	}

	// Save all files under /weaver/themes/<theme>/static to /_site/_static/_theme
	// Save all files under /weaver/static to /_site/_static
	// If a folder named /weaver/static/_theme exists, when published, those files
	// should overwrite files deployed from /weaver/themes/<theme>/static
	copyStaticFiles() {
		if (!this.weaver.root
			|| !fs.existsSync(this.weaver.root)
			|| !fs.statSync(this.weaver.root).isDirectory()) {
			throw new Error('this.weaver.root does not point to a valid directory');
		}

		// this will be the output directory
		let _siteStaticPath =
			path.resolve(this.weaver.root, '_site', 'static');

		if (fs.existsSync(_siteStaticPath)) {
			fs.removeSync(_siteStaticPath);
		}
		fs.mkdirpSync(_siteStaticPath);

		let themesStaticPath =
			path.resolve(this.weaver.root, '../themes', this.weaver.theme || 'default', 'static');
		let staticPath = path.resolve(this.weaver.root, '../static');

		if (fs.existsSync(themesStaticPath)) {
			fs.copySync(themesStaticPath, _siteStaticPath);
		}

		if (fs.existsSync(staticPath)) {
			fs.copySync(staticPath, _siteStaticPath);
		}
	}

	save(page, renderedContent) {

		let layoutPath = this.weaver.pathToRenderedLayout(page);

		if (fs.existsSync(layoutPath)) {
			fs.unlinkSync(layoutPath);
		}

		// ensure that the directory exists for the page.
		// this is necessary for pages that have a '/' in the key.
		fs.mkdirpSync(layoutPath.substring(0, layoutPath.lastIndexOf('/')));

		// write the rendered content to disk
		fs.writeFileSync(layoutPath, renderedContent);
	}

};
