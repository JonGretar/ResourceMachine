'use strict';
// TODO: This is bad and needs some major changes.

var util = require('util');

module.exports = function extendResponse(server, res) {

	res.setBody = function setBody(body) {
		if (typeof body === 'string') {
			res._bodyBuffer = body;
			res._bodyStream = undefined;
		} else if (Buffer.isBuffer(body)) {
			res._bodyBuffer = body;
			res._bodyStream = undefined;
		} else if (util.isObject(body) && body.readable) {
			res._bodyBuffer = undefined;
			body.pause();
			res._bodyStream = body;
		} else if (util.isArray(body) || util.isObject(body)) {
			res._bodyBuffer = JSON.stringify(body);
			res._bodyStream = undefined;
		}
	};

};
