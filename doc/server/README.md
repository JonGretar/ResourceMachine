# Server


ResourceMachine is set up like most other nodejs server.
```js
var Machine = require('resource-machine');
var server Machine.createServer({name: 'mywebserver'});
server.addRoute('/user/user_id', require('./resource_module'));
server.listen(1337);
```

## Options

* **name:** Set the server name. (default: 'resource_machine')
* **log:** Set the bunyan log instance (default: A new bunyan log logging to console at level 'info')
