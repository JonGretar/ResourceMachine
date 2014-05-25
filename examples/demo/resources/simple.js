'use strict';

exports.name = 'simple';

exports.init = function (req, res, cb) {
	req.log.info('Call to "simple" has begun');
	req.enableTrace('/tmp');
	cb();
};

exports.allowedMethods = function (req, res, cb) {
	return cb(null, ['GET', 'HEAD', 'PUT']);
};

exports.contentTypesProvided = function (req, res, cb) {
	cb(null, {
		'text/html': 'toHTML',
		'application/json': 'toJSON'
	});
};

exports.toJSON = toJSON;
function toJSON(req, res, cb) {
	var data = {
		id: 123,
		title: 'Some blog post',
		published: true
	};
	cb(null, data);
}

exports.toHTML = function toHTML(req, res, cb) {
	toJSON(req, res, function (err, result) {
		var body = '<html><body><pre><code>';
		body += JSON.stringify(result);
		body += '</code></pre></body>';
		cb(null, body);
	});
};
