import { defineConfig } from "astro/config";
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";
import pagefind from "astro-pagefind";
import { pluginCollapsibleSections, pluginCollapsibleSectionsTexts } from "@expressive-code/plugin-collapsible-sections";
import { pluginFramesTexts } from "@expressive-code/plugin-frames";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { SITE } from "./src/site.config";
import pagefindDev from "./src/lib/pagefind-dev";
import remarkCallouts from "./src/lib/remark-callouts";
import remarkDrawio from "./src/lib/remark-drawio";
import remarkGithubCard from "./src/lib/remark-github-card";
import remarkMermaid from "./src/lib/remark-mermaid";
import rehypeHeadingAnchors from "./src/lib/rehype-heading-anchors";
import { rehypeTaskCheckboxes } from "./src/lib/rehype-task-checkboxes";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge";
import { expressiveCodeTexts } from "./src/i18n/expressive-code";

pluginFramesTexts.addLocale("fr", expressiveCodeTexts.frames.fr);
pluginFramesTexts.addLocale("en", expressiveCodeTexts.frames.en);
pluginCollapsibleSectionsTexts.addLocale("fr", expressiveCodeTexts.collapsibleSections.fr);
pluginCollapsibleSectionsTexts.addLocale("en", expressiveCodeTexts.collapsibleSections.en);

export default defineConfig({
  devToolbar: { enabled: false },
  site: SITE.url,
  output: "static",
  trailingSlash: "always",
  i18n: {
    locales: ["fr", "en"],
    defaultLocale: "fr",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    expressiveCode({
      themes: ["github-dark", "github-light"],
      useDarkModeMediaQuery: false,
      emitExternalStylesheet: false,
      themeCssSelector: (theme) => (theme.type === "dark" ? ".dark" : ":root:not(.dark)"),
      getBlockLocale: ({ file }) => (/[\\/]en[\\/]/.test(file.path ?? "") ? "en" : "fr"),
      plugins: [pluginCollapsibleSections(), pluginLineNumbers(), pluginLanguageBadge()],
      defaultProps: {
        wrap: true,
        showLineNumbers: true,
        collapseStyle: "collapsible-auto",
        overridesByLang: {
          "ansi,bash,console,powershell,sh,shell,text,txt,zsh": { showLineNumbers: false },
        },
      },
      styleOverrides: {
        borderColor: "var(--color-border)",
        borderWidth: "1px",
        borderRadius: "var(--radius)",
        codeBackground: "var(--color-card)",
        codeFontFamily: "var(--font-mono)",
        codeFontSize: "0.875rem",
        codeLineHeight: "1.65",
        frames: {
          frameBoxShadowCssValue: "none",
          editorTabBarBackground: "var(--color-secondary)",
          editorTabBarBorderBottomColor: "var(--color-border)",
          editorActiveTabBackground: "var(--color-card)",
          editorActiveTabIndicatorTopColor: "var(--color-accent)",
          terminalBackground: "var(--color-card)",
          terminalTitlebarBackground: "var(--color-secondary)",
          terminalTitlebarBorderBottomColor: "var(--color-border)",
        },
      },
    }),
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/preview/blog/"),
      i18n: {
        defaultLocale: "fr",
        locales: { fr: "fr-FR", en: "en-US" },
      },
    }),
    pagefind(),
  ],
  vite: {
    plugins: [pagefindDev(), tailwindcss()],
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime", "mermaid"],
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkDirective, remarkGithubCard, remarkCallouts, remarkMermaid, remarkDrawio, remarkMath],
      rehypePlugins: [rehypeTaskCheckboxes, rehypeHeadingIds, rehypeHeadingAnchors, rehypeKatex],
    }),
  },
});
