export default class PageProcessor {
	constructor(preProcessor, postProcessor) {
		this.preProcessor = preProcessor;
		this.postProcessor = postProcessor;
	}

	process(page, pageIndex) {
		if (page) {
			this.preProcessor(page, pageIndex);
			if (this.postProcessor) {
				this.postProcessor(page, pageIndex);
			}
		} else {
			console.log('Page is undefined');
		}
	}

}