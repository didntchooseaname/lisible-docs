import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const types: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export default function previewAssetsDev() {
  const root = resolve(process.cwd(), "dist/_previews");
  return {
    name: "lisible-preview-assets-dev",
    configureServer(server: { middlewares: { use: (handler: (request: { url?: string }, response: NodeJS.WritableStream & { statusCode: number; setHeader: (name: string, value: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        const rawPath = (request.url ?? "").split(/[?#]/, 1)[0] ?? "";
        if (!rawPath.startsWith("/_previews/")) return next();
        let pathname: string;
        try {
          pathname = decodeURIComponent(rawPath.slice("/_previews/".length));
        } catch {
          response.statusCode = 400;
          response.end("Bad Request");
          return;
        }
        const candidate = resolve(root, pathname);
        if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
          response.statusCode = 403;
          response.end("Forbidden");
          return;
        }
        const file = existsSync(candidate) && statSync(candidate).isDirectory() ? resolve(candidate, "index.html") : candidate;
        if (!existsSync(file) || !statSync(file).isFile()) return next();
        response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
        response.setHeader("Cache-Control", file.endsWith("manifest.json") ? "no-store" : "no-cache");
        response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        createReadStream(file).pipe(response);
      });
    },
  };
}
