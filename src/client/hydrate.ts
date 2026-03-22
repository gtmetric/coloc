/**
 * Client-side hydration using Preact.
 * Preact's hydrate attaches event handlers and enables full reactivity
 * (useState, useEffect, etc.) on server-rendered HTML.
 */

import { h, hydrate as preactHydrate } from "preact";

export function hydrate(Component: Function, container: Element | null): void {
  if (!container) {
    console.warn("[Claudeopt] Hydration target #__claudeopt not found");
    return;
  }

  const dataEl = document.getElementById("__CLAUDEOPT_DATA__");
  let props: Record<string, any> = {};
  if (dataEl?.textContent) {
    try { props = JSON.parse(dataEl.textContent); } catch {}
  }

  preactHydrate(h(Component as any, props), container);
  console.log("[Claudeopt] Hydration complete");
}
