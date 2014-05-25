# Dispatching

Routes are added using the function `server.addRoute(path, module, [context]);`

## Attributes

### Path

A string that matches on incoming uri's using [routes.js](https://github.com/aaronblohowiak/routes.js) for it's routing table management.

req.params will hold any parameters defined in the uri and req.splats will hold the splats.

Basic string:

    "/articles" will only match routes that == "/articles".

Named parameters:

    "/articles/:title" will only match routes like "/articles/hello", but *not* "/articles/".

Optional named parameters:

    "/articles/:title?" will match "/articles/hello" AND "/articles/"

Periods before optional parameters are also optional:

    "/:n.:f?" will match "/1" and "/1.json"

Splats!:

    "/assets/*" will match "/assets/blah/blah/blah.png" and "/assets/".

    "/assets/*.*" will match "/assets/1/2/3.js" as splats: ["1/2/3", "js"]

Mix splat with named parameters:

    "/account/:id/assets/*" will match "/account/2/assets/folder.png" as req.params: {id: 2}, req.splats:["folder.png"]

Named RegExp:

    "/lang/:lang([a-z]{2})" will match "/lang/en" but not "/lang/12" or "/lang/eng"

Raw RegExp:

    /^\/(\d{2,3}-\d{2,3}-\d{4})\.(\w*)$/ (note no quotes, this is a RegExp, not a string.) will match "/123-22-1234.json". Each match group will be an entry in splats: ["123-22-1234", "json"]


Further info at [routes.js](https://github.com/aaronblohowiak/routes.js).


### Module

is a NodeJS module or an object that follows the [Resource](../resource/README.html) setup.

### Context

Optional value that will be passed forward to requests as req.context.
