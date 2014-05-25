'use strict';
var util = require('util');

var resource = require('../resource');
var error = require('../errors');

module.exports.findFunction = findFunction;
function findFunction(req, fun) {
	return req.resource[fun]        ||
	       req.defaultResource[fun]    ||
	       noSuchFunction;
	function noSuchFunction() {
		throw new Error('Function is undefined: ' + fun);
	}
}

module.exports.cbTruthy = cbTruthy;
function cbTruthy(trueAction, falseAction, resume, errorMessage) {
	errorMessage = errorMessage ? errorMessage : '';
	return function truthyCallback(err, resp) {
		if (err) { return resume(err); }

		if (resp === true && util.isFunction(trueAction)) {
			return resume(null, trueAction);
		} else if (resp === true && util.isString(trueAction)) {
			return resume(new error[trueAction](errorMessage));
		} else if (resp === false && util.isFunction(falseAction)) {
			return resume(null, falseAction);
		} else if (resp === false && util.isString(falseAction)) {
			return resume(new error[falseAction](errorMessage));
		}

		return resume(new Error('Unknown result from function: ' + resp));
	};
}

module.exports.cbTruthyFuns = cbTruthyFuns;
function cbTruthyFuns(trueAction, falseAction, resume) {
	return function truthyCallback(err, resp) {
		if (err) { return resume(err); }
		if (resp === true && util.isFunction(trueAction)) {
			return trueAction();
		} else if (resp === false && util.isFunction(falseAction)) {
			return falseAction();
		}
		return resume(new Error('Unknown result from function: ' + resp));
	};
}

module.exports.cbIsMember = cbIsMember;
function cbIsMember(next, ErrorType, item, resume) {
	return function isMemberCallback(err, resp) {
		if (err) { return resume(err); }
		if (resp && resp.indexOf(item) > -1) {
			return resume(null, next);
		} else if (util.isArray(resp)) {
			return resume(new ErrorType());
		}
		return resume(new Error('Unknown result from function: ' + resp));
	};
}
