'use strict';

module.exports = ResourceHelper;
function ResourceHelper(server) {
	this.server = server;
	this.resource = {};
	this.server.addRoute('/', this.resource);
	return this;
}

ResourceHelper.prototype.reset = function () {
	this.resource = {};
	this.server.addRoute('/', this.resource);
};

ResourceHelper.prototype.set = function (fun, err, resp) {
	this.resource[fun] = function testResponse(req, res, resume) {
		return resume(err, resp);
	};
	this.server.addRoute('/', this.resource);
};

ResourceHelper.prototype.setFunction = function (fun, cb) {
	this.resource[fun] = cb;
	this.server.addRoute('/', this.resource);
};
