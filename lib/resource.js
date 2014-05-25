'use strict';

var stream = require('stream');

module.exports.responseHelper = responseHelper;
function responseHelper(value) {
	return function response(req, res, cb) {
		cb(null, value);
	};
}


// TODO: Move this to the v3 decision tree folder
var defaultValues = {
	'init':                 true,
	'serviceAvailable':     true,
	'resourceExists':       true,
	'authRequired':         true,
	'isAuthorized':         true,
	'forbidden':            false,
	'allowMissingPost':     false,
	'malformedRequest':     false,
	'uriTooLong':           false,
	'knownContentType':     true,
	'validContentHeaders':  true,
	'validEntityLength':    true,
	'options':              {},
	'allowedMethods':       ['GET', 'HEAD'],
	'knownMethods':         ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS'],
	'contentTypesProvided': {'application/json': 'toJSON'},
	'toJSON':               '{"warning": ".toJSON() is falling back to default"}',
	'contentTypesAccepted': {},
	'deleteResource':       false,
	'deleteCompleted':      true,
	'postIsCreate':         false,
	'createPath':           undefined,
	'baseURI':              undefined,
	'processPost':          false,
	'languageAvailable':    true,
	'charsetsProvided':     undefined,
	'encodingsProvided':    {'identity': function () { return new stream.PassThrough(); }},
	'variances':            [],
	'isConflict':           false,
	'multipleChoices':      false,
	'previouslyExisted':    false,
	'movedPermanently':     false,
	'movedTemporarily':     false,
	'lastModified':         undefined,
	'expires':              undefined,
	'generateEtag':         undefined,
	'finishRequest':        true,
	'validateContentChecksum': undefined
};

var defaults = {};
Object.keys(defaultValues).forEach(function defaultIterator(key) {
	defaults[key] = responseHelper(defaultValues[key]);
});
module.exports.defaults = defaults;
