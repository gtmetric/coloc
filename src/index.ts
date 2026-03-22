/**
 * Vibeframe — An AI-optimal full-stack framework.
 * Public API exports.
 */

// Server
export { serve, createRequest, createResponse } from "./server/http.ts";
export { createApp } from "./server/app.ts";

// Router
export { scanRoutes } from "./router/scanner.ts";
export { matchRoute } from "./router/matcher.ts";

// Errors
export { VibeframeError } from "./errors.ts";

// Middleware
export { compose } from "./middleware/pipeline.ts";

// Client
export { hydrate } from "./client/hydrate.ts";

// Database (Drizzle)
export { getDatabase, getSQLite, closeDatabase } from "./db/database.ts";
export { sqliteTable, text, integer, real, blob, index, uniqueIndex, relations, eq, ne, gt, gte, lt, lte, like, and, or, desc, asc, sql } from "./db/schema.ts";

// Components
export { Form, FieldError } from "./components/Form.tsx";

// CSRF
export { generateCSRFToken, validateCSRFToken } from "./db/csrf.ts";

// Validation
export { validate } from "./validation.ts";
export { z } from "zod";

// Preact re-exports for convenience
export { h, Fragment } from "preact";
export { useState, useEffect, useRef, useMemo, useCallback, useContext } from "preact/hooks";

// Types
export type { VibeframeRequest, VibeframeResponse, VibeframeHandler, VibeframeConfig, LoaderFunction, LoaderData, PageProps, ActionResult } from "./types.ts";
export type { Route, RouteMatch, Segment } from "./router/types.ts";
export type { Middleware, NextFunction } from "./middleware/types.ts";
export type { DocumentOptions } from "./ssr/document.ts";
