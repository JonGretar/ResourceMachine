'use strict';
var util = require('util');
var fs = require('fs');
var path = require('path');
var dtrace = require('./dtrace');

var decisionTitles = require('./decision_tree').v3.titles;

module.exports.reqStart = function (req, res) {
	dtrace.easyFire('req-start', [
		req.serverName,
		req.requestId,
		req.method,
		req.route,
		req.headers
	]);
	req.decisionTrace = [];
	req.decisionTraceResults = {};
	res.decisionTraceResults = {};
};

module.exports.reqEnd = function (req, res) {
	dtrace.easyFire('req-end', [
		req.serverName,
		req.requestId,
		res.statusCode,
		res._headers
	]);

	// FIXME: This whole thing is ugly as hell
	var lastDecision = req._decisionTrace.decisions[req._decisionTrace.decisions.length - 1];
	var payload = {
		url: req.url,
		statusCode: res.statusCode,
		lastDecision: lastDecision,
		error: req.error
	};
	if (res.statusCode >= 500) {
		req.log.error(payload, req.error ? req.error.name : 'Internal Server Error');
	} else if (res.statusCode >= 400 && req.error) {
		req.log.warn(payload, req.error ? req.error.name : 'Request Error');
	} else {
		req.log.info(payload, 'Successful request to ' + req.url);
	}
};

module.exports.decisionStart = function (req, res, decision) {
	req.currentDecision = decision.name;
	req.log.trace('Decision %s(%s)', decision.name, decisionTitles[decision.name]);
	dtrace.easyFire('decision-start', [
		req.serverName,
		req.requestId,
		decision.name,
		decisionTitles[decision.name]
	]);
	// FIXME: lets do something more fancy here.
	if (decision.name[0] === 'v') {
		req._decisionTrace.decisions.push(decision.name);
	}
};

module.exports.decisionEnd = function (req, res, decision) {
	if (!decision) { return false; }
	dtrace.easyFire('decision-end', [
		req.serverName,
		req.requestId,
		decision.name
	]);
};

module.exports.traceStart = function traceStart(req, res) {
	var fileDir = req._decisionTrace.traceDirectory;
	var name = req.resource.name || 'undefined';
	var timeStamp = (new Date()).toJSON();
	var requestId = req.requestId;
	var fileName = [name, timeStamp, requestId].join('_') + '.json';
	var traceFile = path.normalize(path.join(fileDir, fileName));
	var file = fs.createWriteStream(traceFile, {flags: 'w'});
	file.write('{');
	req._decisionTrace.writeStream = file;
};

module.exports.traceDecision = function traceDecision(req, res, decision) {
	if (req._decisionTrace.enabled) {
		var trace = '\n"' + decision.name + '": {';
		trace += '\n  "req": "' + util.inspect(req, {depth: 2})  + '",';
		trace += '\n  "res": "' + util.inspect(res, {depth: 2})  + '",';
		trace += '},';
		req._decisionTrace.writeStream.write(trace);
	}

};

module.exports.traceEnd = function traceEnd(req) {
	if (req.decisionTraceStream) {
		req._decisionTrace.writeStream.write('\n  "decisions": ' + JSON.stringify(req._decisionTrace.decisions) + ' }');
		req._decisionTrace.writeStream.end();
	}
};
