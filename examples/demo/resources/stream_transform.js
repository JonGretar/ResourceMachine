'use strict';
var resource = require('../../../lib').resource;
var JSONStream = require('JSONStream');

exports.name = 'stream_transform';

exports.init = function (req, res, cb) {
	// We start by pausing the incoming stream.
	req.pause();
	cb(null);
};

exports.allowedMethods = resource.responseHelper(['POST']);

exports.processPost = function (req, res, cb) {
	// Create the JSON output stream
	var outStream = JSONStream.stringify('[\n  ', ',\n  ', '\n]\n');
	outStream.pause();

	req.on('data', function (data) {
		console.log("raw:" + data)
	})

	// Create a json stream parser
	var stream = JSONStream.parse('*');
	stream.on('data', function (data) {
		console.log("Received", data),
		outStream.write(data * 2);
	});
	stream.on('root', function () {
		console.log("ended")
		outStream.end();
	});

	// Pipe the request stream to the JSONStream
	req.pipe(stream);

	// Resume the request stream
	req.resume();

	// Set the body to the output stream
	res.setBody(outStream);
	cb(null, true);
};

exports.contentTypesProvided = function (req, res, cb) {
	cb(null, { 'application/json': 'toJSON'});
};
