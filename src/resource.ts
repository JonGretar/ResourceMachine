import { PassThrough, type Readable, type Transform } from "node:stream";
import type { RMRequest } from "./request.js";
import type { RMResponse } from "./response.js";

export type BodyProvider = () => string | Buffer | Readable | Promise<string | Buffer | Readable>;

export class Resource {
  constructor(
    protected readonly req: RMRequest,
    protected readonly res: RMResponse,
  ) {}

  async serviceAvailable(): Promise<boolean> {
    return true;
  }
  async knownMethods(): Promise<string[]> {
    return ["GET", "HEAD", "POST", "PUT", "DELETE", "TRACE", "CONNECT", "OPTIONS"];
  }
  async uriTooLong(): Promise<boolean> {
    return false;
  }
  async allowedMethods(): Promise<string[]> {
    return ["GET", "HEAD"];
  }
  // Return undefined to trigger automatic MD5 validation, true/false to override
  async validateContentChecksum(): Promise<boolean | undefined> {
    return undefined;
  }
  async malformedRequest(): Promise<boolean> {
    return false;
  }
  // true = authorized; string = WWW-Authenticate header value (sends 401)
  async isAuthorized(): Promise<boolean | string> {
    return true;
  }
  async isForbidden(): Promise<boolean> {
    return false;
  }
  async validContentHeaders(): Promise<boolean> {
    return true;
  }
  async knownContentType(): Promise<boolean> {
    return true;
  }
  async validEntityLength(): Promise<boolean> {
    return true;
  }
  async options(): Promise<Record<string, string>> {
    return {};
  }
  async contentTypesProvided(): Promise<Record<string, BodyProvider>> {
    return {
      "application/json": () => JSON.stringify({ warning: "toJSON() falling back to default" }),
    };
  }
  async languageAvailable(): Promise<boolean> {
    return true;
  }
  async charsetsProvided(): Promise<Record<string, () => Transform> | undefined> {
    return undefined;
  }
  async encodingsProvided(): Promise<Record<string, () => Transform>> {
    return { identity: () => new PassThrough({ allowHalfOpen: false }) };
  }
  async variances(): Promise<string[]> {
    return [];
  }
  async resourceExists(): Promise<boolean> {
    return true;
  }
  async generateEtag(): Promise<string | undefined> {
    return undefined;
  }
  async lastModified(): Promise<Date | undefined> {
    return undefined;
  }
  async expires(): Promise<Date | undefined> {
    return undefined;
  }
  async multipleChoices(): Promise<boolean> {
    return false;
  }
  // Return a URL string to redirect, or false to continue
  async movedPermanently(): Promise<string | false> {
    return false;
  }
  async movedTemporarily(): Promise<string | false> {
    return false;
  }
  async previouslyExisted(): Promise<boolean> {
    return false;
  }
  async allowMissingPost(): Promise<boolean> {
    return false;
  }
  async postIsCreate(): Promise<boolean> {
    return false;
  }
  async createPath(): Promise<string | undefined> {
    return undefined;
  }
  // Return true on success, or a redirect URL string
  async processPost(): Promise<boolean | string> {
    return false;
  }
  async isConflict(): Promise<boolean> {
    return false;
  }
  // Map of content-type → handler function; handler returns true on success
  async contentTypesAccepted(): Promise<Record<string, () => boolean | Promise<boolean>>> {
    return {};
  }
  async deleteResource(): Promise<boolean> {
    return false;
  }
  async deleteCompleted(): Promise<boolean> {
    return true;
  }
  async finishRequest(): Promise<void> {
    return;
  }
}
