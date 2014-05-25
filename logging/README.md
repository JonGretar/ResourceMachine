# Logging

ResourceMachine uses Bunyan for it's logging architecture.
It's default setting is to log out at level `info` to STDOUT.
To set up your own logging you can create your own bunyan instance and set into the `log` settings on create Server.

```
var Bunyan = require('bunyan');
var ResourceMachine = require('resource_machine');

var log = Bunyan.createLogger({
	name: 'myserver'
});

var server = ResourceMachine.createServer({
	log: log
});
server.listen(1337);
```
