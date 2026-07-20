import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = join(import.meta.dirname, "../src/content/docs");
const locales = ["fr", "en"] as const;

function walk(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    })
    .filter((path) => [".md", ".mdx"].includes(extname(path)))
    .sort();
}

function relativeFiles(locale: "fr" | "en") {
  return walk(join(root, locale)).map((path) => relative(join(root, locale), path));
}

const errors: string[] = [];
const files = Object.fromEntries(locales.map((locale) => [locale, relativeFiles(locale)])) as Record<"fr" | "en", string[]>;

for (const locale of locales) {
  const markdownFiles = files[locale].filter((file) => !file.endsWith(".mdx"));
  if (markdownFiles.length > 0) {
    errors.push(`${locale}: documentation must use MDX by default (${markdownFiles.join(", ")}).`);
  }
}

if (JSON.stringify(files.fr) !== JSON.stringify(files.en)) {
  errors.push("French and English documentation file sets differ.");
}

if (files.fr.length < 19) {
  errors.push(`Expected at least 19 chapters per locale, found ${files.fr.length}.`);
}

const routes = new Set<string>();
const siteRoutes = new Set(["/", "/en/", "/preview/", "/en/preview/"]);
for (const locale of locales) {
  for (const file of files[locale]) {
    const slug = file.replace(/\.(md|mdx)$/, "");
    routes.add(
      slug === "introduction"
        ? (locale === "fr" ? "/docs/" : "/en/docs/")
        : `/${locale === "en" ? "en/" : ""}docs/${slug}/`,
    );
  }
}

for (const locale of locales) {
  for (const file of files[locale]) {
    const path = join(root, locale, file);
    const text = readFileSync(path, "utf8");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const keys = frontmatter.split("\n").map((line) => line.match(/^([A-Za-z][\w]*):/)?.[1]).filter(Boolean);
    const otherText = readFileSync(join(root, locale === "fr" ? "en" : "fr", file), "utf8");
    const otherFrontmatter = otherText.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const otherKeys = otherFrontmatter.split("\n").map((line) => line.match(/^([A-Za-z][\w]*):/)?.[1]).filter(Boolean);

    if (JSON.stringify(keys) !== JSON.stringify(otherKeys)) {
      errors.push(`${locale}/${file}: frontmatter keys differ from its mirror.`);
    }
    if (!/^## /m.test(text)) errors.push(`${locale}/${file}: no level-two section.`);

    for (const match of text.matchAll(/\]\((\/[^) #?]+)(?:[?#][^)]*)?\)/g)) {
      const route = match[1].endsWith("/") ? match[1] : `${match[1]}/`;
      const isDocRoute = routes.has(route);
      if (!isDocRoute && !siteRoutes.has(route) && !existsSync(join(import.meta.dirname, `../public${match[1]}`))) {
        errors.push(`${locale}/${file}: unresolved internal link ${match[1]}.`);
      }
      if (locale === "en" && isDocRoute && !route.startsWith("/en/docs/")) {
        errors.push(`${locale}/${file}: English internal link lacks /en prefix: ${match[1]}.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Documentation content OK: ${files.fr.length} FR + ${files.en.length} EN chapters, mirrored routes and internal links.`);
