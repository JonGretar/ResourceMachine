import { randomBytes } from "node:crypto";
import { Resource, BadRequestError } from "../../../src/index.js";
import type { ResourceClass } from "../../../src/index.js";
import type { Repo } from "../repositories/index.js";

export function createRepoListResource(repo: Repo): ResourceClass {
  return class RepoListResource extends Resource {
    override async allowedMethods(): Promise<string[]> {
      return ["GET", "HEAD", "POST"];
    }

    override async processPost(): Promise<boolean | string> {
      const raw = await this.req.getBody();
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        throw new BadRequestError("Invalid JSON");
      }
      if (!body["name"]) throw new BadRequestError("No name field");
      const id = (body["id"] as string | undefined) ?? randomBytes(2).toString("hex");
      const result = repo.save(id, body);
      this.res.setBody(JSON.stringify(result));
      return true;
    }

    override async contentTypesProvided() {
      return {
        "application/json": () => {
          this.req.log.info("toJSON called");
          return JSON.stringify(repo.list());
        },
      };
    }
  };
}
