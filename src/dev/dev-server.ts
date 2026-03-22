/**
 * Claudeopt dev server with file watching, auto-reload, and on-the-fly client bundling.
 */

import { resolve, relative } from "path";
import { watch, existsSync, mkdirSync, rmSync } from "fs";
import { serve } from "../server/http.ts";
import { scanRoutes } from "../router/scanner.ts";
import { matchRoute } from "../router/matcher.ts";
import { renderPage } from "../ssr/renderer.ts";
import { compose, loadMiddleware } from "../middleware/pipeline.ts";
import { routeNotFound } from "../errors.ts";
import { wrapInDocument } from "../ssr/document.ts";
import { createSSEResponse, notifyReload, injectReloadScript } from "./hot-reload.ts";
import { validateRoutes, printValidation } from "../router/validator.ts";
import type { ClaudeoptRequest, ClaudeoptResponse } from "../types.ts";
import type { Route } from "../router/types.ts";

import type { BunPlugin } from "bun";

/** Bun plugin that aliases react → preact/compat so React libraries work */
const preactCompatPlugin: BunPlugin = {
  name: "preact-compat",
  setup(build) {
    const preactCompat = require.resolve("preact/compat");
    build.onResolve({ filter: /^react$|^react-dom$/ }, () => ({ path: preactCompat }));
    build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: require.resolve("preact/jsx-runtime") }));
    build.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: preactCompat }));
  },
};

const port = parseInt(process.env.PORT ?? "3000", 10);
const projectRoot = resolve(".");
const routesDir = resolve(projectRoot, "routes");
const pagesDir = resolve(projectRoot, "pages");
const clientDir = resolve(projectRoot, ".claudeopt/dev-client");

let version = 0;
let routes: Route[] = [];
let clientManifest: Record<string, string> = {};

async function rescanRoutes() {
  routes = await scanRoutes(routesDir, pagesDir);
  console.log(`  Re-scanned: ${routes.length} route(s)`);
}

/** Build client bundles for hydration in dev mode */
async function buildDevClient() {
  if (existsSync(clientDir)) rmSync(clientDir, { recursive: true });
  mkdirSync(clientDir, { recursive: true });

  const entriesDir = resolve(projectRoot, ".claudeopt/client-entries");
  if (existsSync(entriesDir)) rmSync(entriesDir, { recursive: true });
  mkdirSync(entriesDir, { recursive: true });

  const entrypoints: string[] = [];
  const baseDir = existsSync(routesDir) ? routesDir : pagesDir;

  for (const route of routes) {
    const entryName = relative(baseDir, route.pagePath)
      .replace(/\.(tsx|ts|jsx|js)$/, "")
      .replace(/\//g, "_")
      .replace(/\[/g, "_")
      .replace(/\]/g, "_");

    const relToHydrate = relative(entriesDir, resolve(projectRoot, "src/client/hydrate.ts"));
    const relToPage = relative(entriesDir, route.pagePath);

    const entryContent = `import { hydrate } from "${relToHydrate}";\nimport Page from "${relToPage}";\nhydrate(Page, document.getElementById("__claudeopt"));\n`;
    const entryPath = resolve(entriesDir, `${entryName}.ts`);
    await Bun.write(entryPath, entryContent);
    entrypoints.push(entryPath);
  }

  if (entrypoints.length === 0) return;

  const result = await Bun.build({
    entrypoints,
    outdir: clientDir,
    format: "esm",
    target: "browser",
    splitting: true,
    naming: "[name].[ext]",
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
    },
    plugins: [preactCompatPlugin],
  });

  if (!result.success) {
    console.error("  Dev client build failed");
    return;
  }

  // Build manifest
  clientManifest = {};
  for (const output of result.outputs) {
    if (output.kind === "entry-point") {
      const name = output.path.split("/").pop()!;
      clientManifest[name] = `/__claudeopt/client/${name}`;
    }
  }
}

await rescanRoutes();
console.log(`  Found ${routes.length} route(s):`);
for (const route of routes) {
  console.log(`    ${route.pattern} → ${relative(projectRoot, route.pagePath)}`);
}

const issues = await validateRoutes(routes, projectRoot);
printValidation(issues);

// Sync database schemas
const { syncSchemas } = await import("../db/migrate.ts");
await syncSchemas(routes);

// Build Tailwind CSS if styles/app.css exists
const stylesInput = resolve(projectRoot, "styles/app.css");
const stylesOutput = resolve(projectRoot, "public/app.css");
if (existsSync(stylesInput)) {
  const tw = Bun.spawn(["bunx", "@tailwindcss/cli", "-i", stylesInput, "-o", stylesOutput, "--minify"], {
    cwd: projectRoot,
    stdout: "ignore",
    stderr: "inherit",
  });
  await tw.exited;
  console.log("  Built Tailwind CSS");
}

// Build client bundles for hydration
await buildDevClient();
console.log(`  Built dev client (${Object.keys(clientManifest).length} entries)\n`);

serve(async (req: ClaudeoptRequest, res: ClaudeoptResponse) => {
  if (req.url.pathname === "/__claudeopt/reload") {
    return createSSEResponse();
  }

  // Serve static files from public/
  if (req.url.pathname.startsWith("/public/")) {
    const fileName = req.url.pathname.replace("/public/", "");
    const filePath = resolve(projectRoot, "public", fileName);
    if (existsSync(filePath)) {
      return new Response(Bun.file(filePath));
    }
  }

  // Serve dev client bundles
  if (req.url.pathname.startsWith("/__claudeopt/client/")) {
    const fileName = req.url.pathname.replace("/__claudeopt/client/", "");
    const filePath = resolve(clientDir, fileName);
    if (existsSync(filePath)) {
      return new Response(Bun.file(filePath), {
        headers: { "Content-Type": "application/javascript" },
      });
    }
  }

  const match = matchRoute(routes, req.url.pathname);

  if (!match) {
    const error = routeNotFound(req.url.pathname);
    return res.status(404).html(
      injectReloadScript(wrapInDocument({ title: "404", content: `<h1>404</h1><p>${error.fix}</p>` })),
    );
  }

  req.params = match.params;

  // Find client script for this page
  const baseDir = existsSync(routesDir) ? routesDir : pagesDir;
  const entryName = relative(baseDir, match.route.pagePath)
    .replace(/\.(tsx|ts|jsx|js)$/, "")
    .replace(/\//g, "_")
    .replace(/\[/g, "_")
    .replace(/\]/g, "_");

  const clientScripts: string[] = [];
  for (const [fileName, url] of Object.entries(clientManifest)) {
    if (fileName.startsWith(entryName + ".")) {
      clientScripts.push(url);
    }
  }

  const middlewares = await loadMiddleware(projectRoot, match.route);
  const pipeline = compose(middlewares);

  return pipeline(req, res, async () => {
    const result = await renderPage(match.route, req, clientScripts, version);

    if (result.redirect) {
      return res.redirect(result.redirect);
    }
    if (result.error) {
      return res.status(500).html(injectReloadScript(result.html!));
    }
    return res.html(injectReloadScript(result.html!));
  });
}, { port });

// File watching
console.log(`  Watching for changes...\n`);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleChange(filename: string | null) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    version++;
    console.log(`  [${new Date().toLocaleTimeString()}] Change detected${filename ? `: ${filename}` : ""} (v${version})`);
    await rescanRoutes();
    await buildDevClient();
    notifyReload();
  }, 100);
}

const watchDir = existsSync(routesDir) ? routesDir : pagesDir;
if (existsSync(watchDir)) {
  watch(watchDir, { recursive: true }, (_event, filename) => handleChange(filename as string));
}

try {
  watch(resolve(projectRoot, "middleware.ts"), () => handleChange("middleware.ts"));
} catch {}
