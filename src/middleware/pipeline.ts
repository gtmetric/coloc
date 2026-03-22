/**
 * Middleware composition — the onion model.
 */

import type { ClaudeoptRequest, ClaudeoptResponse } from "../types.ts";
import type { Middleware, NextFunction } from "./types.ts";

export function compose(middlewares: Middleware[]): Middleware {
  return async (req: ClaudeoptRequest, res: ClaudeoptResponse, finalNext: NextFunction): Promise<Response> => {
    let index = -1;

    async function dispatch(i: number): Promise<Response> {
      if (i <= index) throw new Error("next() called multiple times in the same middleware");
      index = i;

      if (i < middlewares.length) {
        return middlewares[i](req, res, () => dispatch(i + 1));
      }

      return finalNext();
    }

    return dispatch(0);
  };
}

export async function loadMiddleware(projectRoot: string, route: { middlewarePath: string | null }): Promise<Middleware[]> {
  const middlewares: Middleware[] = [];

  // Global middleware from project root
  const globalPath = `${projectRoot}/middleware.ts`;
  try {
    const mod = await import(globalPath);
    if (Array.isArray(mod.default)) {
      middlewares.push(...mod.default);
    } else if (typeof mod.default === "function") {
      middlewares.push(mod.default);
    }
  } catch {
    // No global middleware
  }

  // Route-level middleware
  if (route.middlewarePath) {
    try {
      const mod = await import(route.middlewarePath);
      if (Array.isArray(mod.default)) {
        middlewares.push(...mod.default);
      } else if (typeof mod.default === "function") {
        middlewares.push(mod.default);
      }
    } catch {
      // No route middleware
    }
  }

  return middlewares;
}
