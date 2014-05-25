# Example Server

## Resources

### simple.js

Simple resource that supports *html* and *json* output.

	curl -v "http://localhost:4040/simple" -H "Accept: application/json"
	curl -v "http://localhost:4040/simple" -H "Accept: text/html"
	curl -v "http://localhost:4040/simple" -H "Accept: text/xml"


### auth.js

Example of authentication and authorization in modules.
Will accept any username with the password 'god'.
Will allow that user access to his own profile but send 'forbidden' on other profiles

	curl -v "http://localhost:4040/auth/jongretar"
	curl -v "http://jongretar:god@localhost:4040/auth/jongretar"
	curl -v "http://jongretar:god@localhost:4040/auth/steve"

### repo_list.js && repo_items.js

Example of reusing resources using the context. This could easily be joined into a single resource module.

	curl -v "http://localhost:4040/repo/groups"
	curl -v "http://localhost:4040/repo/users/jon"
	curl -v "http://localhost:4040/repo/users" -X POST -H 'Content-Type: application/json' -d '{"name": "Holly Blackbeard"}'
	curl -v "http://localhost:4040/repo/users/stu" -X PUT -H 'Content-Type: application/json' -d '{"name": "Stuart Sexybody"}'
	curl -v "http://localhost:4040/repo/users/stu" -X DELETE

### static.js

Very basic static file server using streams to avoid buffering up the files.

### stream_transform.js

In this, more advanced, example we take more control of the request and respone objects to create a streaming JSON multiplier using [JSONStream](https://github.com/dominictarr/JSONStream). For each integer that appars in the array we send the same integer back multiplied by 2. This happens in a duplex streaming manner.

	curl -v "http://localhost:4040/stream_transform" -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' -d '[1,2,3,4,5,6,7,8,9,10]'

To see how this is is working use the example `slow_json.js` client that sends a 10 integer array as a body but waits 200ms between sending to the server each array element.

	node examples/demo/clients/slow_json.js
