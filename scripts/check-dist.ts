import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const dist = join(import.meta.dirname, "../dist");

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(dist)) throw new Error("dist is missing. Run the build first.");

const errors: string[] = [];
const htmlFiles = walk(dist).filter((file) => extname(file) === ".html");

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const stylesheets = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/g)]
    .map((match) => match[1]!);
  const page = relative(dist, file);
  const isRedirect = /<meta\b[^>]*\bhttp-equiv=["']refresh["']/i.test(html);
  if (!isRedirect && !stylesheets.some((href) => /\/_astro\/app\.[^/]+\.css(?:\?|$)/.test(href))) {
    errors.push(`${page}: missing the global app stylesheet.`);
  }
  for (const href of stylesheets) {
    if (/^(?:https?:)?\/\//.test(href)) continue;
    const target = join(dist, href.split(/[?#]/, 1)[0]!.replace(/^\//, ""));
    if (!existsSync(target)) errors.push(`${page}: missing stylesheet asset ${href}.`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Dist stylesheets OK: ${htmlFiles.length} HTML pages reference existing app CSS.`);
