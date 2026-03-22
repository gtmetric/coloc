/**
 * Core types for the Claudestack framework.
 * All request/response types used throughout the framework are defined here.
 */

export interface ClaudestackRequest {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Parsed URL object */
  url: URL;
  /** Route parameters extracted by the router (e.g., { slug: "hello" }) */
  params: Record<string, string>;
  /** Query string parameters */
  query: Record<string, string>;
  /** Request headers */
  headers: Record<string, string>;
  /** Parse the request body as JSON */
  body: () => Promise<unknown>;
  /** Parse the request body as FormData */
  formData: () => Promise<FormData>;
  /** The original Bun Request object */
  raw: Request;
}

export interface ClaudestackResponse {
  /** Set the HTTP status code. Chainable. */
  status: (code: number) => ClaudestackResponse;
  /** Send an HTML string response */
  html: (content: string) => Response;
  /** Send a JSON response */
  json: (data: unknown) => Response;
  /** Redirect to a URL */
  redirect: (url: string, code?: number) => Response;
  /** Send a plain text response */
  text: (content: string) => Response;
  /** Set a response header. Chainable. */
  header: (name: string, value: string) => ClaudestackResponse;
}

/** A handler function that processes a request and returns a response */
export type ClaudestackHandler = (req: ClaudestackRequest, res: ClaudestackResponse) => Response | Promise<Response>;

/** Configuration for the Claudestack server */
export interface ClaudestackConfig {
  port?: number;
  hostname?: string;
  pagesDir?: string;
  routesDir?: string;
}

/**
 * Type-safe loader→page connection.
 *
 * Usage: Define your loader, then use its return type as page props.
 *
 *   // loader.ts
 *   export async function loader(req: ClaudestackRequest) {
 *     return { users: User.findAll() };
 *   }
 *
 *   // page.tsx
 *   import type { loader } from "./loader.ts";
 *   import type { PageProps } from "claudestack";
 *
 *   export default function UsersPage(props: PageProps<typeof loader>) {
 *     props.users  // ← fully typed as User[]
 *   }
 */
export type LoaderFunction = (req: ClaudestackRequest) => any | Promise<any>;

/** Extract the return type of a loader function, unwrapping Promises */
export type LoaderData<T extends LoaderFunction> = Awaited<ReturnType<T>>;

/** Page component props = loader return data + route params/query + action errors */
export type PageProps<T extends LoaderFunction> = LoaderData<T> & {
  params: Record<string, string>;
  query: Record<string, string>;
  _actionErrors?: Record<string, string>;
};

/** Action return types */
export type ActionResult =
  | { redirect: string }
  | { errors: Record<string, string> }
  | { data: unknown };
