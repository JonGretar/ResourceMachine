# Example Server

## Starting up

```sh
node --import tsx/esm examples/demo/server.ts | npx pino-pretty -S
```

## Resources

### simple.js

Simple resource that supports _html_ and _json_ output.

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
