'use strict';

var data = {
	'jon': {id: 'jon', name: 'Jón Grétar', timestamp: new Date('1980-05-04')},
	'stu': {id: 'stu', name: 'Stuart Fiddlybody', timestamp: new Date('2001-02-03')}
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
