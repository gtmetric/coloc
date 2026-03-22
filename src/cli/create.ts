/**
 * vibeframe create <project-name>
 *
 * Scaffolds a new Vibeframe project with:
 *   - package.json (with vibeframe + preact as dependencies)
 *   - tsconfig.json (jsx configured for preact)
 *   - routes/index/page.tsx (home page)
 *   - routes/counter/page.tsx (interactive demo)
 *   - middleware.ts (request logging)
 *   - CLAUDE.md (conventions for AI-assisted development)
 *   - .claude/launch.json (dev server config)
 *   - .gitignore
 */

import { resolve, join } from "path";
import { existsSync, mkdirSync } from "fs";

export async function createProject(name: string) {
  const projectDir = resolve(name);

  if (existsSync(projectDir)) {
    console.error(`\n  Directory "${name}" already exists.\n`);
    process.exit(1);
  }

  console.log(`\n  Creating Vibeframe project: ${name}\n`);

  // Create directories
  const dirs = [
    "",
    "routes/index",
    "routes/counter",
    "styles",
    "public",
    ".claude",
  ];
  for (const dir of dirs) {
    mkdirSync(join(projectDir, dir), { recursive: true });
  }

  // package.json
  await Bun.write(join(projectDir, "package.json"), JSON.stringify({
    name,
    version: "0.0.1",
    type: "module",
    scripts: {
      dev: "bun run node_modules/vibeframe/src/dev/dev-server.ts",
      build: "bun run node_modules/vibeframe/src/cli/index.ts build",
      start: "bun run node_modules/vibeframe/src/cli/index.ts start",
      routes: "bun run node_modules/vibeframe/bin/vibeframe.ts routes",
    },
    dependencies: {
      vibeframe: "latest",
      preact: "^10.29.0",
      tailwindcss: "^4.0.0",
      "@tailwindcss/cli": "^4.0.0",
    },
    devDependencies: {
      "@types/bun": "latest",
    },
  }, null, 2) + "\n");

  // tsconfig.json
  await Bun.write(join(projectDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      jsx: "react-jsx",
      jsxImportSource: "preact",
      types: ["bun-types"],
      paths: {
        "react": ["./node_modules/preact/compat/"],
        "react-dom": ["./node_modules/preact/compat/"],
        "react/jsx-runtime": ["./node_modules/preact/jsx-runtime/"],
      },
    },
    include: ["routes/**/*.ts", "routes/**/*.tsx", "middleware.ts"],
    exclude: ["node_modules", "dist"],
  }, null, 2) + "\n");

  // .gitignore
  await Bun.write(join(projectDir, ".gitignore"), `node_modules/
dist/
.vibeframe/
data/
*.log
`);

  // .claude/launch.json
  await Bun.write(join(projectDir, ".claude/launch.json"), JSON.stringify({
    version: "0.0.1",
    configurations: [{
      name: "vibeframe-dev",
      runtimeExecutable: "bun",
      runtimeArgs: ["run", "dev"],
      port: 3000,
    }],
  }, null, 2) + "\n");

  // styles/app.css
  await Bun.write(join(projectDir, "styles/app.css"), `@import "tailwindcss";
`);

  // routes/index/page.tsx
  await Bun.write(join(projectDir, "routes/index/page.tsx"), `export default function HomePage() {
  return (
    <div class="max-w-2xl mx-auto p-8">
      <h1 class="text-4xl font-bold mb-4">${name}</h1>
      <p class="text-lg text-gray-600 mb-6">Built with <a href="https://github.com/vibeframe/vibeframe" class="text-blue-600 hover:underline">Vibeframe</a>.</p>
      <nav class="flex gap-4">
        <a href="/counter" class="text-blue-600 hover:underline">Counter demo</a>
      </nav>
    </div>
  );
}
`);

  // routes/counter/page.tsx
  await Bun.write(join(projectDir, "routes/counter/page.tsx"), `import { useState } from "preact/hooks";

export default function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <button onClick={() => setCount(0)}>Reset</button>
      <p><a href="/">Back home</a></p>
    </div>
  );
}
`);

  // middleware.ts
  await Bun.write(join(projectDir, "middleware.ts"), `/**
 * Global middleware — runs on every request.
 */

export default [
  async (req: any, res: any, next: any) => {
    const start = performance.now();
    const response = await next();
    const ms = (performance.now() - start).toFixed(1);
    console.log(\`  \${req.method} \${req.url.pathname} → \${response.status} (\${ms}ms)\`);
    return response;
  },
];
`);

  // CLAUDE.md
  await Bun.write(join(projectDir, "CLAUDE.md"), `# ${name}

Built with [Vibeframe](https://github.com/vibeframe/vibeframe) — an AI-optimal full-stack framework.

## Commands

- \`bun run dev\` — Start dev server (port 3000)
- \`bun run build\` — Production build
- \`bun run start\` — Serve production build
- \`bun run routes\` — List all routes

## Route Conventions

Routes are directories in \`routes/\` containing colocated files:

\`\`\`
routes/
  index/
    page.tsx            — UI component (required)
    loader.ts           — GET data fetching (optional)
    action.ts           — POST/PUT/DELETE mutations (optional)
    schema.ts           — Database schema (optional)
\`\`\`

## Creating a New Route

1. Create a directory in \`routes/\`
2. Add a \`page.tsx\` with a default export component
3. Optionally add \`loader.ts\`, \`action.ts\`, or \`schema.ts\`

### Page with data loading:

\`\`\`tsx
// routes/example/loader.ts
export async function loader(req) {
  return { title: "Example" };
}

// routes/example/page.tsx
export default function ExamplePage({ title }) {
  return <h1>{title}</h1>;
}
\`\`\`

### Page with form handling:

\`\`\`tsx
// routes/example/action.ts
import { validate } from "vibeframe";
import { z } from "vibeframe";

export async function action(req) {
  const { data, errors } = await validate(req, {
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
  });

  if (errors) return { errors };
  // data.name and data.email are fully typed
  return { redirect: "/example" };
}
\`\`\`

### Database schema (Drizzle + SQLite):

\`\`\`tsx
// routes/items/schema.ts
import { sqliteTable, text, integer } from "vibeframe";

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});
\`\`\`

Query in loaders: \`db.select().from(items).all()\`

## View Layer

Uses [Preact](https://preactjs.com) — same API as React, 3KB.
Import hooks from \`preact/hooks\`:

\`\`\`tsx
import { useState, useEffect } from "preact/hooks";
\`\`\`
`);

  // Install dependencies
  console.log("  Installing dependencies...\n");
  const install = Bun.spawn(["bun", "install"], {
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  await install.exited;

  console.log(`
  Done! Get started:

    cd ${name}
    bun run dev

  Then open http://localhost:3000
`);
}
