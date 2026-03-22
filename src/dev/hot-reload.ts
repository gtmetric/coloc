/**
 * Hot reload via Server-Sent Events (SSE).
 */

export const RELOAD_SCRIPT = `
<script>
(function() {
  const es = new EventSource("/__claudeopt/reload");
  es.onmessage = function(e) {
    if (e.data === "reload") {
      console.log("[Claudeopt] File changed, reloading...");
      window.location.reload();
    }
  };
  es.onerror = function() {
    console.log("[Claudeopt] SSE connection lost, retrying...");
  };
})();
</script>`;

const clients = new Set<ReadableStreamDefaultController>();

export function notifyReload(): void {
  const encoder = new TextEncoder();
  for (const controller of clients) {
    try {
      controller.enqueue(encoder.encode("data: reload\n\n"));
    } catch {
      clients.delete(controller);
    }
  }
}

export function createSSEResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

export function injectReloadScript(html: string): string {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${RELOAD_SCRIPT}\n</body>`);
  }
  return html + RELOAD_SCRIPT;
}
