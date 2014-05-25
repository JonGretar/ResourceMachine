'use strict';
var url = require('url');
var Buffer = require('buffer').Buffer;
var Negotiator = require('negotiator');

var dtrace = require('./dtrace');
var debug = require('./debug');

// TODO: This is bad and needs some major changes.

module.exports = function extendRequest(server, req) {
	req.defaultResource = server.defaultResource;
	req.requestId = dtrace.nextId();

	req._decisionTrace = { enabled: false, decisions: [] };

	req._body = { finished: false, buffer: new Buffer(''), data: true };

	req.on('data', function reqData(chunk) {
		req._body.buffer = Buffer.concat([req._body.buffer, chunk]);
		req._body.data = true;
	});
	req.once('end', function () {
		req._body.finished = true;
	});

	req.getBody = function getBody(cb) {
		if (req._body.finished) {
			return cb(null, req._body.buffer);
		}
		req.once('end', function () {
			return cb(null, req._body.buffer);
		});
	};

	req.baseURI = function baseURI(path) {
		// TODO: Find what protocol is being used
		var uri = url.format({
			protocol: 'http',
			host: req.headers.host,
			pathname: path
		});
		return uri;
	};

	req.enableTrace = function enableTrace(dir) {
		// Todo: Ensure this is only run from start() function.
		req._decisionTrace.enabled = true;
		req._decisionTrace.traceDirectory = dir;
		debug.traceStart(req);
	};

	req.choices = {
		language: undefined,
		contentType: undefined,
		encoding: undefined,
		charset: undefined
	};

	var parsedURL = url.parse(req.url, true);
	req.query = parsedURL.query;
	req.search = parsedURL.search;
	req.pathname = parsedURL.pathname;

	req.negotiator = new Negotiator(req);

};
