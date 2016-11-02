'use strict';
// Based on node-restify by Mark Cavage
// See: https://github.com/mcavage/node-restify/blob/master/lib/dtrace.js

var ID = 0;
var MAX_INT = Math.pow(2, 32) - 1;

var PROBES = {
	// server_name, id, method, url, headers (json)
	'req-start': ['char *', 'int', 'char *', 'char *', 'json'],
	// server_name, id, status_code, headers (json)
	'req-end': ['char *', 'int', 'int', 'json'],
	// server_name, id, decision_id, decision_name
	'decision-start': ['char *', 'int', 'char *', 'char *'],
	// server_name, id, decision_id
	'decision-end': ['char *', 'int', 'char *'],
};
var PROVIDER;

module.exports = (function exportStaticProvider() {
	if (!PROVIDER) {
		try {
			var dtrace = require('dtrace-provider');
			PROVIDER = dtrace.createDTraceProvider('resource-machine');
		} catch (e) {
			PROVIDER = {
				fire: function () {},
				enable: function () {},
				addProbe: function () {
					var p = {
						fire: function () {}
					};
					return (p);
				},
				removeProbe: function () {},
				disable: function () {}
			};
		}
	}

	PROVIDER.easyFire = function easyFire(probeName, probeArgs) {
		PROVIDER._PROBES[probeName].fire(function () {
			return (probeArgs);
		});
	};

	PROVIDER._PROBES = {};

	Object.keys(PROBES).forEach(function (p) {
		var args = PROBES[p].splice(0);
		args.unshift(p);

		var probe = PROVIDER.addProbe.apply(PROVIDER, args);
		PROVIDER._PROBES[p] = probe;
	});

	PROVIDER.enable();

	PROVIDER.nextId = function nextId() {
		if (++ID >= MAX_INT) { ID = 1; }
		return (ID);
	};

	return (PROVIDER);
}());
