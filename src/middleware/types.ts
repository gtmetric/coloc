/**
 * Middleware type definitions.
 */

import type { ClaudeoptRequest, ClaudeoptResponse } from "../types.ts";

export type NextFunction = () => Promise<Response>;

export type Middleware = (
  req: ClaudeoptRequest,
  res: ClaudeoptResponse,
  next: NextFunction,
) => Promise<Response>;
