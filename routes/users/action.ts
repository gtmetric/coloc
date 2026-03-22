import type { ClaudestackRequest, ActionResult } from "../../src/types.ts";
import { getDatabase } from "../../src/db/database.ts";
import { users } from "./schema.ts";

export async function action(req: ClaudestackRequest): Promise<ActionResult> {
  const form = await req.formData();
  const name = form.get("name") as string;
  const email = form.get("email") as string;

  if (!name || !email) {
    return { errors: { name: !name ? "Name is required" : "", email: !email ? "Email is required" : "" } };
  }

  try {
    const db = getDatabase();
    db.insert(users).values({ name, email }).run();
    return { redirect: "/users" };
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return { errors: { email: "Email already exists" } };
    }
    throw err;
  }
}
