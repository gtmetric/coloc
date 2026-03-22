# Claudestack Framework

An AI-optimal full-stack framework built with Bun. Schema-driven, colocated routes, Preact rendering, zero config.

## Commands

- `bun run dev` — Dev server with live reload (port 3000)
- `bun run build` — Bundle client JS for production
- `bun run start` — Serve production build
- `bun run bin/claudestack.ts routes` — List all routes with their files
- `bun run bin/claudestack.ts new route <path>` — Scaffold a new route
  - `--action` — include action.ts
  - `--schema` — include schema.ts

## Architecture

```
src/
  server/http.ts        — Bun.serve() wrapper with ClaudestackRequest/ClaudestackResponse
  server/app.ts         — Main app: server + router + middleware + SSR
  router/scanner.ts     — Scans routes/ for page.tsx files, builds route table
  router/matcher.ts     — Matches URL to route, extracts params
  middleware/pipeline.ts — Onion-model compose() for middleware
  ssr/renderer.ts       — SSR with Preact renderToString + loader/action orchestration
  ssr/document.ts       — HTML document shell
  client/hydrate.ts     — Client-side hydration via Preact
  build/builder.ts      — Bun.build() client bundler
  dev/dev-server.ts     — Dev server with file watching
  dev/hot-reload.ts     — SSE-based live reload
  db/database.ts        — Bun SQLite singleton
  db/schema.ts          — schema<T>() with CRUD helpers
  db/csrf.ts            — CSRF token generation/validation
  components/Form.tsx   — <Form> and <FieldError> components
  errors.ts             — Structured errors with code + fix
  types.ts              — Core type definitions
```

## Route Conventions

Routes are directories in `routes/` containing colocated files:

```
routes/
  index/
    page.tsx            — UI component (required)
  users/
    page.tsx            — User list UI
    loader.ts           — GET data fetching
    action.ts           — POST/PUT/DELETE mutations
    schema.ts           — Database schema
    [id]/
      page.tsx          — User detail UI
      loader.ts         — Load single user
```

| Directory | Route |
|-----------|-------|
| `routes/index/` | `/` |
| `routes/about/` | `/about` |
| `routes/users/` | `/users` |
| `routes/users/[id]/` | `/users/:id` |

## How to Generate a New Route

Create a directory in `routes/` with a `page.tsx`:

```tsx
// routes/example/page.tsx
export default function ExamplePage() {
  return <div><h1>Example</h1></div>;
}
```

With type-safe data loading (loader→page props are typed):

```tsx
// routes/example/loader.ts
import type { ClaudestackRequest } from "../../src/types.ts";

export async function loader(req: ClaudestackRequest) {
  return { title: "Example", items: [] as string[] };
}

export type Props = Awaited<ReturnType<typeof loader>>;

// routes/example/page.tsx
import type { Props } from "./loader.ts";

export default function ExamplePage({ title, items }: Props) {
  // title is typed as string, items as string[]
  return <div><h1>{title}</h1></div>;
}
```

With form handling:

```tsx
// routes/example/action.ts
export async function action(req) {
  const form = await req.formData();
  // process form...
  return { redirect: "/example" };
}
```

## Database (Drizzle + SQLite)

Define schemas with Drizzle ORM, colocated in route directories:

```tsx
// routes/items/schema.ts
import { sqliteTable, text, integer } from "../../src/db/schema.ts";

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});
```

Query in loaders/actions:

```tsx
// routes/items/loader.ts
import { getDatabase } from "../../src/db/database.ts";
import { items } from "./schema.ts";
import { eq } from "../../src/db/schema.ts";

export async function loader() {
  const db = getDatabase();
  return { items: db.select().from(items).all() };
}
```

Tables are auto-created on startup. Database at `data/claudestack.db` (SQLite).
Relations, joins, and type-safe queries are all supported via Drizzle.

## Form Component

```tsx
import { Form, FieldError } from "../../src/components/Form.tsx";

<Form action="/users">
  <input name="name" required />
  <FieldError name="name" errors={_actionErrors} />
  <button type="submit">Submit</button>
</Form>
```

CSRF token is automatically included. Actions without valid CSRF return 403.

## Error Codes

| Code | Meaning |
|------|---------|
| `CLAUDESTACK_ROUTE_001` | Page missing default export |
| `CLAUDESTACK_ROUTE_002` | No route matches URL |
| `CLAUDESTACK_ROUTE_003` | Invalid dynamic parameter |
| `CLAUDESTACK_LOADER_001` | loader() threw |
| `CLAUDESTACK_ACTION_001` | action() threw |
| `CLAUDESTACK_RENDER_001` | Component render failed |
| `CLAUDESTACK_DB_001` | Schema/table error |
| `CLAUDESTACK_CSRF_001` | Invalid CSRF token |

## AI Optimization Features

- **`Props` type export** — loaders export their Props type, pages import with one line
- **Route validation** — on dev startup, validates all routes and reports issues with fix suggestions
- **`claudestack routes`** — instant overview of all routes, loaders, actions, schemas
- **`claudestack new route`** — scaffolds route with correct imports and types pre-filled
- **Structured errors** — every error has code, reason, and fix suggestion
- **Colocated routes** — one directory = one feature, minimizes context needed
