'use strict';

var Server = require('./server');
module.exports.resource = require('./resource');
module.exports.errors = require('./errors');

module.exports.createServer = function createServer(options) {
	return new Server(options);
};
