/**
 * HTML document shell.
 */

export function escapeJsonForScript(json: string): string {
  return json.replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

export interface DocumentOptions {
  title?: string;
  content: string;
  data?: unknown;
  scripts?: string[];
  styles?: string[];
  head?: string;
}

export function wrapInDocument(options: DocumentOptions): string {
  const { title = "Claudestack", content, data, scripts = [], styles = [], head = "" } = options;

  const dataScript = data != null
    ? `<script id="__CLAUDESTACK_DATA__" type="application/json">${escapeJsonForScript(JSON.stringify(data))}</script>`
    : "";

  const scriptTags = scripts
    .map((src) => `<script type="module" src="${src}"></script>`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${styles.map((href) => `<link rel="stylesheet" href="${href}" />`).join("\n  ")}
  ${head}
</head>
<body>
  <div id="__claudestack">${content}</div>
  ${dataScript}
  ${scriptTags}
</body>
</html>`;
}
