'use strict';
var crypto = require('crypto');
var machine = require('../../../lib');
var resource = machine.resource;
var errors = machine.errors;

exports.allowedMethods =
	resource.responseHelper(['GET', 'HEAD', 'POST']);

exports.processPost = function (req, res, resume) {
	req.getBody(function (err, rawbody) {
		try {
			var body = JSON.parse(rawbody);
			if (body.name) {
				var id = body.id || crypto.randomBytes(2).toString('hex');
				var result = req.context.save(id, body);
				res.setBody(result);
				return resume(null, true);
			} else {
				return resume(new errors.BadRequestError('No name field'));
			}
		} catch (e) {
			return resume(new errors.BadRequestError('Invalid JSON'));
		}
	});
};

exports.contentTypesProvided = function contentTypesProvided(req, res, resume) {
	return resume(null, {'application/json': 'toJSON'});
};

exports.toJSON = function toJSON(req, res, resume) {
	req.log.info('toJSON has been called');
	var repo = req.context;
	return resume(null, repo.list());
};
