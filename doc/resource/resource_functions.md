# Resource Functions

## init

> This is the beginning of the request. You can use this to set things up or doing custom debugging and so on.


## serviceAvailable

> Returning false values will result in ServiceUnavailableError

 * **Accepted**: true, false
 * **Default**: true


## resourceExists

> Returning false values will result in 404 Not Found

 * **Accepted**: true, false
 * **Default**: true

## isAuthorized

> If this returns anything other than true, the response will be 401 Unauthorized. The String return value will be used as the value in the WWW-Authenticate header

 * **Accepted**: true, String,
 * **Default**: true


## forbidden

> If true it will respond with an 403 ForbiddenError

 * **Accepted**: true, false
 * **Default**: false


## allowMissingPost

> If the resource accepts POST requests to nonexistent resources, then this should return true.

 * **Accepted**: true, false
 * **Default**: false


## malformedRequest

> If true will respond with 400 BadRequestError

 * **Accepted**: true, false
 * **Default**: false


## uriTooLong

> If true responds with a 414 RequesturiTooLargeError

 * **Accepted**: true, false
 * **Default**: false


## knownContentType

> If false it respnds with 415 UnsupportedMediaTypeErro

 * **Accepted**: true, false
 * **Default**: true


## validContentHeaders

> if false will respond with 415 UnsupportedMediaTypeError(Invalid Content-* Headers)

 * **Accepted**: true, false
 * **Default**: true


## validEntityLength

> If false responds with 413 RequestEntityTooLargeError

 * **Accepted**: true, false
 * **Default**: true


## options

> If the OPTIONS method is supported and is used, the return value of this function is expected to be an object representing header names and values that should appear in the response.


 * **Accepted**: {HeaderKey: HeaderValue, ...}
 * **Default**: {}


## allowedMethods

> If a Method not in this list is requested, then a 405 Method Not Allowed will be sent. Note that these are all-caps and are atoms. (single-quoted)

 * **Accepted**: [...]
 * **Default**: ['GET', 'HEAD']


## contentTypesProvided

> This should return a object of the form {Mediatype: Handler} where Mediatype is a string of content-type format and the Handler is a string naming the function which can provide a resource representation in that media type. Content negotiation is driven by this return value. For example, if a client request includes an Accept header with a value that does not appear as a first element in any of the return tuples, then a 406 Not Acceptable will be sent.


 * **Accepted**: {ContentType: ResourceFunction,...}
 * **Default**: {'application/json': 'toJSON'}

## (toXXX)

>  body-producing function named as a Handler by contentTypesProvided.

 * **Accepted**: String, Buffer, ReadableStream

## contentTypesAccepted

> This is used similarly to contentTypesProvided, except that it is for incoming resource representations – for example, PUT requests. Handler functions usually want to use req.getBody(callback) to access the incoming request body.


 * **Accepted**: {ContentType: ResourceFunction,...}
 * **Default**: {}

## (fromXXX)

> POST-processing function named as a Handler by contentTypesAccepted.

* **Accepted**: true, false

## deleteResource

> This is called when a DELETE request should be enacted, and should return true if the deletion succeeded.

 * **Accepted**: true, false
 * **Default**: false


## deleteCompleted

> This is only called after a successful delete_resource call, and should return false if the deletion was accepted but cannot yet be guaranteed to have finished.


 * **Accepted**: true, false
 * **Default**: true


## postIsCreate

> If POST requests should be treated as a request to put content into a (potentially new) resource as opposed to being a generic submission for processing, then this function should return true. If it does return true, then *createPath* will be called and the rest of the request will be treated much like a PUT to the Path entry returned by that call.


 * **Accepted**: true, false
 * **Default**: false


## createPath

> This will be called on a POST request if postIsCreate returns true. It is an error for this function to not produce a Path if postIsCreate returns true. The Path returned should be a valid URI part following the dispatcher prefix. That Path will replace the previous one in the return value of wrq:disp_path(ReqData) for all subsequent resource function calls in the course of this request.


 * **Accepted**: String
 * **Default**: undefined

## processPost

> If postIsCreate returns false, then this will be called to process any POST requests. If it succeeds, it should return true.

* **Accepted**: true, false
* **Default**: false

## baseURI

> Override the BaseURI(http://myserver.com/). Used for POST Forwarding and others.

 * **Accepted**: undefined, String
 * **Default**: undefined


## languageAvailable

> If false will respond with 406 NotAcceptableError.

 * **Accepted**: true, false
 * **Default**: true


## charsetsProvided

> If this is anything other than undefined, it must be an object of of the form {Charset: Converter} where Charset is a string naming a charset and Converter is a  function in the resource which will be called on the produced body in a GET and ensure that it is in Charset. example: {'utf-8': function (x) { return charsetter.convert(x, 'utf8'); }}


 * **Accepted**: {Charset: function, ...}
 * **Default**: undefined


## encodingsProvided

> This must be a list of pairs where in each pair Encoding is a string naming a valid content encoding and Encoder is a function which will be called on the produced body in a GET and ensure that it is so encoded. One useful setting is to have the function check on method, and on GET requests return {'identity': function (x) { return x; }, 'gzip': function (x) { return gzip.zip(x); }} as this is all that is needed to support gzip content encoding.


 * **Accepted**: {Encoding: function, ...}
 * **Default**: {'identity': function (x, cb) { return cb(x); }}


## variances

> If this function is implemented, it should return a list of strings with header names that should be included in a given response’s Vary header. The standard conneg headers (Accept, Accept-Encoding, Accept-Charset, Accept-Language) do not need to be specified here as ResourceMachine will add the correct elements of those automatically depending on resource behavior.


 * **Accepted**: [...]
 * **Default**: []


## isConflict

> If this returns true, the client will receive a 409 Conflict.

 * **Accepted**: true, false
 * **Default**: false


## multipleChoices

> If this returns true, then it is assumed that multiple representations of the response are possible and a single one cannot be automatically chosen, so a 300 Multiple Choices will be sent instead of a 200.

 * **Accepted**: true, false
 * **Default**: false


## previouslyExisted

> If true says that the item being updated once existed. Forwards to moved* methods.

 * **Accepted**: true, false
 * **Default**: false


## movedPermanently

> If a string responds with 301 with the String as a Location header

 * **Accepted**: false, String
 * **Default**: false


## movedTemporarily

> If a string responds with 307 with the String as a Location header.

 * **Accepted**: false, String
 * **Default**: false


## lastModified

> If a date set the Last-Modified header to that value.

 * **Accepted**: undefined, Date()
 * **Default**: undefined


## expires

> If a date set the Expires header to that value.

 * **Accepted**: undefined, Date()
 * **Default**: undefined


## generateEtag

> If this returns a value, it will be used as the value of the ETag header and for comparison in conditional requests.

 * **Accepted**: undefined, String
 * **Default**: undefined


## validateContentChecksum

> If the Content-MD5 header and validateContentChecksum returns false responds with a 400 BadRequestError. if validateContentChecksum is unset a default md5 checksumming function is run.

 * **Accepted**: undefined, true, false
 * **Default**: undefined


## finish

> You can do some finalizing and cleanup here
