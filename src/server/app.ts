/**
 * Claudeopt application — wires together server, router, middleware, and SSR.
 */

import { resolve } from "path";
import { existsSync } from "fs";
import { serve } from "./http.ts";
import { scanRoutes } from "../router/scanner.ts";
import { matchRoute } from "../router/matcher.ts";
import { renderPage } from "../ssr/renderer.ts";
import { compose, loadMiddleware } from "../middleware/pipeline.ts";
import { routeNotFound } from "../errors.ts";
import { wrapInDocument } from "../ssr/document.ts";
import type { ClaudeoptConfig, ClaudeoptRequest, ClaudeoptResponse } from "../types.ts";

export async function createApp(config: ClaudeoptConfig = {}) {
  const projectRoot = resolve(".");
  const routesDir = resolve(config.routesDir ?? "routes");
  const pagesDir = resolve(config.pagesDir ?? "pages");

  // Scan routes
  const routes = await scanRoutes(routesDir, pagesDir);
  console.log(`  Found ${routes.length} route(s):`);
  for (const route of routes) {
    console.log(`    ${route.pattern} → ${route.pagePath}`);
  }

  // Sync database schemas
  const { syncSchemas } = await import("../db/migrate.ts");
  await syncSchemas(routes);

  return serve(async (req: ClaudeoptRequest, res: ClaudeoptResponse) => {
    // Serve static files from public/
    if (req.url.pathname.startsWith("/public/")) {
      const fileName = req.url.pathname.replace("/public/", "");
      const filePath = resolve(projectRoot, "public", fileName);
      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
    }

    // Serve client bundles
    if (req.url.pathname.startsWith("/static/")) {
      const clientDir = resolve(projectRoot, "dist/client");
      const fileName = req.url.pathname.replace("/static/", "");
      const filePath = resolve(clientDir, fileName);
      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath), {
          headers: { "Content-Type": "application/javascript", "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
    }

    // Match route
    const match = matchRoute(routes, req.url.pathname);

    if (!match) {
      const error = routeNotFound(req.url.pathname);
      console.warn(error.format());
      return res.status(404).html(
        wrapInDocument({ title: "404 Not Found", content: `<h1>404 Not Found</h1><p>${error.fix}</p>` }),
      );
    }

    req.params = match.params;

    // Middleware
    const middlewares = await loadMiddleware(projectRoot, match.route);
    const pipeline = compose(middlewares);

    return pipeline(req, res, async () => {
      const result = await renderPage(match.route, req);

      if (result.redirect) {
        return res.redirect(result.redirect);
      }
      if (result.error) {
        return res.status(500).html(result.html!);
      }
      return res.html(result.html!);
    });
  }, config);
}
