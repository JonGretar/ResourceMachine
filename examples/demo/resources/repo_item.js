'use strict';
var resource = require('../../../lib').resource;
var errors = require('../../../lib').errors;

exports.allowedMethods =
	resource.responseHelper(['GET', 'HEAD', 'PUT', 'DELETE']);

exports.resourceExists = function (req, res, resume) {
	var repo = req.context;
	var id = req.params.id;
	if (repo.get(id)) {
		return resume(null, true);
	} else {
		return resume(null, false);
	}
};

// GET
exports.contentTypesProvided =
	resource.responseHelper({'application/json': 'toJSON'});

exports.toJSON = function toJSON(req, res, resume) {
	var repo = req.context;
	var id = req.params.id;
	return resume(null, repo.get(id));
};

// PUT
exports.contentTypesAccepted =
	resource.responseHelper({'application/json': 'fromJSON'});

exports.fromJSON = function (req, res, resume) {
	req.getBody(function (err, rawbody) {
		try {
			var body = JSON.parse(rawbody);
			var result = req.context.save(req.params.id, body);
			res.setBody(result);
			return resume(null, true);
		} catch (e) {
			return resume(new errors.BadRequestError('Invalid JSON'));
		}
	});
};

// DELETE
exports.deleteResource = function (req, res, resume) {
	req.context.remove(req.params.id);
	return resume(null, true);
};

exports.deleteCompleted = function (req, res, resume) {
	if (req.context.get(req.params.id)) {
		return resume(null, false);
	} else {
		return resume(null, true);
	}
};
