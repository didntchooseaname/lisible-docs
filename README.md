<div align="center">

<img src="docs/banner.svg" alt="Lisible Documentation" width="100%">

# Lisible Documentation

Official, bilingual documentation for the Lisible framework. Built from the Organique variant as a standalone Astro documentation site.

</div>

## What this repository contains

- 18 French MDX chapters and 18 mirrored English MDX chapters;
- stable landing pages at `/fr/` and `/en/`, plus the adaptive `x-default` entry at `/`, with documentation under `/docs/` and `/en/docs/`;
- a category-based left navigation and per-page table of contents;
- Pagefind full-text search and command palette;
- Astro view transitions, dark/light themes and a reader-controlled accent;
- MDX by default, including Markdown, tabs, steps, spoilers, callouts, footnotes, KaTeX and interactive Mermaid diagrams;
- canonical URLs, hreflang, sitemap, robots, JSON-LD and `llms.txt` exports;
- automated content parity and internal-link validation.

This is documentation, not a blog. It contains no post, tag, archive, series, RSS or comment routes.

## Run locally

```bash
bun install
bun run dev
```

Pagefind generates its full-text index during a production build. Development mode keeps the search dialog and commands working without requiring an old `dist/` directory.

```bash
bun run check:all
bun run preview
```

## Content structure

```text
src/content/docs/
├─ fr/
│  ├─ discover/
│  ├─ getting-started/
│  ├─ authoring/
│  ├─ features/
│  ├─ customize/
│  ├─ operations/
│  └─ reference/
└─ en/
   └─ same structure and filenames
```

Every page uses this frontmatter:

```yaml
---
title: "Page title"
description: "Standalone description used for SEO and search."
category: discover
order: 0
badge: "Optional"
draft: false
---
```

The French and English files must share the same relative path and frontmatter keys. `bun run check:content` enforces that contract and validates internal documentation links.

## Architecture

- `src/components/LandingPage.astro` owns the interactive bilingual landing and its Organique blog preview.
- `src/components/SeoMeta.astro` owns canonical, hreflang, OpenGraph and Twitter metadata.
- `src/layouts/DocsLayout.astro` owns metadata and the three-column documentation shell.
- `src/components/DocsSidebar.astro` builds the category journey from the content collection.
- `src/components/DocsSearch.astro` owns Pagefind and command actions.
- `src/config/docs.ts` owns category ordering and translated category labels.
- `src/i18n/ui.ts` owns all documentation interface strings.
- `src/lib/docs.ts` owns collection queries, URLs, translations and adjacent pages.
- `src/content/docs/` is the only documentation content source.
- `bun run generate:og` rebuilds the four localized 1200×630 social previews.

Set the public origin in `src/site.config.ts` before deployment. The per-page contribution link targets `https://github.com/didntchooseaname/lisible-docs/edit/main/src/content/docs/<locale>/<page>.mdx`, so a signed-in GitHub user can edit the source and propose a pull request.

## License

MIT. See [LICENSE](LICENSE).
