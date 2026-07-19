import type { Locale } from "@/i18n/ui";

export const CATEGORY_ORDER = [
  "discover",
  "start",
  "author",
  "features",
  "customize",
  "operate",
  "reference",
] as const;

export type DocCategory = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<Locale, Record<DocCategory, string>> = {
  fr: {
    discover: "Découvrir Lisible",
    start: "Bien démarrer",
    author: "Rédiger et publier",
    features: "Fonctionnalités",
    customize: "Personnaliser",
    operate: "Exploiter",
    reference: "Référence",
  },
  en: {
    discover: "Discover Lisible",
    start: "Getting started",
    author: "Author and publish",
    features: "Features",
    customize: "Customize",
    operate: "Operate",
    reference: "Reference",
  },
};
