# Coloc

**A full-stack framework built for Claude Code.**

Other frameworks scatter features across dozens of directories. Claude Code spends minutes searching, planning, guessing — then gets it wrong.

Coloc puts everything for a feature in one directory. Claude reads one folder, gets the full picture, acts immediately.

```
routes/users/
  page.tsx        what the user sees
  loader.ts       where the data comes from
  action.ts       what happens on submit
  schema.ts       what the data looks like
```

## Get Started

```bash
bunx coloc create my-app
cd my-app
bun run dev
```

## What's Included

- **Preact** — 3KB, React-compatible, SSR + hydration
- **Drizzle + SQLite** — define a schema, get a table, query with types
- **Tailwind CSS** — no config needed
- **Forms with CSRF** — built-in protection
- **Live reload** — edit a file, see it instantly
- **Structured errors** — every error tells you exactly how to fix it
- **One command deploy** — `docker build -t app . && docker run -p 3000:3000 app`

## Docs

See [CLAUDE.md](./CLAUDE.md) for full conventions.

## Requirements

[Bun](https://bun.sh) v1.0+

## License

MIT
