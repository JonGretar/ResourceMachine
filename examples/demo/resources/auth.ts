import { Resource } from "../../../src/index.js";

export class AuthResource extends Resource {
  override async isAuthorized(): Promise<boolean | string> {
    if (this.req.authorization?.password === "god") return true;
    return 'Basic realm="Secret Area"';
  }

  override async isForbidden(): Promise<boolean> {
    const authUser = this.req.authorization?.username;
    const targetUser = this.req.params["user"];
    if (authUser === targetUser) return false;
    this.req.log.error({ authUser, targetUser }, "forbidden access attempt");
    return true;
  }

  override async contentTypesProvided() {
    return {
      "text/html": () => `<b>Hello ${this.req.params["user"]}</b>`,
    };
  }
}
