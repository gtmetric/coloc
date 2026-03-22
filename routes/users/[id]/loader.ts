import type { ColocRequest } from "../../../src/types.ts";
import { getDatabase } from "../../../src/db/database.ts";
import { users } from "../schema.ts";
import { eq } from "../../../src/db/schema.ts";

export async function loader(req: ColocRequest) {
  const db = getDatabase();
  const user = db.select().from(users).where(eq(users.id, Number(req.params.id))).get();
  if (!user) {
    return { title: "Not Found", user: null };
  }
  return { title: user.name, user };
}

export type Props = Awaited<ReturnType<typeof loader>>;
