'use strict';

var Machine = require('../../lib');
var path = require('path');
var bunyan = require('bunyan');

// Set up a custom Bunyan logger.
var log = bunyan.createLogger({
	name: 'example_server',
	level: 'debug'
});

// Create a basic server
var server = Machine.createServer({
	name: 'example_server',
	version: '1.0.0',
	log: log
});

// Override a defaults resource method.
// This will be applied to all resources unless they provide their own.
server.defaultResource.finish = function (req, res, cb) {
	req.log.info('Hitting the overridden default finish().');
	cb(null);
};

// Set up the the demo routes.
var simple = require('./resources/simple');
server.addRoute('/simple', simple);

var auth = require('./resources/auth');
server.addRoute('/auth/:user', auth);

var repos = require('./repositories');
var repoList = require('./resources/repo_list');
var repoItem = require('./resources/repo_item');
server.addRoute('/repo/groups', repoList, repos.groups);
server.addRoute('/repo/users', repoList, repos.users);
server.addRoute('/repo/groups/:id', repoItem, repos.groups);
server.addRoute('/repo/users/:id', repoItem, repos.users);

var streamTransform = require('./resources/stream_transform');
server.addRoute('/stream_transform', streamTransform);


// Static Handler for everything else
var publicDir = path.resolve(__dirname, './public');
server.addRoute('*', require('./resources/static'), publicDir);

// Standard listening thingy.
server.listen(4040);
