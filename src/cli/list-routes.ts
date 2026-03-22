/**
 * Route discovery — prints a table of all routes with their files.
 * Gives Claude Code instant context about the entire app.
 */

import { resolve, relative } from "path";
import { scanRoutes } from "../router/scanner.ts";
import { validateRoutes } from "../router/validator.ts";

export async function listRoutes() {
  const projectRoot = resolve(".");
  const routesDir = resolve(projectRoot, "routes");
  const pagesDir = resolve(projectRoot, "pages");

  const routes = await scanRoutes(routesDir, pagesDir);

  if (routes.length === 0) {
    console.log("\n  No routes found. Create one with: claudestack new route <name>\n");
    return;
  }

  console.log(`\n  Claudestack routes (${routes.length})\n`);
  const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - s.length));
  console.log(`  ${pad("Pattern", 20)} ${pad("Page", 32)} ${pad("Loader", 8)} ${pad("Action", 8)} Schema`);
  console.log("  " + "-".repeat(80));

  for (const route of routes) {
    console.log(
      `  ${pad(route.pattern, 20)} ${pad(relative(projectRoot, route.pagePath), 32)} ${pad(route.loaderPath ? "yes" : "-", 8)} ${pad(route.actionPath ? "yes" : "-", 8)} ${route.schemaPath ? "yes" : "-"}`,
    );
  }

  // Also run validation
  const issues = await validateRoutes(routes, projectRoot);
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");

  console.log();
  if (errors.length > 0) {
    console.log(`  ${errors.length} error(s):`);
    for (const issue of errors) {
      console.log(`    [ERROR] ${issue.route}: ${issue.message}`);
      console.log(`      Fix: ${issue.fix}`);
    }
  }
  if (warns.length > 0) {
    console.log(`  ${warns.length} warning(s):`);
    for (const issue of warns) {
      console.log(`    [WARN] ${issue.route}: ${issue.message}`);
    }
  }
  if (errors.length === 0 && warns.length === 0) {
    console.log("  All routes valid");
  }
  console.log();
}
