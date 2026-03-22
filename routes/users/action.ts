import { validate } from "../../src/validation.ts";
import { z } from "zod";
import { getDatabase } from "../../src/db/database.ts";
import { users } from "./schema.ts";

export async function action(req: any) {
  const { data, errors } = await validate(req, {
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
  });

  if (errors) return { errors };

  try {
    const db = getDatabase();
    db.insert(users).values({ name: data.name, email: data.email }).run();
    return { redirect: "/users" };
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return { errors: { email: "Email already exists" } };
    }
    throw err;
  }
}
