'use strict';

var data = {
	'admins': {id: 'admins', name: 'Administrator', timestamp: new Date('2011-01-01')},
	'user': {id: 'users', name: 'Users', timestamp: new Date('2012-06-01')}
};

exports.list = function () {
	var results = [];
	var keys = Object.keys(data);
	keys.forEach(function (key) {
		results.push(data[key]);
	});
	return results;
};

exports.get = function (id) {
	return data[id];
};

exports.save = function (id, value) {
	value.id = id;
	value.timestamp = new Date()
	data[id] = value;
	return value;
};

exports.remove = function (id) {
	delete data[id];
};
