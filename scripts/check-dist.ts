import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { SITE } from "../src/site.config";

const dist = join(import.meta.dirname, "../dist");

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function attributes(tag: string) {
  return Object.fromEntries(
    [...tag.matchAll(/([^\s=]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1]!.toLowerCase(), match[2]!]),
  );
}

function elements(html: string, name: string) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => attributes(match[0]));
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function routeFor(file: string) {
  const page = relative(dist, file).split(sep).join("/");
  if (page === "index.html") return "/";
  if (page.endsWith("/index.html")) return `/${page.slice(0, -"index.html".length)}`;
  return `/${page}`;
}

function pngSize(path: string) {
  const data = readFileSync(path);
  if (data.length < 24 || data.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

if (!existsSync(dist)) throw new Error("dist is missing. Run the build first.");

const errors: string[] = [];
const htmlFiles = walk(dist).filter((file) => extname(file) === ".html");
const indexablePages = new Map<string, { page: string; alternates: Map<string, string> }>();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const page = relative(dist, file).split(sep).join("/");
  const route = routeFor(file);
  const links = elements(html, "link");
  const metas = elements(html, "meta");
  const stylesheets = links.filter((link) => link.rel === "stylesheet").map((link) => link.href!);
  const isRedirect = metas.some((meta) => meta["http-equiv"]?.toLowerCase() === "refresh");
  const isNoindex = metas.some((meta) => meta.name === "robots" && /\bnoindex\b/i.test(meta.content ?? ""));

  if (!isRedirect && !stylesheets.some((href) => /\/_astro\/app\.[^/]+\.css(?:\?|$)/.test(href))) {
    errors.push(`${page}: missing the global app stylesheet.`);
  }
  for (const href of stylesheets) {
    if (/^(?:https?:)?\/\//.test(href)) continue;
    const target = join(dist, href.split(/[?#]/, 1)[0]!.replace(/^\//, ""));
    if (!existsSync(target)) errors.push(`${page}: missing stylesheet asset ${href}.`);
  }

  if (isRedirect || isNoindex) continue;

  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) => decodeHtml(match[1]!.trim()));
  const descriptions = metas.filter((meta) => meta.name === "description").map((meta) => decodeHtml(meta.content ?? ""));
  const canonicals = links.filter((link) => link.rel === "canonical").map((link) => link.href ?? "");
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];

  if (titles.length !== 1 || !titles[0]) errors.push(`${page}: expected one non-empty title.`);
  if (titles[0] && (titles[0].length < 20 || titles[0].length > 65)) {
    errors.push(`${page}: title length ${titles[0].length} is outside 20-65 characters.`);
  }
  if (descriptions.length !== 1 || !descriptions[0]) errors.push(`${page}: expected one non-empty meta description.`);
  if (descriptions[0] && (descriptions[0].length < 70 || descriptions[0].length > 160)) {
    errors.push(`${page}: description length ${descriptions[0].length} is outside 70-160 characters.`);
  }
  if (canonicals.length !== 1) errors.push(`${page}: expected one canonical URL.`);
  if (htmlLang !== "fr" && htmlLang !== "en") errors.push(`${page}: html lang must be fr or en.`);
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) errors.push(`${page}: expected exactly one h1.`);

  let canonicalUrl: URL | undefined;
  try {
    canonicalUrl = new URL(canonicals[0]!);
    if (canonicalUrl.origin !== new URL(SITE.url).origin) errors.push(`${page}: canonical uses another origin.`);
    if (canonicalUrl.pathname !== route) errors.push(`${page}: canonical path ${canonicalUrl.pathname} does not match ${route}.`);
    if (indexablePages.has(canonicalUrl.toString())) errors.push(`${page}: duplicate canonical ${canonicalUrl}.`);
  } catch {
    errors.push(`${page}: canonical is not an absolute URL.`);
  }

  const alternates = new Map(
    links
      .filter((link) => link.rel === "alternate" && link.hreflang)
      .map((link) => [link.hreflang!, link.href ?? ""]),
  );
  for (const language of ["fr", "en", "x-default"]) {
    if (!alternates.has(language)) errors.push(`${page}: missing ${language} hreflang.`);
  }

  const requiredOg = [
    "og:type", "og:site_name", "og:title", "og:description", "og:url", "og:locale",
    "og:image", "og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt",
  ];
  const og = new Map(metas.filter((meta) => meta.property?.startsWith("og:")).map((meta) => [meta.property!, meta.content ?? ""]));
  for (const property of requiredOg) {
    if (!og.get(property)) errors.push(`${page}: missing ${property}.`);
  }
  if (og.get("og:image:type") !== "image/png") errors.push(`${page}: Open Graph image type must be image/png.`);
  if (og.get("og:image:width") !== "1200" || og.get("og:image:height") !== "630") {
    errors.push(`${page}: Open Graph dimensions must be 1200x630.`);
  }
  if (canonicalUrl && og.get("og:url") !== canonicalUrl.toString()) errors.push(`${page}: og:url differs from canonical.`);

  const requiredTwitter = ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"];
  const twitter = new Map(metas.filter((meta) => meta.name?.startsWith("twitter:")).map((meta) => [meta.name!, meta.content ?? ""]));
  for (const name of requiredTwitter) {
    if (!twitter.get(name)) errors.push(`${page}: missing ${name}.`);
  }
  if (twitter.get("twitter:card") !== "summary_large_image") errors.push(`${page}: Twitter card must use summary_large_image.`);

  const image = og.get("og:image");
  if (image) {
    try {
      const imageUrl = new URL(image);
      const imagePath = join(dist, decodeURIComponent(imageUrl.pathname).replace(/^\//, ""));
      if (imageUrl.origin !== new URL(SITE.url).origin) errors.push(`${page}: social image uses another origin.`);
      if (!existsSync(imagePath)) {
        errors.push(`${page}: social image ${imageUrl.pathname} is missing from dist.`);
      } else {
        const size = pngSize(imagePath);
        if (!size || size.width !== 1200 || size.height !== 630) errors.push(`${page}: social image is not a 1200x630 PNG.`);
      }
    } catch {
      errors.push(`${page}: social image is not an absolute URL.`);
    }
  }

  const jsonLdScripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (jsonLdScripts.length === 0) errors.push(`${page}: missing JSON-LD.`);
  for (const script of jsonLdScripts) {
    try {
      JSON.parse(decodeHtml(script[1]!.trim()));
    } catch {
      errors.push(`${page}: invalid JSON-LD.`);
    }
  }

  if (canonicalUrl) indexablePages.set(canonicalUrl.toString(), { page, alternates });
}

for (const [canonical, { page, alternates }] of indexablePages) {
  const ownLanguage = (["fr", "en", "x-default"] as const)
    .find((language) => alternates.get(language) === canonical);
  if (!ownLanguage) errors.push(`${page}: hreflang set does not contain its own canonical URL.`);

  for (const language of ["fr", "en"] as const) {
    const alternate = alternates.get(language);
    if (!alternate || !indexablePages.has(alternate)) {
      errors.push(`${page}: ${language} hreflang target is not an indexable page (${alternate ?? "missing"}).`);
      continue;
    }
    const reciprocal = ownLanguage ? indexablePages.get(alternate)!.alternates.get(ownLanguage) : undefined;
    if (reciprocal !== canonical) {
      errors.push(`${page}: ${language} hreflang target does not link back to ${canonical}.`);
    }
  }
}

const sitemapFiles = walk(dist).filter((file) => /^sitemap-(?!index).*\.xml$/.test(relative(dist, file)));
const sitemapUrls = new Set(
  sitemapFiles.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]!))),
);
for (const canonical of indexablePages.keys()) {
  if (!sitemapUrls.has(canonical)) errors.push(`Sitemap is missing ${canonical}.`);
}
for (const url of sitemapUrls) {
  if (!indexablePages.has(url)) errors.push(`Sitemap contains a non-indexable or redirect URL: ${url}.`);
}

const robots = readFileSync(join(dist, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${SITE.url}/sitemap-index.xml`)) errors.push("robots.txt is missing the absolute sitemap URL.");

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Dist SEO OK: ${indexablePages.size} indexable pages have complete metadata, reciprocal hreflang, valid social images, JSON-LD and sitemap coverage.`);
console.log(`Dist stylesheets OK: ${htmlFiles.length} HTML pages reference existing app CSS.`);
