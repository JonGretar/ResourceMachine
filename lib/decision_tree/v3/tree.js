'use strict';
var util = require('util');
var stream = require('stream');
var crypto = require('crypto');
var suspend = require('suspend');

var helper = require('../decision_helpers');
var error = require('../../errors');

module.exports.start = start;
module.exports.finish = finish;

// Initializing
function start(req, res, resume) {
	var fun = helper.findFunction(req, 'init');
	fun(req, res, function callback(err) {
		if (err) { return resume(err); }
		return resume(null, v3b13);
	});
}

// Service Available
function v3b13(req, res, resume) {
	var fun = helper.findFunction(req, 'serviceAvailable');
	var cb = helper.cbTruthy(v3b12, 'ServiceUnavailableError', resume);
	fun(req, res, cb);
}

// Known method?
function v3b12(req, res, resume) {
	var fun = helper.findFunction(req, 'knownMethods');
	var cb = helper.cbIsMember(v3b11, error.NotImplementedError, req.method, resume);
	fun(req, res, cb);
}

// URI too long?
function v3b11(req, res, resume) {
	var fun = helper.findFunction(req, 'uriTooLong');
	var cb = helper.cbTruthy('RequesturiTooLargeError', v3b10, resume);
	fun(req, res, cb);
}

// Method allowed?
function v3b10(req, res, resume) {
	var fun = helper.findFunction(req, 'allowedMethods');
	var cb = helper.cbIsMember(v3b9, error.MethodNotAllowedError, req.method, resume);
	fun(req, res, cb);
}

// Content-MD5 present?
function v3b9(req, res, resume) {
	if (req.headers['content-md5']) {
		return resume(null, v3b9a);
	} else {
		return resume(null, v3b9b);
	}
}
// Content-MD5 valid?
function v3b9a(req, res, resume) {
	var fun = helper.findFunction(req, 'validateContentChecksum');
	fun(req, res, function (err, resp) {
		if (err) { return resume(err); }
		if (resp === undefined) {
			req.getBody(function (err, body) {
				var md5sum = crypto.createHash('md5').update(body).digest('Base64');
				if (req.headers['content-md5'] === md5sum) {
					return resume(null, v3b9b);
				} else {
					return resume(new error.BadRequestError());
				}
			});
		} else if (resp === true) {
			return resume(null, v3b9b);
		} else if (resp === false) {
			return resume(new error.BadRequestError());
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// Malformed?
function v3b9b(req, res, resume) {
	var fun = helper.findFunction(req, 'malformedRequest');
	var cb = helper.cbTruthy('BadRequestError', v3b8, resume);
	fun(req, res, cb);
}


// Authorized?
function v3b8(req, res, resume) {
	// Let's decode the Authorization header for convinience.
	if (req.headers.authorization) {
		var split = req.headers.authorization.split(' ');
		if (split[0] === 'Basic' || split[0] === 'basic') {
			var decoded = new Buffer(split[1], 'base64').toString('utf8');
			var colon = decoded.indexOf(':');
			req.authorization = {
				type: 'Basic',
				username: decoded.substr(0, colon),
				password: decoded.substr(colon + 1)
			};
		} else {
			req.authorization = {
				type: split[0],
				value: split[1]
			};
		}
	}

	var fun = helper.findFunction(req, 'isAuthorized');
	fun(req, res, authCallback);

	function authCallback(err, resp) {
		if (err) { return resume(err); }

		if (resp === true) {
			return resume(null, v3b7);
		} else if (util.isString(resp)) {
			res.statusCode = 401;
			res.setHeader('WWW-Authenticate', resp);
			return resume(null, false);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	}
}

// Forbidden?
function v3b7(req, res, resume) {
	var fun = helper.findFunction(req, 'forbidden');
	var cb = helper.cbTruthy('ForbiddenError', v3b6, resume);
	fun(req, res, cb);
}

// Okay Content-* Headers?
function v3b6(req, res, resume) {
	var fun = helper.findFunction(req, 'validContentHeaders');
	var cb = helper.cbTruthy(v3b5, 'UnsupportedMediaTypeError', resume, 'Invalid Content-* Headers');
	fun(req, res, cb);
}

// Known Content-Type?
function v3b5(req, res, resume) {
	var fun = helper.findFunction(req, 'knownContentType');
	var cb = helper.cbTruthy(v3b4, 'UnsupportedMediaTypeError', resume);
	fun(req, res, cb);
}

// Req Entity Too Large?
function v3b4(req, res, resume) {
	var fun = helper.findFunction(req, 'validEntityLength');
	var cb = helper.cbTruthy(v3b3, 'RequestEntityTooLargeError', resume);
	fun(req, res, cb);
}

// OPTIONS?
function v3b3(req, res, resume) {
	if (req.method === 'OPTIONS') {
		var fun = helper.findFunction(req, 'options');
		fun(req, res, function (err, headers) {
			res.writeHead(200, headers);
			resume(err, false);
		});
	} else {
		resume(null, v3c3);
	}
}

// Accept exists?
function v3c3(req, res, resume) {
	if (!req.headers.accept) {
		var fun = helper.findFunction(req, 'contentTypesProvided');
		fun(req, res, function (err, contentTypeObject) {
			if (err) { return resume(err); }
			req.headers.accept = Object.keys(contentTypeObject)[0];
			return resume(null, v3c4);
		});
	} else {
		return resume(null, v3c4);
	}
}

// Acceptable media type available?
function v3c4(req, res, resume) {
	var fun = helper.findFunction(req, 'contentTypesProvided');
	fun(req, res, function (err, contentTypes) {
		if (err) { return resume(err); }
		req.contentTypesProvided = contentTypes;
		var matcher = req.negotiator.mediaTypes(Object.keys(contentTypes));
		if (matcher && matcher.length > 0) {
			req.choices.contentType = matcher[0];
			res.setHeader('Content-Type', req.choices.contentType);
			return resume(null, v3d4);
		} else {
			return resume(new error.NotAcceptableError('No acceptable media type'));
		}
	});
}

// Accept-Language exists?
function v3d4(req, res, resume) {
	if (req.headers['accept-language']) {
		resume(null, v3d5);
	} else {
		resume(null, v3e5);
	}
}

// Acceptable Language available?
function v3d5(req, res, resume) {
	var fun = helper.findFunction(req, 'languageAvailable');
	var cb = helper.cbTruthy(v3e5, 'NotAcceptableError', resume, 'Acceptable Language unavailable');
	// TODO: Set req.choices.language
	fun(req, res, cb);
}

// Accept-Charset exists?
function v3e5(req, res, resume) {
	if (req.headers['accept-charset']) {
		return resume(null, v3e6);
	} else {
		return resume(null, v3f6);
	}
}

// Acceptable Charset available?
function v3e6(req, res, resume) {
	var fun = helper.findFunction(req, 'charsetsProvided');
	fun(req, res, function (err, charsetsProvided) {
		if (err) { return resume(err); }
		if (charsetsProvided === undefined) {
			return resume(null, v3f6);
		} else if (util.isObject(charsetsProvided)) {
			req.charsetsProvided = charsetsProvided;
			var charsets = Object.keys(charsetsProvided);
			var charset = req.negotiator.charset(charsets);
			if (charset) {
				req.choices.charset = charset;
				var contentType = req.choices.contentType +
					'; charset:' + req.choices.charset;
				res.setHeader('Content-Type', contentType);
				return resume(null, v3f6);
			} else {
				return resume(new error.NotAcceptableError('No acceptable charset'));
			}
		} else {
			return resume(new Error('Unknown result from function: ' + charsetsProvided));
		}
	});
}

// Accept-Encoding exists?
function v3f6(req, res, resume) {
	if (req.headers['accept-encoding']) {
		return resume(null, v3f7);
	} else {
		return resume(null, v3g7);
	}
}

// Acceptable encoding available?
function v3f7(req, res, resume) {
	var fun = helper.findFunction(req, 'encodingsProvided');
	fun(req, res, function (err, encodingsProvided) {
		if (err) { return resume(err); }
		if (encodingsProvided === undefined) {
			return resume(null, v3g7);
		} else if (util.isObject(encodingsProvided)) {
			req.encodingsProvided = encodingsProvided;
			var encodings = Object.keys(encodingsProvided);
			var encoding = req.negotiator.encoding(encodings);
			if (encoding && encoding === 'idendity') {
				req.choices.encoding = encoding;
				return resume(null, v3g7);
			} else if (encoding) {
				req.choices.encoding = encoding;
				res.setHeader('Content-Encoding', encoding);
				return resume(null, v3g7);
			} else {
				return resume(new error.NotAcceptableError('No acceptable encoding'));
			}
		} else {
			return resume(new Error('Unknown result from function: ' + encodingsProvided));
		}
	});
}

// Resource exists?
function v3g7(req, res, resume) {

	// This is the first place after all conneg, so set Vary here
	var vary = [];
	if (req.contentTypesProvided && Object.keys(req.contentTypesProvided) > 1) {
		vary.concat(Object.keys(req.contentTypesProvided));
	}
	if (req.encodingsProvided && Object.keys(req.encodingsProvided) > 1) {
		vary.concat(Object.keys(req.encodingsProvided));
	}
	if (req.charsetsProvided && Object.keys(req.charsetsProvided) > 1) {
		vary.concat(Object.keys(req.charsetsProvided));
	}
	// FIXME: We are missing the resource call to 'variances'.
	if (vary) {
		res.setHeader('Vary', vary.join(', '));
	}

	var fun = helper.findFunction(req, 'resourceExists');
	var cb = helper.cbTruthy(v3g8, v3h7, resume);
	fun(req, res, cb);
}

// If-Match exists?
function v3g8(req, res, resume) {
	if (req.headers['if-match']) {
		return resume(null, v3g9);
	} else {
		return resume(null, v3h10);
	}
}

// If-Match: * exists
function v3g9(req, res, resume) {
	if (req.headers['if-match'].replace(/"/g, '') === '*') {
		return resume(null, v3h10);
	} else {
		return resume(null, v3g11);
	}
}

// ETag in If-Match
function v3g11(req, res, resume) {
	var fun = helper.findFunction(req, 'generateEtag');
	fun(req, res, function (err, etag) {
		var reqEtag = req.headers['if-match'].replace(/"/g, '');
		if (reqEtag === etag) {
			resume(null, v3h10);
		} else {
			resume(new error.PreconditionFailedError());
		}
	});
}

// If-Match exists
function v3h7(req, res, resume) {
	if (req.headers['if-match']) {
		return resume(new error.PreconditionFailedError());
	} else {
		return resume(null, v3i7);
	}
}

// If-unmodified-since exists?
function v3h10(req, res, resume) {
	if (req.headers['if-unmodified-since']) {
		return resume(null, v3h11);
	} else {
		return resume(null, v3i12);
	}
}

// I-UM-S is valid date?
function v3h11(req, res, resume) {
	var date = new Date(req.headers['if-unmodified-since']);
	if (isNaN(date)) {
		return resume(null, v3i12);
	} else {
		req.ifUnmodifiedSince = date;
		return resume(null, v3h12);
	}
}

// Last-Modified > I-UM-S?
function v3h12(req, res, resume) {
	var fun = helper.findFunction(req, 'lastModified');
	fun(req, res, function (err, date) {
		if (date.getTime() > req.ifUnmodifiedSince.getTime()) {
			return resume(new error.PreconditionFailedError());
		} else {
			return resume(null, v3i12);
		}
	});
}

// Moved permanently? (apply PUT to different URI)
function v3i4(req, res, resume) {
	var fun = helper.findFunction(req, 'movedPermanently');
	fun(req, res, function (err, resp) {
		if (typeof resp === 'string') {
			res.statusCode = 301;
			res.setHeader('Location', resp);
			return resume(null, false);
		} else if (resp === false) {
			return resume(null, v3p3);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// PUT?
function v3i7(req, res, resume) {
	if (req.method === 'PUT') {
		return resume(null, v3i4);
	} else {
		return resume(null, v3k7);
	}
}

// If-none-match exists?
function v3i12(req, res, resume) {
	if (req.headers['if-none-match']) {
		return resume(null, v3i13);
	} else {
		return resume(null, v3l13);
	}
}

// If-None-Match: * exists?
function v3i13(req, res, resume) {
	if (req.headers['if-none-match'].replace(/"/g, '') === '*') {
		return resume(null, v3j18);
	} else {
		return resume(null, v3k13);
	}
}

// GET or HEAD?
function v3j18(req, res, resume) {
	if (['GET', 'HEAD'].indexOf(req.method) > -1) {
		res.statusCode = 304;
		return resume(null, false);
	} else {
		return resume(new error.PreconditionFailedError());
	}
}

// Moved permanently?
function v3k5(req, res, resume) {
	var fun = helper.findFunction(req, 'movedPermanently');
	fun(req, res, function (err, resp) {
		if (err) { return resume(err); }
		if (typeof resp === 'string') {
			res.statusCode = 301;
			res.setHeader('Location', resp);
			return resume(null, false);
		} else if (resp === false) {
			return resume(null, v3l5);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// Previously existed?
function v3k7(req, res, resume) {
	var fun = helper.findFunction(req, 'previouslyExisted');
	var cb = helper.cbTruthy(v3k5, v3l7, resume);
	fun(req, res, cb);
}

// Etag in if-none-match?
function v3k13(req, res, resume) {
	var fun = helper.findFunction(req, 'generateEtag');
	fun(req, res, function (err, etag) {
		if (err) { return resume(err); }
		var reqEtag = req.headers['if-none-match'].replace(/"/g, '');
		if (reqEtag === etag) {
			return resume(null, v3j18);
		} else {
			return resume(null, v3l13);
		}
	});
}

// Moved temporarily?
function v3l5(req, res, resume) {
	var fun = helper.findFunction(req, 'movedTemporarily');
	fun(req, res, function (err, resp) {
		if (typeof resp === 'string') {
			res.statusCode = 307;
			res.setHeader('Location', resp);
			return resume(null, false);
		} else if (resp === false) {
			return resume(null, v3m5);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// POST?
function v3l7(req, res, resume) {
	if (req.method === 'POST') {
		return resume(null, v3m7);
	} else {
		return resume(new error.NotFoundError());
	}
}

// IMS exists?
function v3l13(req, res, resume) {
	if (req.headers['if-modified-since']) {
		return resume(null, v3l14);
	} else {
		return resume(null, v3m16);
	}
}

// IMS is valid date?
function v3l14(req, res, resume) {
	var date = new Date(req.headers['if-modified-since']);
	if (isNaN(date)) {
		return resume(null, v3m16);
	} else {
		req.ifModifiedSince = date;
		return resume(null, v3l15);
	}
}

// IMS > Now?
function v3l15(req, res, resume) {
	var date = new Date();
	if (date.getTime() > req.ifModifiedSince.getTime()) {
		return resume(null, v3l17);
	} else {
		return resume(null, v3m16);
	}
}

// Last-Modified > IMS?
function v3l17(req, res, resume) {
	var fun = helper.findFunction(req, 'lastModified');
	fun(req, res, function (err, date) {
		if (date.getTime() > req.ifModifiedSince.getTime()) {
			return resume(null, v3m16);
		} else if (!date) {
			return resume(null, v3m16);
		} else {
			res.statusCode = 304;
			return resume(null, false);
		}
	});
}

// POST?
function v3m5(req, res, resume) {
	if (req.method === 'POST') {
		return resume(null, v3n5);
	} else {
		return resume(new error.GoneError());
	}
}

// Server allows POST to missing resource?
function v3m7(req, res, resume) {
	var fun = helper.findFunction(req, 'allowMissingPost');
	var cb = helper.cbTruthy(v3n11, 'NotFoundError', resume);
	fun(req, res, cb);
}

// DELETE?
function v3m16(req, res, resume) {
	if (req.method === 'DELETE') {
		return resume(null, v3m20);
	} else {
		return resume(null, v3n16);
	}
}

// DELETE enacted immediately?
function v3m20(req, res, resume) {
	// DELETE may have body and TCP connection will be closed unless body is read.
	// See mochiweb_request:should_close.
	// maybe_flush_body_stream(),
	var fun = helper.findFunction(req, 'deleteResource');
	var cb = helper.cbTruthy(v3m20b, 'InternalServerError', resume);
	fun(req, res, cb);
}
function v3m20b(req, res, resume) {
	var fun = helper.findFunction(req, 'deleteCompleted');
	fun(req, res, function (err, resp) {
		if (err) { return resume(err); }
		if (resp === true) {
			return resume(null, v3o20);
		} else if (resp === false) {
			res.statusCode = 202;
			return resume(null, false);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// Server allows POST to missing resource?
function v3n5(req, res, resume) {
	var fun = helper.findFunction(req, 'allowMissingPost');
	var cb = helper.cbTruthy(v3n11, 'GoneError', resume);
	fun(req, res, cb);
}

// Redirect?
function v3n11(req, res, resume) {
	// TODO: Holy moly. We need to check this bastard a few times.

	// Stage 1
	var fun = helper.findFunction(req, 'postIsCreate');
	var cb = helper.cbTruthyFuns(function trueResponse() {

		var trueFun = helper.findFunction(req, 'createPath');
		trueFun(req, res, function trueCallback(err, resp) {
			if (err) { return resume(err); }
			if (resp === undefined) {
				return resume(new error.InternalServerError('postIsCreate w/o create_path'));
			} else if (util.isString(resp)) {
				// TODO: Make call to baseURI in resource.
				res.setHeader('Location', req.baseURI(resp));
				req.acceptHelperNext = v3n11ok;
				return resume(null, acceptHelper);
			} else {
				return resume(new error.InternalServerError('createPath not a string'));
			}
		});

	}, function falseResponse() {

		var falseFun = helper.findFunction(req, 'processPost');
		falseFun(req, res, function falseCallback(err, resp) {
			if (err) { return resume(err); }
			if (resp === true) {
				// encodeBodyIfSet(req, res);
				return resume(null, v3n11ok);
			} else if (util.isString(resp)) {
				// TODO: Make call to baseURI in resource.
				res.setHeader('Location', req.baseURI(resp));
				encodeBodyIfSet(req, res);
				return resume(null, v3n11ok);
			} else {
				return resume(new Error('Unknown result from function'));
			}
		});

	}, resume);
	fun(req, res, cb);
}
function v3n11ok(req, res, resume) {
	if (res.redirect) {
		if (res.getHeader('Location')) {
			res.statusCode = 303;
			resume(null, false);
		} else {
			resume(new error.InternalServerError('Res.redirect==true but no Location'));
		}
	} else {
		return resume(null, v3p11);
	}
}


// POST?
function v3n16(req, res, resume) {
	if (req.method === 'POST') {
		return resume(null, v3n11);
	} else {
		return resume(null, v3o16);
	}
}

// Conflict?
function v3o14(req, res, resume) {
	var fun = helper.findFunction(req, 'isConflict');
	var cb = helper.cbTruthy('ConflictError', acceptHelper, resume);
	fun(req, res, cb);
}

// PUT?
function v3o16(req, res, resume) {
	if (req.method === 'PUT') {
		return resume(null, v3o14);
	} else {
		return resume(null, v3o18);
	}
}

// Multiple representations?
// (also where body generation for GET and HEAD is done)
function v3o18(req, res, resume) {
	suspend.run(function* () {
		var buildBody = ['GET', 'HEAD'].indexOf(req.method) > -1;
		if (buildBody) {

			var etag = yield helper.findFunction(req, 'generateEtag')(req, res, suspend.resume());
			if (etag) { res.setHeader('ETag', etag); }

			var lastModified = yield helper.findFunction(req, 'lastModified')(req, res, suspend.resume());
			if (lastModified) { res.setHeader('Last-Modified', lastModified.toUTCString()); }

			var expires = yield helper.findFunction(req, 'expires')(req, res, suspend.resume());
			if (expires) { res.setHeader('Expires', expires.toUTCString()); }

			var bodyFun = req.contentTypesProvided[req.choices.contentType];
			var fun = helper.findFunction(req, bodyFun);
			fun(req, res, function (err, body) {
				if (err) { return resume(err); }
				res.setBody(body);
				encodeBody(req, res);
				return resume(null, v3o18b);
			});
		} else {
			encodeBodyIfSet(req, res);
			return resume(null, v3o18b);
		}
	});
}
function v3o18b(req, res, resume) {
	var fun = helper.findFunction(req, 'multipleChoices');
	fun(req, res, function (err, resp) {
		if (err) { return resume(err); }
		if (resp === false) {
			res.statusCode = 200;
			return resume(null, false);
		} else if (resp === true) {
			res.statusCode = 300;
			return resume(null, false);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// Response includes an entity?
function v3o20(req, res, resume) {
	if (res._bodyBuffer || res._bodyStream) {
		return resume(null, v3o18);
	} else {
		res.statusCode = 204;
		return resume(null, false);
	}
}

// Conflict?
function v3p3(req, res, resume) {
	// v3o18b
	var fun = helper.findFunction(req, 'isConflict');
	fun(req, res, function (err, resp) {
		if (err) { return resume(err); }
		if (resp === true) {
			res.writeHeader(409);
			return resume(null, false);
		} else if (resp === false) {
			return resume(null, acceptHelper);
		} else {
			return resume(new Error('Unknown result from function'));
		}
	});
}

// New resource?
function v3p11(req, res, resume) {
	var location = res.getHeader('Location');
	if (location) {
		res.statusCode = 201;
		return resume(null, false);
	} else {
		return resume(null, v3o20);
	}
}

// finish Request
function finish(req, res, resume) {
	var fun = helper.findFunction(req, 'finishRequest');
	fun(req, res, function (err) {
		if (err) { return resume(err); }
		return resume(null, false);
	});
}

function acceptHelper(req, res, resume) {
	var contentType = req.headers['content-type'] || 'application/octet-stream';
	var fun = helper.findFunction(req, 'contentTypesAccepted');
	fun(req, res, function (err, acceptedTypes) {
		if (!util.isObject(acceptedTypes)) { return resume(new error.InternalServerError()); }
		if (!acceptedTypes[contentType]) {
			var errorMessage = 'I don\'t accept content-type: ' + contentType;
			return resume(new error.UnsupportedMediaTypeError(errorMessage));
		}
		var acceptFun = helper.findFunction(req, acceptedTypes[contentType]);
		var cb = helper.cbTruthy(req.acceptHelperNext || v3p11, 'InternalServerError', resume);
		req.acceptHelperNext = undefined;
		acceptFun(req, res, cb);
	});
}

function encodeBodyIfSet(req, res) {
	if (res._bodyStream || res._bodyBuffer) {
		encodeBody(req, res);
	}
}

function encodeBody(req, res) {
	var charsetStream = req.choices.charset ?
		req.charsetsProvided[req.choices.charset]() :
		new stream.PassThrough({allowHalfOpen: false});

	var encodeStream = req.choices.encoding ?
		encodeStream = req.encodingsProvided[req.choices.encoding]() :
		new stream.PassThrough({allowHalfOpen: false});

	// If body is in the form of a Buffer then stream it through.
	if (res._bodyBuffer) {
		res._bodyStream = new stream.PassThrough({allowHalfOpen: false});
		res._bodyStream.pause();
		res._bodyStream.push(res._bodyBuffer);
		res._bodyStream.end();
	}

	res._bodyStream.pipe(charsetStream).pipe(encodeStream).pipe(res);
	res._bodyStream.resume();

}
