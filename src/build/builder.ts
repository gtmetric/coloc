/**
 * Build system — bundles client-side JavaScript using Bun.build().
 */

import { resolve, relative } from "path";
import { existsSync, rmSync, mkdirSync } from "fs";
import type { BunPlugin } from "bun";
import { scanRoutes } from "../router/scanner.ts";

const preactCompatPlugin: BunPlugin = {
  name: "preact-compat",
  setup(build) {
    const preactCompat = require.resolve("preact/compat");
    build.onResolve({ filter: /^react$|^react-dom$/ }, () => ({ path: preactCompat }));
    build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: require.resolve("preact/jsx-runtime") }));
    build.onResolve({ filter: /^react-dom\/client$/ }, () => ({ path: preactCompat }));
  },
};

const PROJECT_ROOT = resolve(".");

function generateClientEntry(pagePath: string): string {
  const fromDir = resolve(PROJECT_ROOT, ".vibeframe/client-entries");
  const relToPage = relative(fromDir, pagePath);
  // Find hydrate.ts — either in local src/ (framework dev) or node_modules (installed)
  const localHydrate = resolve(PROJECT_ROOT, "src/client/hydrate.ts");
  const installedHydrate = resolve(PROJECT_ROOT, "node_modules/vibeframe/src/client/hydrate.ts");
  const hydratePath = existsSync(localHydrate) ? localHydrate : installedHydrate;
  const relToHydrate = relative(fromDir, hydratePath);

  return `import { hydrate } from "${relToHydrate}";
import Page from "${relToPage}";
hydrate(Page, document.getElementById("__vibeframe"));
`;
}

function toEntryName(pagePath: string, baseDir: string): string {
  return relative(baseDir, pagePath)
    .replace(/\.(tsx|ts|jsx|js)$/, "")
    .replace(/\//g, "_")
    .replace(/\[/g, "_")
    .replace(/\]/g, "_")
    .replace(/\.\.\./g, "rest");
}

export async function build() {
  const routesDir = resolve(PROJECT_ROOT, "routes");
  const pagesDir = resolve(PROJECT_ROOT, "pages");
  const outDir = resolve(PROJECT_ROOT, "dist/client");
  const entriesDir = resolve(PROJECT_ROOT, ".vibeframe/client-entries");

  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  if (existsSync(entriesDir)) rmSync(entriesDir, { recursive: true });
  mkdirSync(entriesDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  // Build Tailwind CSS if styles/app.css exists
  const stylesInput = resolve(PROJECT_ROOT, "styles/app.css");
  const stylesOutput = resolve(PROJECT_ROOT, "public/app.css");
  if (existsSync(stylesInput)) {
    mkdirSync(resolve(PROJECT_ROOT, "public"), { recursive: true });
    const tw = Bun.spawn(["bunx", "@tailwindcss/cli", "-i", stylesInput, "-o", stylesOutput, "--minify"], {
      cwd: PROJECT_ROOT,
      stdout: "ignore",
      stderr: "inherit",
    });
    await tw.exited;
    console.log("  Built Tailwind CSS");
  }

  const routes = await scanRoutes(routesDir, pagesDir);
  console.log(`  Building ${routes.length} page(s)...`);

  const entrypoints: string[] = [];
  const baseDir = existsSync(routesDir) ? routesDir : pagesDir;

  for (const route of routes) {
    const entryName = toEntryName(route.pagePath, baseDir);
    const entryContent = generateClientEntry(route.pagePath);
    const entryPath = resolve(entriesDir, `${entryName}.ts`);

    await Bun.write(entryPath, entryContent);
    entrypoints.push(entryPath);
  }

  const result = await Bun.build({
    entrypoints,
    outdir: outDir,
    format: "esm",
    target: "browser",
    splitting: true,
    minify: true,
    naming: "[name]-[hash].[ext]",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    plugins: [preactCompatPlugin],
  });

  if (!result.success) {
    console.error("  Build failed:");
    for (const log of result.logs) console.error(`    ${log}`);
    process.exit(1);
  }

  const manifest: Record<string, string> = {};
  for (const output of result.outputs) {
    if (output.kind === "entry-point") {
      const outputName = output.path.split("/").pop()!;
      manifest[outputName] = `/static/${outputName}`;
    }
  }

  await Bun.write(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`  Built ${result.outputs.length} file(s) to dist/client/`);
  return manifest;
}
