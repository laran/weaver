module.exports = class AncestryPlugin {

	// derive parent/child/ancestor relations among pages
	processIndex(weaver) {

		let index = weaver.index;

		let rootAncestorStub = this.ancestorStubFor(index.pages['/']);

		Object.keys(index.pages).forEach((key) => {
			let page = index.pages[key];

			// Ancestors can be derived without looking at any other pages
			// So it can just be set directly right here.
			page.ancestors = [];

			if ('/' !== key && typeof rootAncestorStub !== 'undefined') {
				page.ancestors.push(rootAncestorStub);
			}

			// Split the page.key to correspond to where it lives in the folder hierarchy.
			let keySegments = page.key.split('/')
				.filter((frag) => {
					return '' !== frag;
				});

			// Build the page ancestroy
			let path = '/';
			for (let __i = 0; __i < keySegments.length - 1; __i++) {
				path += keySegments[__i] + '/';
				let ancestor = index.pages[path];
				if (ancestor) {
					// This if handles the case when a page exists at path /a/b/c.html, but either /index.html
					// or /a/b/index.html does not exist.
					// NOTE: Only the key, title and href are needed. The whole ancestor is not added in order
					// to prevent a recursive explosion within the index tree.
					page.ancestors.push(this.ancestorStubFor(ancestor));
				}
			}

			// Because children has to be built up cumulatively by traversing the set of all pages,
			// it should be initialized if it doesn't exist and left alone if it's already there.
			if (typeof page.children === 'undefined') {
				page.children = {};
			}

			// If the current page is a child ...
			if (keySegments.length >= 1) {

				// Determine the key of the parent page ...
				let parentKey = '/';
				for (let i = 0; i < keySegments.length - 1; i++) {
					parentKey += keySegments[i] + '/';
				}

				// ... and lookup the parent.
				let parent = index.pages[parentKey];

				// The parent will not exist when the directory containing the page does not contain an index.html file.
				// This is true recursively, so it applies for all parent directories up to the content root.
				//
				// For example, consider:
				//    /parent/child.html
				//
				// If /parent/index.html does not exist, there will be no page with key='/parent/'.
				// As a result, when processing /parent/child.html, the parent will be undefined.
				if (parent) {

					if (typeof parent.children === 'undefined') {
						parent.children = {};
					}

					// We only care about two things:
					// 1) What children (if any) exist?
					// 2) What is the title of each child
					parent.children[page.key] = this.childStubFor(page);
				}
			}
		});
	}

	ancestorStubFor(ancestor) {
		if (typeof ancestor === 'undefined') {
			return undefined;
		}
		return {key: ancestor.key, href: ancestor.href, attributes: {title: ancestor.attributes.title}}
	}

	childStubFor(child) {
		if (typeof child === 'undefined') {
			return undefined;
		}
		return {href: child.href, attributes: {title: child.attributes.title}}
	}
};