import axios from "axios";
import {stripTrailingSlash} from "../../pages";

export default class PageCollection {

	_fetch(path, successHandler, errorHandler) {
		// This should not be restricted to HTML. This should support any format of content.
		axios
			.get(path, {responseType: 'text'})
			.then(function (response) {
				if (response) {
					successHandler(response.data);
				} else {
					console.debug('response is undefined.');
				}
			})
			.catch(function (response) {
				if (errorHandler) {
					errorHandler(response);
				}
			});
	};

	constructor(contentPath, indexPath, collectionName) {
		if (contentPath === null || typeof contentPath === 'undefined')
			throw "contentPath parameter is required";
		if (indexPath === null || typeof indexPath === 'undefined')
			throw "indexPath parameter is required";

		this.contentPath = stripTrailingSlash(contentPath);
		this.collectionPath = stripTrailingSlash(indexPath) + '/_index/' + collectionName;
		this.markdownProcessor = new MarkdownProcessor();
	}

	getPage(key, successHandler, pageIndexErrorHandler, pageContentErrorHandler) {
		return this._fetch(this.collectionPath + '/pages' + key + '.json', (pageIndex) => {
			this.getPageContent(key, pageIndex, successHandler, pageContentErrorHandler);
		}, pageIndexErrorHandler);
	};

	getPageContent(key, pageIndex, successHandler, errorHandler) {
		let location = this.contentPath + key + '.' + pageIndex.format;
		this._fetch(location, (response) => {
			if (response) {
				if (successHandler) {
					if (pageIndex.format.toLowerCase() === 'md') {
						response = this.markdownProcessor.process(response).html;
						// TODO should the MarkdownProcessor report come through here too?
					}
					successHandler(new Page(new DOMParser()
						.parseFromString(response, ContentTypes.HTML), key, pageIndex));
				} else {
					console.debug('successHandler is undefined');
				}
			} else {
				console.debug('Response was undefined');
			}
		}, (error) => {
			if (errorHandler) {
				errorHandler(error);
			} else {
				console.debug('errorHandler is undefined');
			}
		});
	}

	getTag(tag, successHandler, errorHandler) {
		this._fetch(this.collectionPath + '/tags/' + tag + '.json', successHandler, errorHandler);
	};

	getIndexOfPages(successHandler, errorHandler) {
		this._fetch(this.collectionPath + '/pages.json', successHandler , errorHandler);
	}

	getIndexOfTags(successHandler, errorHandler) {
		this._fetch(this.collectionPath + '/tags.json', successHandler , errorHandler);
	}
}
