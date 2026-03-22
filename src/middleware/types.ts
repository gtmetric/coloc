/**
 * Middleware type definitions.
 */

import type { ClaudestackRequest, ClaudestackResponse } from "../types.ts";

export type NextFunction = () => Promise<Response>;

export type Middleware = (
  req: ClaudestackRequest,
  res: ClaudestackResponse,
  next: NextFunction,
) => Promise<Response>;
