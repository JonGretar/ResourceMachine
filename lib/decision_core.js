'use strict';

var util = require('util');
var suspend = require('suspend');

var tree = require('./decision_tree').v3.tree;
var debug = require('./debug');

module.exports.handleRequest = function handleRequest(req, res) {
	debug.reqStart(req, res);
	suspend.run(function* decisionLoop() {

		var decision = yield tree.start(req, res, suspend.resume());

		while (decision) {
			debug.decisionStart(req, res, decision);
			decision = yield decision(req, res, suspend.resume());
			debug.decisionEnd(req, res, decision);
			debug.traceDecision(req, res, decision);
		}

		// Ensure bodyStream has finished before closing up.
		if (res._bodyStream && !res._bodyStream._writableState.ended) {
			res._bodyStream.once('end', suspend(function* () {
				yield tree.finish(req, res, suspend.resume());
				res.end();
				debug.reqEnd(req, res);
				debug.traceEnd(req);
			}));
		} else {
			yield tree.finish(req, res, suspend.resume());
			res.end();
			debug.reqEnd(req, res);
			debug.traceEnd(req);
		}

	}, reqErrHandler);

	function reqErrHandler(err) {
		if (err && err.statusCode && util.isObject(err.body)) {
			res.writeHead(err.statusCode, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(err.body));
			req.error = err;
			debug.reqEnd(req, res);
			debug.traceEnd(req);
		} else if (err) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(err.stack || 'Unknown Error');
			req.error = err;
			debug.reqEnd(req, res);
			debug.traceEnd(req);
		}
	}
};
