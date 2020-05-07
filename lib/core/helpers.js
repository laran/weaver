const _preface = 'Weaver: ';

module.exports._log = (msg, style) => {
	console.error(_preface + new Date().toISOString() + ': ' + (style ? style(msg) : msg));
};

module.exports._logDir = (msg, o, style) => {
	console.log(_preface + (style ? style(msg) : msg));
	console.dir(_preface + new Date().toISOString() + ': ' + + (style ? style(o) : o));
};

module.exports._error = (msg, style) => {
	console.error(_preface + new Date().toISOString() + ': ' + + (style ? style(msg) : msg));
};

module.exports._errorDir = (msg, o, style) => {
	console.error(_preface + (style ? style(msg) : msg));
	console.dir(_preface + new Date().toISOString() + ': ' + + (style ? style(o) : o));
};

// utility to map a string into an array
module.exports.attributeToArray = (stringValue) => {
	if (typeof stringValue === 'undefined' || stringValue.trim() === '') {
		return undefined;
	}

	return stringValue.split(' ')
		.map((value) => { return value.trim() }).filter((value) => value !== '');
};

// strip trailing slashes from a path
module.exports.stripTrailingSlash = (path) => {
	if (path.substring(path.length - 1) === '/') {
		path = path.substring(0, path.length - 1);
	}
	return path;
};
