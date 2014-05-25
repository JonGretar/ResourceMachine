'use strict';

var path = require('path');
var fs = require('fs');
var mime = require('mime');

exports.name = 'static';

exports.init = function (req, res, cb) {
	if (req.pathname === '/') { req.pathname = '/index.html'; }
	req.fullpath = path.join(req.context, req.pathname);
	cb(null);
};

exports.resourceExists = function (req, res, cb) {
	fs.exists(req.fullpath, function (exists) {
		cb(null, exists);
	});
};

exports.contentTypesProvided = function (req, res, cb) {
	var contentType = mime.lookup(req.fullpath);
	var contentTypesProvided = {};
	contentTypesProvided[contentType] = 'toAny';
	cb(null, contentTypesProvided);
};

exports.toAny = function (req, res, cb) {
	// TODO: Migrate to a streaming setup.
	var stream = fs.createReadStream(req.fullpath);
	fs.readFile(req.fullpath, function (err, data) {
		// cb(err, data.toString());
		cb(err, stream);
	});
};

exports.lastModified = function (req, res, cb) {
	fs.stat(req.fullpath, function (err, stat) {
		cb(err, stat.mtime);
	});
};
