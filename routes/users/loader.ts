import type { ClaudeoptRequest } from "../../src/types.ts";
import { getDatabase } from "../../src/db/database.ts";
import { users } from "./schema.ts";
import { eq } from "../../src/db/schema.ts";

export async function loader(req: ClaudeoptRequest) {
  const db = getDatabase();
  return {
    title: "Users",
    users: db.select().from(users).all(),
  };
}

export type Props = Awaited<ReturnType<typeof loader>>;
