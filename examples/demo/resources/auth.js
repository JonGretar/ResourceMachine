'use strict';
exports.name = 'auth';

exports.isAuthorized = function (req, res, cb) {
	if (req.authorization && req.authorization.password === 'god') {
		cb(null, true);
	} else {
		cb(null, 'Secret Area');
	}
};

exports.forbidden = function (req, res, cb) {
	var authUser = req.authorization.username;
	if (authUser === req.params.user) {
		cb(null, false);
	} else {
		req.log.error('user ' + authUser + ' is trying to hack.');
		cb(null, true);
	}
};

exports.contentTypesProvided = function (req, res, cb) {
	cb(null, {'text/html': 'toHtml'});
};

exports.toHtml = function (req, res, cb) {
	cb(null, '<b>Hello ' + req.params.user + '</b>');
};
