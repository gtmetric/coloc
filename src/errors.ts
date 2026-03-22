/**
 * Claudestack structured error system.
 * Every error includes a code, message, reason, and fix suggestion
 * so Claude Code can parse and act on them.
 */

export class ClaudestackError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly reason: string,
    public readonly fix: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "ClaudestackError";
  }

  format(): string {
    return [
      `\n[Claudestack Error] ${this.code}`,
      `  What: ${this.message.replace(`${this.code}: `, "")}`,
      `  Why:  ${this.reason}`,
      `  Fix:  ${this.fix}`,
    ].join("\n");
  }
}

// -- Route Errors --

export function routeNoDefaultExport(filePath: string): ClaudestackError {
  return new ClaudestackError(
    "CLAUDESTACK_ROUTE_001",
    `No default export in ${filePath}`,
    "Pages must export a default function component to be rendered.",
    `Add "export default function PageName() { return <div>...</div>; }" to ${filePath}`,
  );
}

export function routeNotFound(path: string): ClaudestackError {
  return new ClaudestackError(
    "CLAUDESTACK_ROUTE_002",
    `No route matches "${path}"`,
    "No file in the routes/ directory maps to this URL path.",
    `Create a directory at routes${path === "/" ? "/index" : path}/ with a page.tsx file`,
  );
}

export function routeInvalidParam(paramName: string, filePath: string): ClaudestackError {
  return new ClaudestackError(
    "CLAUDESTACK_ROUTE_003",
    `Invalid dynamic parameter "[${paramName}]" in ${filePath}`,
    "Dynamic route parameters must contain only alphanumeric characters.",
    `Rename the parameter to use only letters and numbers, e.g., [${paramName.replace(/[^a-zA-Z0-9]/g, "")}]`,
  );
}

// -- Server Errors --

export function loaderError(filePath: string, error: unknown): ClaudestackError {
  const msg = error instanceof Error ? error.message : String(error);
  return new ClaudestackError(
    "CLAUDESTACK_LOADER_001",
    `loader() failed in ${filePath}`,
    msg,
    `Check the loader() function in ${filePath}. Ensure it returns a plain object.`,
  );
}

export function actionError(filePath: string, error: unknown): ClaudestackError {
  const msg = error instanceof Error ? error.message : String(error);
  return new ClaudestackError(
    "CLAUDESTACK_ACTION_001",
    `action() failed in ${filePath}`,
    msg,
    `Check the action() function in ${filePath}. Ensure it returns { redirect }, { errors }, or { data }.`,
  );
}

export function renderError(filePath: string, error: unknown): ClaudestackError {
  const msg = error instanceof Error ? error.message : String(error);
  return new ClaudestackError(
    "CLAUDESTACK_RENDER_001",
    `Failed to render ${filePath}`,
    msg,
    `Check the default export component in ${filePath}. Ensure it returns valid JSX.`,
  );
}

// -- Database Errors --

export function schemaError(tableName: string, error: unknown): ClaudestackError {
  const msg = error instanceof Error ? error.message : String(error);
  return new ClaudestackError(
    "CLAUDESTACK_DB_001",
    `Schema error for table "${tableName}"`,
    msg,
    `Check the schema definition for "${tableName}". Ensure column definitions are valid SQLite types.`,
  );
}
