/**
 * Claudeopt HTTP server — a thin wrapper around Bun.serve().
 */

import type { ClaudeoptRequest, ClaudeoptResponse, ClaudeoptHandler, ClaudeoptConfig } from "../types.ts";

function parseHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function parseQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

export function createRequest(raw: Request): ClaudeoptRequest {
  const url = new URL(raw.url);
  return {
    method: raw.method,
    url,
    params: {},
    query: parseQuery(url),
    headers: parseHeaders(raw),
    body: async () => {
      const text = await raw.clone().text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    },
    formData: () => raw.clone().formData(),
    raw,
  };
}

export function createResponse(): ClaudeoptResponse {
  let statusCode = 200;
  const responseHeaders = new Headers();

  const res: ClaudeoptResponse = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    header(name: string, value: string) {
      responseHeaders.set(name, value);
      return res;
    },
    html(content: string) {
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      return new Response(content, { status: statusCode, headers: responseHeaders });
    },
    json(data: unknown) {
      responseHeaders.set("Content-Type", "application/json");
      return new Response(JSON.stringify(data), { status: statusCode, headers: responseHeaders });
    },
    redirect(url: string, code = 302) {
      responseHeaders.set("Location", url);
      return new Response(null, { status: code, headers: responseHeaders });
    },
    text(content: string) {
      responseHeaders.set("Content-Type", "text/plain; charset=utf-8");
      return new Response(content, { status: statusCode, headers: responseHeaders });
    },
  };

  return res;
}

export function serve(handler: ClaudeoptHandler, config: ClaudeoptConfig = {}) {
  const port = config.port ?? 3000;
  const hostname = config.hostname ?? "localhost";

  const server = Bun.serve({
    port,
    hostname,
    fetch: async (raw: Request) => {
      const req = createRequest(raw);
      const res = createResponse();
      try {
        return await handler(req, res);
      } catch (error) {
        console.error(error);
        return res.status(500).html(
          `<h1>500 Internal Server Error</h1><pre>${error instanceof Error ? error.message : String(error)}</pre>`,
        );
      }
    },
  });

  console.log(`\n  Claudeopt server running at http://${hostname}:${port}\n`);
  return server;
}
