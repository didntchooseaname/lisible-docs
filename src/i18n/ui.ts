import { getRelativeLocaleUrl } from "astro:i18n";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const ogLocales: Record<Locale, string> = { fr: "fr_FR", en: "en_US" };

export function otherLocale(locale: Locale): Locale {
  return locale === "fr" ? "en" : "fr";
}

export function localeUrl(locale: Locale, slug = ""): string {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  const url = getRelativeLocaleUrl(locale, clean);
  return url.endsWith("/") ? url : `${url}/`;
}

const fr = {
  header: {
    documentation: "Documentation",
    home: "Accueil de la documentation",
    repository: "Dépôt GitHub",
  },
  sidebar: {
    title: "Parcours",
    open: "Ouvrir la navigation",
    close: "Fermer la navigation",
  },
  page: {
    onThisPage: "Sur cette page",
    previous: "Précédent",
    next: "Suivant",
    edit: "Modifier cette page",
    lastReviewed: "Documentation maintenue avec Lisible",
  },
  search: {
    title: "Rechercher dans la documentation",
    placeholder: "Rechercher ou saisir une commande…",
    hint: "Recherchez une API, une commande ou un concept.",
    noResults: "Aucun résultat dans la documentation.",
    devNotice: "La recherche Pagefind est disponible après un build.",
    pages: "Pages",
    actions: "Actions",
    toggleTheme: "Basculer le thème",
    switchLanguage: "Afficher la documentation en anglais",
    copyUrl: "Copier l’URL de la page",
    copied: "URL copiée",
  },
  footer: {
    sentence: "Documentation officielle de Lisible, propulsée par Astro.",
    license: "Licence MIT",
  },
  notFound: {
    title: "Page introuvable",
    description: "Cette page de documentation n’existe pas ou a été déplacée.",
    back: "Retour à la documentation",
  },
  post: { spoilerReveal: "Afficher le contenu masqué" },
  accent: {
    open: "Choisir la couleur d’accent",
    title: "Couleur d’accent",
    svLabel: "Saturation et luminosité",
    hueLabel: "Teinte",
    svValueText: "Saturation {s}%, luminosité {v}%",
    hueValueText: "Teinte {h}°",
    reset: "Réinitialiser",
  },
  lightbox: {
    title: "Visionneuse d’images",
    close: "Fermer la visionneuse",
    prev: "Image précédente",
    next: "Image suivante",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    reset: "Réinitialiser le zoom",
  },
  a11y: {
    skipToContent: "Aller au contenu principal",
    toggleTheme: "Changer de thème",
    openSearch: "Ouvrir la recherche (Ctrl+K)",
    closeSearch: "Fermer la recherche",
    languageSwitcher: "Choix de la langue",
    frenchVersion: "Version française",
    englishVersion: "English version",
  },
};

type Dictionary = typeof fr;

const en: Dictionary = {
  header: {
    documentation: "Documentation",
    home: "Documentation home",
    repository: "GitHub repository",
  },
  sidebar: {
    title: "Learning path",
    open: "Open navigation",
    close: "Close navigation",
  },
  page: {
    onThisPage: "On this page",
    previous: "Previous",
    next: "Next",
    edit: "Edit this page",
    lastReviewed: "Documentation maintained with Lisible",
  },
  search: {
    title: "Search the documentation",
    placeholder: "Search or type a command…",
    hint: "Search for an API, a command or a concept.",
    noResults: "No result in the documentation.",
    devNotice: "Pagefind search is available after a build.",
    pages: "Pages",
    actions: "Actions",
    toggleTheme: "Toggle theme",
    switchLanguage: "Show documentation in French",
    copyUrl: "Copy page URL",
    copied: "URL copied",
  },
  footer: {
    sentence: "Official Lisible documentation, powered by Astro.",
    license: "MIT License",
  },
  notFound: {
    title: "Page not found",
    description: "This documentation page does not exist or has moved.",
    back: "Back to the documentation",
  },
  post: { spoilerReveal: "Reveal hidden content" },
  accent: {
    open: "Choose accent color",
    title: "Accent color",
    svLabel: "Saturation and brightness",
    hueLabel: "Hue",
    svValueText: "Saturation {s}%, brightness {v}%",
    hueValueText: "Hue {h}°",
    reset: "Reset",
  },
  lightbox: {
    title: "Image viewer",
    close: "Close viewer",
    prev: "Previous image",
    next: "Next image",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset zoom",
  },
  a11y: {
    skipToContent: "Skip to main content",
    toggleTheme: "Toggle theme",
    openSearch: "Open search (Ctrl+K)",
    closeSearch: "Close search",
    languageSwitcher: "Language selection",
    frenchVersion: "Version française",
    englishVersion: "English version",
  },
};

const dictionaries = { fr, en } as const;

export function t(locale: Locale): Dictionary {
  return dictionaries[locale];
}
