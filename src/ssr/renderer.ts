/**
 * Server-Side Rendering orchestrator with loader/action support.
 * Uses Preact's renderToString for server rendering.
 *
 * GET requests:  loader() → page component → HTML
 * POST/PUT/DELETE: action() → redirect or re-render with errors
 */

import { resolve } from "path";
import { existsSync } from "fs";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { wrapInDocument } from "./document.ts";
import { routeNoDefaultExport, loaderError, actionError, renderError } from "../errors.ts";
import { validateCSRFToken } from "../db/csrf.ts";
import type { ClaudeoptRequest } from "../types.ts";
import type { Route } from "../router/types.ts";

export interface RenderResult {
  html?: string;
  redirect?: string;
  error?: import("../errors.ts").ClaudeoptError;
}

export async function renderPage(
  route: Route,
  req: ClaudeoptRequest,
  clientScripts: string[] = [],
  version?: number,
): Promise<RenderResult> {
  const cacheBust = version != null ? `?v=${version}` : "";

  // Handle actions (POST/PUT/DELETE)
  // Check separate action file OR action export in page module
  const pageMod = await import(route.pagePath + cacheBust);
  const hasAction = route.actionPath || typeof pageMod.action === "function";

  if (req.method !== "GET" && req.method !== "HEAD" && hasAction) {
    // Validate CSRF token
    try {
      const formData = await req.raw.clone().formData();
      const csrfToken = formData.get("_csrf") as string | null;
      if (!validateCSRFToken(csrfToken)) {
        return {
          html: wrapInDocument({ title: "Forbidden", content: "<h1>403 Forbidden</h1><p>Invalid or expired CSRF token. Please refresh and try again.</p>" }),
          error: new (await import("../errors.ts")).ClaudeoptError("CLAUDEOPT_CSRF_001", "CSRF validation failed", "The CSRF token is invalid or expired.", "Refresh the page and resubmit the form."),
        };
      }
    } catch {
      // Not a form submission — skip CSRF check
    }

    try {
      // Prefer separate action file, fall back to page module export
      const actionMod = route.actionPath ? await import(route.actionPath + cacheBust) : pageMod;
      if (typeof actionMod.action === "function") {
        const result = await actionMod.action(req);

        if (result?.redirect) {
          return { redirect: result.redirect };
        }

        if (result?.errors) {
          return renderPageWithProps(route, req, { _actionErrors: result.errors }, clientScripts, cacheBust, pageMod);
        }

        if (result?.data) {
          return { html: JSON.stringify(result.data) };
        }
      }
    } catch (err) {
      const error = actionError(route.actionPath!, err);
      console.error(error.format());
      return {
        html: wrapInDocument({ title: "Action Error", content: `<pre>${error.format()}</pre>` }),
        error,
      };
    }
  }

  // GET: run loader then render
  return renderPageWithProps(route, req, {}, clientScripts, cacheBust, pageMod);
}

async function renderPageWithProps(
  route: Route,
  req: ClaudeoptRequest,
  extraProps: Record<string, any>,
  clientScripts: string[],
  cacheBust: string,
  pageMod?: any,
): Promise<RenderResult> {
  // Import page module if not already loaded
  if (!pageMod) {
    pageMod = await import(route.pagePath + cacheBust);
  }

  // Run loader: prefer separate file, then page module export, then getServerData (backward compat)
  let loaderData: Record<string, any> = {};
  const loaderFn = route.loaderPath
    ? (await import(route.loaderPath + cacheBust)).loader
    : pageMod.loader;

  if (typeof loaderFn === "function") {
    try {
      loaderData = (await loaderFn(req)) ?? {};
    } catch (err) {
      const source = route.loaderPath ?? route.pagePath;
      const error = loaderError(source, err);
      console.error(error.format());
      return {
        html: wrapInDocument({ title: "Loader Error", content: `<pre>${error.format()}</pre>` }),
        error,
      };
    }
  } else if (typeof pageMod.getServerData === "function") {
    // Backward compat
    try {
      const data = await pageMod.getServerData(req);
      if (data?.props) loaderData = { ...loaderData, ...data.props };
    } catch (err) {
      const error = loaderError(route.pagePath, err);
      console.error(error.format());
      return { html: wrapInDocument({ title: "Error", content: `<pre>${error.format()}</pre>` }), error };
    }
  }

  if (typeof pageMod.default !== "function") {
    const error = routeNoDefaultExport(route.pagePath);
    return {
      html: wrapInDocument({ title: "Error", content: `<pre>${error.format()}</pre>` }),
      error,
    };
  }

  // Merge props
  const props = { params: req.params, query: req.query, ...loaderData, ...extraProps };

  // Render with Preact
  try {
    const vnode = h(pageMod.default, props);
    const content = renderToString(vnode);
    const title = props.title ?? "Claudeopt";

    // Auto-inject Tailwind CSS if public/app.css exists
    const styles: string[] = [];
    if (existsSync(resolve("public/app.css"))) {
      styles.push("/public/app.css");
    }

    const html = wrapInDocument({
      title,
      content,
      data: props,
      scripts: clientScripts,
      styles,
    });

    return { html };
  } catch (err) {
    const error = renderError(route.pagePath, err);
    console.error(error.format());
    return {
      html: wrapInDocument({ title: "Render Error", content: `<pre>${error.format()}</pre>` }),
      error,
    };
  }
}
