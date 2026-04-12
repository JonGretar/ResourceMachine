import FindMyWay from "find-my-way";
import type { ResourceClass } from "./decision_core.js";

// Translate route syntax differences:
//   Old: /path/*splat  →  find-my-way: /path/*
//   Old: /path/:id     →  find-my-way: /path/:id  (unchanged)
// Optional segments (/path/(optional)?) are not supported by find-my-way;
// register two routes manually if needed.
function translatePath(path: string): string {
  return path.replace(/\*\w+/g, "*");
}

// No-op handler — we use find() not lookup(), so this is never called.
// The ResourceClass is stored in `store` and retrieved from FindResult.store.
function _noop(): void {}

export class Router {
  // Canonical map of path → ResourceClass, used to rebuild the trie when a
  // route is overwritten.  Overwriting a route is rare in production but
  // common in tests, where the helper re-registers '/' with a fresh class on
  // every reset().
  private routeMap = new Map<string, ResourceClass>();
  private fmw = this.buildFmw();

  addRoute(path: string, ResourceCtor: ResourceClass): void {
    const translated = translatePath(path);
    this.routeMap.set(translated, ResourceCtor);
    this.rebuild();
  }

  match(
    method: string,
    pathname: string,
  ): {
    ResourceCtor: ResourceClass;
    params: Record<string, string | undefined>;
  } | null {
    const result = this.fmw.find(method as FindMyWay.HTTPMethod, pathname);
    if (result === null) return null;
    return {
      ResourceCtor: result.store as ResourceClass,
      params: result.params,
    };
  }

  private rebuild(): void {
    this.fmw = this.buildFmw();
    for (const [path, ResourceCtor] of this.routeMap) {
      this.fmw.all(path, _noop, ResourceCtor);
    }
  }

  private buildFmw(): FindMyWay.Instance<FindMyWay.HTTPVersion.V1> {
    return FindMyWay({ ignoreTrailingSlash: true });
  }
}
