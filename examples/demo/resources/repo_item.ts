import { Resource, BadRequestError } from "../../../src/index.js";
import type { ResourceClass } from "../../../src/index.js";
import type { Repo } from "../repositories/index.js";

export function createRepoItemResource(repo: Repo): ResourceClass {
  return class RepoItemResource extends Resource {
    override async allowedMethods(): Promise<string[]> {
      return ["GET", "HEAD", "PUT", "DELETE"];
    }

    override async resourceExists(): Promise<boolean> {
      return repo.get(this.req.params["id"] ?? "") !== undefined;
    }

    override async contentTypesProvided() {
      return {
        "application/json": () => JSON.stringify(repo.get(this.req.params["id"] ?? "")),
      };
    }

    override async contentTypesAccepted() {
      return {
        "application/json": async () => {
          const raw = await this.req.getBody();
          let body: Record<string, unknown>;
          try {
            body = JSON.parse(raw.toString()) as Record<string, unknown>;
          } catch {
            throw new BadRequestError("Invalid JSON");
          }
          const result = repo.save(this.req.params["id"] ?? "", body);
          this.res.setBody(JSON.stringify(result));
          return true;
        },
      };
    }

    override async deleteResource(): Promise<boolean> {
      repo.remove(this.req.params["id"] ?? "");
      return true;
    }

    override async deleteCompleted(): Promise<boolean> {
      return repo.get(this.req.params["id"] ?? "") === undefined;
    }
  };
}
