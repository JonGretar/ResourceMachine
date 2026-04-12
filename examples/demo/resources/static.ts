import { stat, createReadStream } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import mime from "mime";
import { Resource } from "../../../src/index.js";
import type { ResourceClass } from "../../../src/index.js";

const statAsync = promisify(stat);

export function createStaticResource(publicDir: string): ResourceClass {
  return class StaticResource extends Resource {
    private get fullpath(): string {
      const pathname = this.req.pathname === "/" ? "/index.html" : this.req.pathname;
      return path.join(publicDir, pathname);
    }

    override async resourceExists(): Promise<boolean> {
      try {
        await statAsync(this.fullpath);
        return true;
      } catch {
        return false;
      }
    }

    override async contentTypesProvided() {
      const contentType = mime.getType(this.fullpath) ?? "application/octet-stream";
      return {
        [contentType]: () => createReadStream(this.fullpath),
      };
    }

    override async lastModified(): Promise<Date | undefined> {
      const s = await statAsync(this.fullpath);
      return s.mtime;
    }
  };
}
