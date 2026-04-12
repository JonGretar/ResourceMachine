import { Resource } from "../../../src/index.js";
import type { RMRequest } from "../../../src/index.js";
import type { RMResponse } from "../../../src/index.js";

export class SimpleResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
    req.log.info('Call to "simple" has begun');
    req.enableTrace("/tmp");
  }

  override async allowedMethods(): Promise<string[]> {
    return ["GET", "HEAD", "PUT"];
  }

  override async contentTypesProvided() {
    return {
      "text/html": () => this.toHTML(),
      "application/json": () => this.toJSON(),
    };
  }

  private toJSON(): string {
    return JSON.stringify({ id: 123, title: "Some blog post", published: true });
  }

  private toHTML(): string {
    const json = this.toJSON();
    return `<html><body><pre><code>${json}</code></pre></body></html>`;
  }
}
