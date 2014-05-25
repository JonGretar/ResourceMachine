# Resource Machine

ResourceMachine is an attempt to bring to NodeJS the [HTTP Status diagram v3](mechanics/diagram.html) as used by [Webmachine](https://github.com/basho/webmachine/).

Although the Resource methods are mostly complete and locked in accordance with the diagram. Other things, such as request and response API may be subject to some changes as we get closer to *1.0.0*.

Streaming support is not yet supported but there will be a nice API for that soon.

## Quick Note

This documentation is still being written. Some chapters are still unclear and other are completely missing. 

## Minimum requirements

This version of Resource Machine currently depends on Harmony Generators as provided by Node.js 0.11.4+.

This is only because that this was the first method I could think of that allows me to traverse the decision tree without making the stack trace look insane.
Debuggability is important to me and having a usable stack trace is a strong requirement.

For further info and to comment please go to [the related issue](https://github.com/JonGretar/ResourceMachine/issues/1).

All help and suggestions are, as with everything, very welcome.

## Examples

For some basic examples check out http://github.com/JonGretar/ResourceMachine/tree/master/examples.

The Readme there will guide you on.

## Libraries

 Resource Machine has adapted code and found inspiration from the following libraries.

 * [Webmachine](https://github.com/basho/webmachine/) - The start of it all.
 * [Restify](http://mcavage.me/node-restify/) - Errors and checked the codebase a few times when I was stuck.
 * [Routes.js](https://github.com/aaronblohowiak/routes.js) - The routing library is based on their good work.
