'use strict';
var http = require('http');
var JSONStream = require('JSONStream');

var reqOpts = {
	hostname: 'localhost',
	port: 4040,
	path: '/stream_transform',
	method: 'POST',
	headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
};

var req = http.request(reqOpts);

req.on('response', function (res) {

	res.on('data', function (data) {
		console.log("raw:" + data)
	})

	var stream = JSONStream.parse('*');
	stream.on('data', function (data) {
		console.log('Received new array element: ' + data);
	});
	stream.on('end', function () {
		console.log('Finished');
	});
	res.pipe(stream);
});

var transmitter = JSONStream.stringify();
transmitter.pipe(req);

var x = 1;

function sendLoop() {
	if (x > 10) {
		return transmitter.end();
	}
	transmitter.write(x);
	console.log('Sent array element:', x);
	x++;
	setTimeout(sendLoop, 200);
}
sendLoop();
