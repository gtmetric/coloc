/**
 * Built-in form validation using Zod.
 *
 * Usage in actions:
 *
 *   import { validate } from "vibeframe";
 *   import { z } from "vibeframe";
 *
 *   export async function action(req) {
 *     const { data, errors } = await validate(req, {
 *       name: z.string().min(1, "Name is required"),
 *       email: z.string().email("Invalid email"),
 *     });
 *
 *     if (errors) return { errors };
 *     // data is typed as { name: string, email: string }
 *   }
 */

import { z, type ZodTypeAny } from "zod";
import type { VibeframeRequest } from "./types.ts";

/** A schema definition — each key maps to a Zod type */
type SchemaShape = Record<string, ZodTypeAny>;

/** Infer the validated data type from a schema shape */
type InferShape<T extends SchemaShape> = {
  [K in keyof T]: z.infer<T[K]>;
};

/** Result of validate() — either { data, errors: null } or { data: null, errors } */
type ValidateResult<T extends SchemaShape> =
  | { data: InferShape<T>; errors: null }
  | { data: null; errors: Record<string, string> };

/**
 * Validate form data from a request against a Zod schema.
 *
 * Returns typed `data` on success, or field-level `errors` on failure
 * (compatible with `<FieldError>` component).
 */
export async function validate<T extends SchemaShape>(
  req: VibeframeRequest,
  shape: T
): Promise<ValidateResult<T>> {
  const form = await req.formData();
  const raw: Record<string, unknown> = {};

  for (const key of Object.keys(shape)) {
    const value = form.get(key);
    raw[key] = value === null ? undefined : value;
  }

  const schema = z.object(shape);
  const result = schema.safeParse(raw);

  if (result.success) {
    return { data: result.data as InferShape<T>, errors: null };
  }

  // Flatten to { fieldName: "first error message" } format
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && !errors[String(field)]) {
      errors[String(field)] = issue.message;
    }
  }

  return { data: null, errors };
}
