# Coloc

A full-stack framework built with Bun. Colocated routes, schema-driven database, Preact rendering.

## Quick Start

```bash
bunx coloc create my-app
cd my-app
bun run dev
```

Open http://localhost:3000.

## Routes

Every route is a directory in `routes/` with colocated files:

```
routes/
  index/
    page.tsx        ← UI component (required)
    loader.ts       ← data fetching (optional)
    action.ts       ← form handling (optional)
    schema.ts       ← database schema (optional)
```

### Page

```tsx
// routes/index/page.tsx
export default function HomePage() {
  return <h1>Hello</h1>;
}
```

### Loader (data fetching)

```tsx
// routes/users/loader.ts
import { getDatabase } from "coloc";
import { users } from "./schema";

export async function loader() {
  const db = getDatabase();
  return { users: db.select().from(users).all() };
}

// routes/users/page.tsx
export default function UsersPage({ users }) {
  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>;
}
```

### Action (form handling)

```tsx
// routes/users/action.ts
import { getDatabase } from "coloc";
import { users } from "./schema";

export async function action(req) {
  const form = await req.formData();
  const db = getDatabase();
  db.insert(users).values({ name: form.get("name") }).run();
  return { redirect: "/users" };
}
```

### Schema (Drizzle + SQLite)

```tsx
// routes/users/schema.ts
import { sqliteTable, text, integer } from "coloc";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});
```

Tables are auto-created on startup. Database at `data/coloc.db`.
Full Drizzle ORM — relations, joins, and type-safe queries all supported.

## Type-Safe Props

Loaders export a `Props` type automatically. Pages import it with one line:

```tsx
// loader.ts
export async function loader(req) {
  return { count: 42 };
}
export type Props = Awaited<ReturnType<typeof loader>>;

// page.tsx
import type { Props } from "./loader";

export default function MyPage({ count }: Props) {
  // count is typed as number
}
```

The `Props` export is generated automatically by `coloc new route`.

## Interactive Pages

Uses Preact (3KB, React-compatible). Import hooks from `preact/hooks`:

```tsx
import { useState } from "preact/hooks";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

React libraries work via the built-in `preact/compat` layer.

## Forms

The `<Form>` component includes CSRF protection automatically:

```tsx
import { Form } from "coloc";

export default function NewUser() {
  return (
    <Form action="/users">
      <input name="name" required />
      <button type="submit">Add</button>
    </Form>
  );
}
```

## CLI

```bash
coloc create <name>              # new project
coloc routes                     # list all routes
coloc new route <path>           # scaffold a route
coloc new route <path> --action  # with action.ts
coloc new route <path> --schema  # with schema.ts
bun run dev                      # dev server (port 3000)
bun run build                    # production build
bun run start                    # serve production build
```

## Requirements

- [Bun](https://bun.sh) v1.0+
