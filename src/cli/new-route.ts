/**
 * Scaffold a new route directory with all the right files.
 *
 * Usage: claudeopt new route <name>
 *   claudeopt new route users         → routes/users/
 *   claudeopt new route users/[id]    → routes/users/[id]/
 *   claudeopt new route blog/[slug]   → routes/blog/[slug]/
 */

import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";

function capitalize(s: string): string {
  return s.replace(/[[\]]/g, "").replace(/(^|-)(\w)/g, (_, _2, c) => c.toUpperCase());
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

  // Determine relative depth to src/
  const depth = routePath.split("/").length;
  const srcPrefix = "../".repeat(depth + 1) + "src";

  // Always create page.tsx
  const hasLoader = options.loader !== false; // default true
  const hasAction = options.action ?? false;
  const hasSchema = options.schema ?? false;

  // page.tsx
  const pageImports: string[] = [];
  const pagePropsType = hasLoader
    ? `import type { Props } from "./loader.ts";\n`
    : "";
  const propsArg = hasLoader ? `props: Props` : "";

  if (hasAction) {
    pageImports.push(`import { Form } from "${srcPrefix}/components/Form.tsx";`);
  }

  await Bun.write(join(targetDir, "page.tsx"), `${pagePropsType}${pageImports.join("\n")}${pageImports.length ? "\n" : ""}
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

    await Bun.write(join(targetDir, "loader.ts"), `import type { ClaudeoptRequest } from "${srcPrefix}/types.ts";

export async function loader(req: ClaudeoptRequest) {
${loaderBody}
}

export type Props = Awaited<ReturnType<typeof loader>>;
`);
  }

  // action.ts
  if (hasAction) {
    await Bun.write(join(targetDir, "action.ts"), `import type { ClaudeoptRequest, ActionResult } from "${srcPrefix}/types.ts";

export async function action(req: ClaudeoptRequest): Promise<ActionResult> {
  const form = await req.formData();
  // TODO: process form data
  return { redirect: "/${routePath.replace(/\[.*?\]/g, "")}" };
}
`);
  }

  // schema.ts
  if (hasSchema) {
    const tableName = routePath.split("/").filter((s) => !s.startsWith("[")).pop() ?? "items";
    const typeName = capitalize(tableName.replace(/s$/, ""));

    await Bun.write(join(targetDir, "schema.ts"), `import { schema } from "${srcPrefix}/db/schema.ts";

interface ${typeName} {
  id: number;
  name: string;
  createdAt: string;
}

export const ${typeName} = schema<${typeName}>("${tableName}", {
  id: "integer primary key autoincrement",
  name: "text not null",
  createdAt: "text default current_timestamp",
});
`);
  }

  // Print what was created
  console.log(`\n  Created route: ${routePath}/`);
  console.log(`    ${routePath}/page.tsx`);
  if (hasLoader) console.log(`    ${routePath}/loader.ts`);
  if (hasAction) console.log(`    ${routePath}/action.ts`);
  if (hasSchema) console.log(`    ${routePath}/schema.ts`);
  console.log();
}
