import { cp, lstat, mkdir, readFile, readdir, readlink, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { VARIANTS, type PublicVariant } from "../vendor/lisible/shared/variants";
import type { PreviewManifestV1, PreviewSettingsV1, PreviewVariantManifest } from "../vendor/lisible/shared/preview/protocol";

const root = resolve(import.meta.dirname, "..");
const vendorRoot = resolve(root, "vendor/lisible");
const distRoot = resolve(root, "dist/_previews");
const cacheRoot = resolve(root, ".cache/lisible-previews");
const source = JSON.parse(await readFile(resolve(vendorRoot, "source.json"), "utf8")) as PreviewManifestV1["source"];
const builderVersion = "1";

const capabilities = [
  "version",
  "variant",
  "path",
  "locale",
  "theme",
  "accent",
  "title",
  "author",
  "density",
  "coverPosition",
  "covers",
  "featured",
  "relatedPosts",
  "motion",
  "viewport",
] satisfies Array<keyof PreviewSettingsV1>;

async function hashTree(paths: string[]): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(builderVersion);

  async function visit(path: string) {
    const stats = await lstat(path);
    const name = path.split("/").at(-1) ?? "";
    if (["node_modules", "dist", ".astro", ".cache"].includes(name)) return;
    hasher.update(relative(vendorRoot, path));
    if (stats.isSymbolicLink()) {
      hasher.update(`link:${await readlink(path)}`);
      return;
    }
    if (stats.isDirectory()) {
      for (const entry of (await readdir(path)).sort()) await visit(resolve(path, entry));
      return;
    }
    hasher.update(await readFile(path));
  }

  for (const path of paths) await visit(path);
  return hasher.digest("hex");
}

async function run(command: string[], cwd: string, env: Record<string, string>) {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, ...env },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed with exit code ${exitCode}`);
}

function routes(basePath: string): PreviewVariantManifest["routes"] {
  const at = (path: string) => `${basePath}${path.replace(/^\/+/, "")}`;
  return {
    fr: {
      home: at("/landing/french/"),
      blog: at("/blog/"),
      post: at("/blog/demo-fonctionnalites/"),
      tags: at("/tags/"),
      archives: at("/archives/"),
      about: at("/about/"),
    },
    en: {
      home: at("/en/"),
      blog: at("/en/blog/"),
      post: at("/en/blog/demo-fonctionnalites/"),
      tags: at("/en/tags/"),
      archives: at("/en/archives/"),
      about: at("/en/about/"),
    },
  };
}

async function buildVariant(variant: (typeof VARIANTS)[number]): Promise<PreviewVariantManifest> {
  const variantRoot = resolve(vendorRoot, "versions", variant.id);
  const buildHash = await hashTree([resolve(vendorRoot, "shared"), variantRoot]);
  const cached = resolve(cacheRoot, buildHash, variant.id);
  const destination = resolve(distRoot, variant.id);
  const basePath = `/_previews/${variant.id}/`;

  await rm(destination, { recursive: true, force: true });
  try {
    await lstat(resolve(cached, "index.html"));
    console.log(`[previews] ${variant.id}: reusing ${buildHash.slice(0, 12)}`);
  } catch {
    console.log(`[previews] ${variant.id}: installing dependencies`);
    await run(["bun", "install", "--frozen-lockfile"], variantRoot, {});
    console.log(`[previews] ${variant.id}: building ${buildHash.slice(0, 12)}`);
    await mkdir(resolve(cacheRoot, buildHash), { recursive: true });
    await run(["bun", "run", "build"], variantRoot, {
      LISIBLE_PREVIEW: "1",
      LISIBLE_PREVIEW_BASE: basePath,
      LISIBLE_PREVIEW_OUT_DIR: cached,
    });
  }

  await cp(cached, destination, { recursive: true, force: true });
  return {
    id: variant.id as PublicVariant,
    label: variant.label,
    description: variant.description,
    basePath,
    buildHash,
    routes: routes(basePath),
    capabilities: [...capabilities],
  };
}

await mkdir(distRoot, { recursive: true });
const queue = [...VARIANTS];
const manifests: PreviewVariantManifest[] = [];

await Promise.all(Array.from({ length: 2 }, async () => {
  while (queue.length > 0) {
    const variant = queue.shift();
    if (variant) manifests.push(await buildVariant(variant));
  }
}));

const order = new Map(VARIANTS.map((variant, index) => [variant.id, index]));
manifests.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
const manifest: PreviewManifestV1 = {
  version: 1,
  source,
  generatedAt: new Date().toISOString(),
  variants: manifests,
};
await writeFile(resolve(distRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[previews] ready: ${manifests.length} variants from ${source.sha.slice(0, 12)}`);
