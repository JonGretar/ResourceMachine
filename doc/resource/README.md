# Resource Handlers

## Basics

Resource functions all follow the pattern of being exported functions taking that attributes request, response and a callback.
The callback follows the standard err, result pattern of NodeJS.

```js
exports.serviceAvailable = function (req, res, cb) {
  if ( database.isConnected() === true ) {
    cb(null, true);
  } else {
    req.log.error({database_id: database.id}, 'Unable to open a connection to the database');
    cb(null, false);
  }
};
```

If you do not implement a function in your resource it will fall back to the default handlers response.

## Name

Adding a name to the resource handler can help with debugging and logging.

```js
exports.name = 'MyResource';
```

## Default Resource

*TODO: Explain how to change the default Resource.*
