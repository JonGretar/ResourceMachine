'use strict';
/**
	These are some tests ported from the original WebMachine
	TODO: Add the request path checks.
*/

var crypto = require('crypto');
var supertest = require('supertest');
var bunyan = require('bunyan');

var machine = require('../../lib');
var error = require('../../lib/errors');
var ResourceHelper = require('../resource_helper');

var port;
function url(path) {
	return 'http://localhost:' + port + (path || '');
}

var request, resource, server = null;

var http10Methods = ['GET', 'POST', 'HEAD'];
var http11Methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS'];

describe('Webmachine Tests', function () {

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

	beforeEach(function () {
		resource.reset();
	});


	it('serviceAvailable', function (done) {
		resource.set('serviceAvailable', null, false);
		request.get('/')
			.expect(503, done);
	});

	it('internal_server_error', function (done) {
		resource.set('serviceAvailable', new error.InternalServerError());
		request.get('/')
			.expect(500, done);
	});

	it('not_implemented_b12', function (done) {
		resource.set('knownMethods', null, http10Methods);
		resource.set('allowedMethods', null, http10Methods);
		request.del('/')
			.expect(501, done);
	});

	it('uri_too_long_b11', function (done) {
		resource.set('uriTooLong', null, true);
		request.get('/')
			.expect(414, done);
	});

	it('unsupported_media_type_b5', function (done) {
		resource.set('knownContentType', null, false);
		request.get('/')
			.expect(415, done);
	});

	it('request_entity_too_large_b4', function (done) {
		resource.set('validEntityLength', null, false);
		request.get('/')
			.expect(413, done);
	});

	it('head_method_allowed', function (done) {
		resource.set('allowedMethods', null, ['GET', 'HEAD']);
		request.head('/')
			.expect(200, done);
	});

	it('head_method_not_allowed', function (done) {
		resource.set('allowedMethods', null, ['GET', 'POST', 'PUT']);
		request.head('/')
			.expect(405, done);
	});

	it('bad_request_b9', function (done) {
		resource.set('malformedRequest', null, true);
		request.get('/')
			.expect(400, done);
	});

	it('simple_get', function (done) {
		request.get('/')
			.expect(200, done);
	});

	it('not_acceptable_c4', function (done) {
		request.get('/')
			.set('Accept', 'video/mp4')
			.expect(406, done);
	});

	it('not_acceptable_d5_c4', function (done) {
		resource.set('contentTypesProvided', null, {'text/plain': 'toJSON'});
		resource.set('languageAvailable', null, false);
		request.get('/')
			.set('Accept', 'text/plain')
			.set('Accept-Language', 'x-pig-latin')
			.expect(406, done);
	});

	it('not_acceptable_d5_c3', function (done) {
		resource.set('contentTypesProvided', null, {'text/plain': 'toJSON'});
		resource.set('languageAvailable', null, false);
		request.get('/')
			.set('Accept-Language', 'x-pig-latin')
			.expect(406, done);
	});

	it('not_acceptable_e6_d5_c3', function (done) {
		resource.set('contentTypesProvided', null, {'text/plain': 'toJSON'});
		resource.set('languageAvailable', null, false);
		resource.set('charsetsProvided', null, {'utf-8': function (x) { return x; }});
		request.get('/')
			.set('Accept-Language', 'en-US')
			.set('Accept-Charset', 'ISO-8859-1')
			.expect(406, done);
	});

	it('not_acceptable_f7_e6_d5_c4', function (done) {
		resource.set('contentTypesProvided', null, {'text/plain': 'toText'});
		resource.set('toText', null, 'foo');
		resource.set('languageAvailable', null, true);
		resource.set('charsetsProvided', null, {'utf-8': function (x) { return x; }});
		resource.set('encodingsProvided', null, {});
		request.get('/')
			.set('Accept', 'text/plain')
			.set('Accept-Language', 'en-US')
			.set('Accept-Charset', 'utf-8')
			.set('Accept-Encoding', 'gzip')
			.expect(406, done);
	});

	// TODO: Why should this fail on the precondition?
	it('precond_fail_no_resource', function (done) {
		resource.set('resourceExists', null, false);
		request.get('/')
			.set('If-Match', '*')
			.expect(412, done);
	});

	it('precond_fail_g11', function (done) {
		resource.set('generate_etag', null, 'v2');
		request.get('/')
			.set('If-Match', '"v0", "v1"')
			.expect(412, done);
	});

	it('precond_fail_h12', function (done) {
		resource.set('lastModified', null, new Date('Wed, 20 Feb 2013 17:00:00 GMT'));
		request.get('/')
			.set('If-Unmodified-Since', 'Wed, 20 Feb 2013 10:00:00 GMT')
			.expect(412, done);
	});

	it('precond_fail_j18', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		request.put('/')
			.set('If-None-Match', '*')
			.expect(412, done);
	});

	it('precond_fail_j18_via_k13', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('generateEtag', null, 'v1');
		request.put('/')
			.set('If-Match', '"v1"')
			.set('If-None-Match', '"v1"')
			.set('If-Unmodified-Since', '{{INVALID DATE}}')
			.expect(412, done);
	});

	it('content_md5_valid_b9a', function (done) {
		var body = 'foo';
		var md5sum = crypto.createHash('md5').update(body).digest('Base64');
		resource.set('allowedMethods', null, http11Methods);
		resource.set('contentTypesAccepted', null, {'text/plain': 'fromText'});
		resource.set('fromText', null, true);
		request.put('/')
			.send(body)
			.set('Content-MD5', md5sum)
			.set('Content-Type', 'text/plain')
			.expect(204, done);
	});

	it('content_md5_valid_b9a_validated', function (done) {
		var body = 'foo';
		var md5sum = crypto.createHash('md5').update(body).digest('Base64');
		resource.set('allowedMethods', null, http11Methods);
		resource.set('contentTypesAccepted', null, {'text/plain': 'fromText'});
		resource.set('fromText', null, true);
		resource.set('validateContentChecksum', null, true);
		request.put('/')
			.send(body)
			.set('Content-MD5', md5sum)
			.set('Content-Type', 'text/plain')
			.expect(204, done);
	});

	it('content_md5_invalid_b9a', function (done) {
		var body = 'foo';
		var md5sum = crypto.createHash('md5').update('this is invalid for foo').digest('Base64');
		resource.set('allowedMethods', null, http11Methods);
		resource.set('contentTypesAccepted', null, {'text/plain': 'toText'});
		resource.set('toText', null, body);
		resource.set('validateContentChecksum', null, false);
		request.put('/')
			.send(body)
			.set('Content-MD5', md5sum)
			.set('Content-Type', 'text/plain')
			.expect(400, done);
	});

	it('content_md5_custom_inval_b9a', function (done) {
		var body = 'foo';
		var md5sum = crypto.createHash('md5').update('this is invalid for foo').digest('Base64');
		resource.set('allowedMethods', null, http11Methods);
		resource.set('contentTypesAccepted', null, {'text/plain': 'toText'});
		resource.set('toText', null, body);
		request.put('/')
			.send(body)
			.set('Content-MD5', md5sum)
			.set('Content-Type', 'text/plain')
			.expect(400, done);
	});

	it('authorized_b8', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('isAuthorized', null, 'Basic');
		request.get('/')
			.expect('www-authenticate', 'Basic')
			.expect(401, done);
	});

	it('forbidden_b7', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('forbidden', null, true);
		request.get('/')
			.expect(403, done);
	});

	it('options_b3', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		request.options('/')
			.expect(200, done);
	});

	it('variances_o18', function (done) {
		function identity(x) { return x; }
		var charsets = {
			'utf-8': identity,
			'iso-8859-5': identity,
			'unicode-1-1': identity
		};
		resource.set('allowedMethods', null, http11Methods);
		resource.set('charsetsProvided', null, charsets);
		request.get('/')
			.set('SetMe', '*')
			.expect(200, done);
		// TODO: Check on Vary
	});

	it('variances_o18_2', function (done) {
		function identity(x) { return x; }
		resource.setFunction('toWhatever', function (req, res, resume) {
			return resume(null, 'whatever');
		});
		var contentTypes = {
			'text/html': 'toWhatever',
			'text/plain': 'toWhatever'
		};
		var charsets = {
			'utf-8': identity
		};
		resource.set('allowedMethods', null, http11Methods);
		resource.set('contentTypesProvided', null, contentTypes);
		resource.set('charsetsProvided', null, charsets);
		// TODO: encodingsProvided = use_identity_or_gzip
		request.get('/')
			.expect(200, done);
		// TODO: Check on Vary
	});

	it('ok_o18b', function (done) {
		resource.set('allowedMethods', null, ['GET']);
		resource.set('generateEtag', null, 'v1');
		resource.set('lastModified', null, new Date('2010-01-01'));
		resource.set('expires', null, new Date('2020-01-01'));
		request.get('/')
			.expect(200, done);
		// TODO: What should we be testing here?
	});

	it('multiple_choices_o18', function (done) {
		function identity(x) { return x; }
		var charsets = {
			'utf-8': identity,
			'iso-8859-5': identity,
			'unicode-1-1': identity
		};
		resource.set('charsetsProvided', null, charsets);
		resource.set('multipleChoices', null, true);
		request.get('/')
			.expect(300, done);
	});

	it('moved_permanently_i4', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('movedPermanently', null, url('/newlocation'));
		request.put('/')
			.expect(301, done);
	});

	it('moved_permanently_k5', function (done) {
		resource.set('resourceExists', null, false);
		resource.set('previouslyExisted', null, true);
		resource.set('movedPermanently', null, url('/newlocation'));
		request.get('/')
			.expect(301, done);
		// TODO: We don't auto-follow right?
	});

	it('moved_temporarily_l5', function (done) {
		resource.set('resourceExists', null, false);
		resource.set('previouslyExisted', null, true);
		resource.set('movedTemporarily', null, url('/newlocation'));
		request.get('/')
			.expect(307, done);
		// TODO: We don't auto-follow right?
	});

	it('not_modified_j18', function (done) {
		request.get('/')
			.set('If-None-Match', '*')
			.expect(304, done);
	});

	it('not_modified_j18_via_k13', function (done) {
		resource.set('generateEtag', null, 'v1');
		request.get('/')
			.set('If-Match', '"v1"')
			.set('If-None-Match', '"v1"')
			.set('If-Unmodified-Since', '{{INVALID DATE}}')
			.expect(304, done);
	});

	it('not_modified_j18_via_h12', function (done) {
		var date = new Date('Wed, 20 Feb 2013 10:00:00 GMT');
		resource.set('lastModified', null, date);
		request.get('/')
			.set('If-Match', '*')
			.set('If-None-Match', '*')
			.set('If-Unmodified-Since', 'Wed, 20 Feb 2013 17:00:00 GMT')
			.expect(304, done);
	});

	it('not_modified_l17', function (done) {
		resource.set('lastModified', null, new Date('2012-01-01'));
		resource.set('expires', null, new Date('2020-01-01'));
		request.get('/')
			.set('If-Modified-Since', '2012-01-01')
			.expect(304, done);
	});

	it('see_other_n11', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('allowMissingPost', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		resource.setFunction('processPost', function (req, res, resume) {
			res.redirect = true;
			return resume(null, url('/new'));
		});
		request.post('/')
			.set('Content-Type', 'application/json')
			.expect(303, done);
	});

	it('internal_server_error_n11', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('allowMissingPost', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		resource.setFunction('processPost', function (req, res, resume) {
			res.redirect = true;
			return resume(null, true);
		});
		request.post('/')
			.set('Content-Type', 'application/json')
			.expect(500, done);
	});

	// TODO: implement see_other_n11_resource_calls tests.

	it('see_other_n5', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('allowMissingPost', null, true);
		resource.set('previouslyExisted', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		resource.setFunction('processPost', function (req, res, resume) {
			res.redirect = true;
			return resume(null, url('/new'));
		});
		request.post('/')
			.set('Content-Type', 'text/html')
			.expect(303, done);
	});

	it('not_found_l7', function (done) {
		resource.set('resourceExists', null, false);
		request.get('/')
			.expect(404, done);
	});

	it('not_found_m7', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		request.post('/')
			.set('Content-Type', 'application/json')
			.expect(404, done);
	});

	it('created_p11_post', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('allowMissingPost', null, true);
		resource.setFunction('processPost', function (req, res, resume) {
			res.setHeader('Location', url('/new1'));
			return resume(null, true);
		});
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		resource.set('fromJSON', null, true);
		request.post('/')
			.set('Content-Type', 'application/json')
			.expect(201, done);
	});

	it('created_p11_put', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.setFunction('isConflict', function (req, res, resume) {
			res.setHeader('Location', url('/new1'));
			return resume(null, false);
		});
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		resource.set('fromJSON', null, true);
		request.put('/')
			.set('Content-Type', 'application/json')
			.expect(201, done);
	});

	it('conflict_p3', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('isConflict', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		request.put('/')
			.set('Content-Type', 'application/json')
			.expect(409, done);
	});

	it('conflict_o14', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('isConflict', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		request.put('/')
			.set('Content-Type', 'application/json')
			.expect(409, done);
	});

	it('gone_m5', function (done) {
		resource.set('resourceExists', null, false);
		resource.set('previouslyExisted', null, true);
		request.get('/')
			.expect(410, done);
	});

	it('gone_n5', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('resourceExists', null, false);
		resource.set('previouslyExisted', null, true);
		resource.set('contentTypesAccepted', null, {'application/json': 'fromJSON'});
		request.post('/')
			.set('Content-Type', 'application/json')
			.expect(410, done);
	});

	it('accepted_m20', function (done) {
		resource.set('allowedMethods', null, http11Methods);
		resource.set('deleteResource', null, true);
		resource.set('deleteCompleted', null, false);
		request.del('/')
			.expect(202, done);
	});

});
