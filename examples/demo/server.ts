import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../../src/index.js";
import { SimpleResource } from "./resources/simple.js";
import { AuthResource } from "./resources/auth.js";
import { createRepoListResource } from "./resources/repo_list.js";
import { createRepoItemResource } from "./resources/repo_item.js";
import { createStaticResource } from "./resources/static.js";
import { groups, users } from "./repositories/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "./public");

const server = createServer({ name: "example_server" });

server.addRoute("/simple", SimpleResource);
server.addRoute("/auth/:user", AuthResource);

server.addRoute("/repo/groups", createRepoListResource(groups));
server.addRoute("/repo/users", createRepoListResource(users));
server.addRoute("/repo/groups/:id", createRepoItemResource(groups));
server.addRoute("/repo/users/:id", createRepoItemResource(users));

server.addRoute("/*", createStaticResource(publicDir));

await server.listen(4040);
console.log("Listening on http://localhost:4040");
