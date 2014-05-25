# Request

Request extends [http.IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage) with the following attributes and methods.

## Request Attributes

### req.context

> The arbitrary context as set by server.addRoute.

### req.query

> The URI query parameter

### req.params

> The matched route params

### req.splats

> The matched route params

### req.search

> The URI serch parameter

### req.pathname

> The URI Path

### req.language

> The chosen langage as negotiated by vXXX

### req.contentType

> The chosen content type as negotiated by vXXX

### req.encoding

> The chosen encoding as negotiated by vXXX

### req.charset

> The chosen charset as negotiated by vXXX


## Request Methods

### req.getBody(*cb*)

> Once the body has completed runs the callback with an error parameter and the incoming body as a Buffer.

### req.enableTrace(*directory*)

> **Warning. This badly affects performance**. Writes a detailed JSON file describing the request and all decisions into a file inside *directory*
