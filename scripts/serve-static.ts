import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const staticRoot = resolve(process.env.STATIC_ROOT ?? resolve(import.meta.dir, "../dist"));

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT ?? "3000"}`);
}

const rootStats = await stat(staticRoot).catch(() => null);
if (!rootStats?.isDirectory()) {
  throw new Error(`Static output directory not found: ${staticRoot}`);
}

const baseHeaders = {
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

function isInsideStaticRoot(filePath: string): boolean {
  return filePath === staticRoot || filePath.startsWith(`${staticRoot}${sep}`);
}

async function isFile(filePath: string): Promise<boolean> {
  const fileStats = await stat(filePath).catch(() => null);
  return fileStats?.isFile() ?? false;
}

function cacheControl(pathname: string): string {
  if (pathname.includes("/_astro/")) {
    return "public, max-age=31536000, immutable";
  }

  if (pathname === "/_previews/manifest.json") return "no-store";

  if (/\.(?:html?|json|txt|xml)$/i.test(pathname) || pathname.endsWith("/")) {
    return "public, max-age=0, must-revalidate";
  }

  return "public, max-age=3600";
}

async function serveFile(
  filePath: string,
  pathname: string,
  method: string,
  status = 200,
): Promise<Response | null> {
  if (!isInsideStaticRoot(filePath) || !(await isFile(filePath))) {
    return null;
  }

  const file = Bun.file(filePath);
  const headers = new Headers(baseHeaders);
  headers.set("Cache-Control", cacheControl(pathname));
  headers.set("Content-Length", String(file.size));
  headers.set("Content-Type", file.type || "application/octet-stream");
  if (pathname.startsWith("/_previews/")) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(method === "HEAD" ? null : file, { headers, status });
}

async function notFound(pathname: string, method: string): Promise<Response> {
  return (
    (await serveFile(resolve(staticRoot, "404.html"), pathname, method, 404)) ??
    new Response(method === "HEAD" ? null : "Not Found\n", {
      status: 404,
      headers: { ...baseHeaders, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

const server = Bun.serve({
  hostname,
  port,
  development: false,
  async fetch(request) {
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      return new Response("Method Not Allowed\n", {
        status: 405,
        headers: { ...baseHeaders, Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(method === "HEAD" ? null : "OK\n", {
        headers: { ...baseHeaders, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad Request\n", {
        status: 400,
        headers: { ...baseHeaders, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (pathname.includes("\0") || pathname.includes("\\")) {
      return new Response("Bad Request\n", {
        status: 400,
        headers: { ...baseHeaders, "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const requestedPath = resolve(staticRoot, `.${pathname}`);
    if (!isInsideStaticRoot(requestedPath)) {
      return notFound(pathname, method);
    }

    if (pathname.endsWith("/")) {
      return (
        (await serveFile(resolve(requestedPath, "index.html"), pathname, method)) ??
        notFound(pathname, method)
      );
    }

    const directFile = await serveFile(requestedPath, pathname, method);
    if (directFile) {
      return directFile;
    }

    const directoryIndex = resolve(requestedPath, "index.html");
    if (await isFile(directoryIndex)) {
      return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 308);
    }

    return notFound(pathname, method);
  },
});

console.log(`Static documentation server listening on http://${server.hostname}:${server.port}`);
