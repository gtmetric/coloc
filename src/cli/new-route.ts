/**
 * Scaffold a new route directory with all the right files.
 *
 * Usage: vibeframe new route <name>
 *   vibeframe new route users         → routes/users/
 *   vibeframe new route users/[id]    → routes/users/[id]/
 *   vibeframe new route blog/[slug]   → routes/blog/[slug]/
 */

import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";

function capitalize(s: string): string {
  return s.replace(/[[\]]/g, "").replace(/(^|-)(\w)/g, (_, _2, c) => c.toUpperCase());
}

/** Resolve vibeframe module path — works both in dev and installed contexts */
function vfImport(modulePath: string): string {
  const localPath = resolve("src", modulePath);
  if (existsSync(localPath)) {
    // Framework dev — use relative path to src/
    return null as any; // handled below
  }
  // Installed — use package imports
  return `vibeframe/${modulePath.replace(/\.ts$/, "")}`;
}

function getImportPrefix(): "local" | "package" {
  return existsSync(resolve("src/index.ts")) ? "local" : "package";
}

export async function newRoute(routePath: string, options: { loader?: boolean; action?: boolean; schema?: boolean } = {}) {
  const routesDir = resolve("routes");
  const targetDir = resolve(routesDir, routePath);

  if (existsSync(join(targetDir, "page.tsx"))) {
    console.error(`  Route already exists: ${routePath}`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });

  const componentName = capitalize(routePath.split("/").pop() ?? "Page") + "Page";
  const isDynamic = routePath.includes("[");
  const isLocal = getImportPrefix() === "local";
  const depth = routePath.split("/").length;
  const srcPrefix = "../".repeat(depth + 1) + "src";

  // Import paths differ between framework dev and installed package
  const typesImport = isLocal ? `${srcPrefix}/types.ts` : "vibeframe";
  const dbImport = isLocal ? `${srcPrefix}/db/database.ts` : "vibeframe";
  const schemaHelpersImport = isLocal ? `${srcPrefix}/db/schema.ts` : "vibeframe";
  const formImport = isLocal ? `${srcPrefix}/components/Form.tsx` : "vibeframe";

  const hasLoader = options.loader !== false;
  const hasAction = options.action ?? false;
  const hasSchema = options.schema ?? false;

  // page.tsx
  const pageImports: string[] = [];
  if (hasLoader) pageImports.push(`import type { Props } from "./loader.ts";`);
  if (hasAction) pageImports.push(`import { Form } from "${formImport}";`);
  const propsArg = hasLoader ? `props: Props` : "";

  await Bun.write(join(targetDir, "page.tsx"), `${pageImports.join("\n")}${pageImports.length ? "\n" : ""}
export default function ${componentName}(${propsArg}) {
  return (
    <div>
      <h1>${routePath}</h1>
      <a href="/">Back home</a>
    </div>
  );
}
`);

  // loader.ts
  if (hasLoader) {
    const loaderBody = isDynamic
      ? `  // Access route params via req.params\n  return { id: req.params.id };`
      : `  return { title: "${routePath}" };`;

    await Bun.write(join(targetDir, "loader.ts"), `export async function loader(req: any) {
${loaderBody}
}

export type Props = Awaited<ReturnType<typeof loader>>;
`);
  }

  // action.ts
  if (hasAction) {
    await Bun.write(join(targetDir, "action.ts"), `import { getDatabase } from "${dbImport}";

export async function action(req: any) {
  const form = await req.formData();
  // TODO: process form data
  return { redirect: "/${routePath.replace(/\[.*?\]/g, "")}" };
}
`);
  }

  // schema.ts
  if (hasSchema) {
    const tableName = routePath.split("/").filter((s) => !s.startsWith("[")).pop() ?? "items";

    await Bun.write(join(targetDir, "schema.ts"), `import { sqliteTable, text, integer } from "${schemaHelpersImport}";

export const ${tableName} = sqliteTable("${tableName}", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").default("current_timestamp"),
});
`);
  }

  console.log(`\n  Created route: ${routePath}/`);
  console.log(`    ${routePath}/page.tsx`);
  if (hasLoader) console.log(`    ${routePath}/loader.ts`);
  if (hasAction) console.log(`    ${routePath}/action.ts`);
  if (hasSchema) console.log(`    ${routePath}/schema.ts`);
  console.log();
}
