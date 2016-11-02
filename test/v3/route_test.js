'use strict';

// var crypto = require('crypto');
var supertest = require('supertest');
var bunyan = require('bunyan');
var Stream = require('stream');

var machine = require('../../lib');
// var error = require('../../lib/errors');
var ResourceHelper = require('../resource_helper');

var port;
function url(path) {
	return 'http://localhost:' + port + (path || '');
}

var request, resource, server = null;


describe('Routing system', function () {

	before(function (done) {
		var log = bunyan.createLogger({name: 'testing', level: 'fatal'});
		server = machine.createServer({log: log});
		resource = new ResourceHelper(server);
		server.listen(0, function () {
			port = server.server.address().port;
			request = supertest(url());
			done();
		});
	});

	after(function (done) {
		server.close(done);
	});

	describe('GET requests', function () {

		it('should respond to basic string', function (done) {
			resource.server.addRoute('/basic', resource.resource);
			request.get('/basic')
				.expect(200, done);
		});

		it('should respond to named params', function (done) {
			resource.server.addRoute('/params/:myparam', resource.resource);
			request.get('/params/steve')
				.expect(200, done);
		});

		it('should respond to optional named params', function (done) {
			resource.server.addRoute('/optional_params/:myparam?', resource.resource);
			request.get('/optional_params')
				.expect(200, done);
		});

		it('should respond to splats', function (done) {
			resource.server.addRoute('/splat/*', resource.resource);
			request.get('/splat/who/is/this/steve')
				.expect(200, done);
		});

	});



});
