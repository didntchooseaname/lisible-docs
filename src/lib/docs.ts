import { getCollection, type CollectionEntry } from "astro:content";
import { CATEGORY_ORDER, type DocCategory } from "@/config/docs";
import { localeUrl, type Locale } from "#src/i18n/ui";

export type DocEntry = CollectionEntry<"docs">;

export function docLocale(doc: DocEntry): Locale {
  return doc.id.startsWith("en/") ? "en" : "fr";
}

export function docSlug(doc: DocEntry): string {
  return doc.id.replace(/^(fr|en)\//, "");
}

export function docUrl(doc: DocEntry): string {
  const slug = docSlug(doc);
  return localeUrl(docLocale(doc), slug === "introduction" ? "docs" : `docs/${slug}`);
}

export async function getDocs(locale: Locale): Promise<DocEntry[]> {
  const docs = await getCollection("docs", ({ data, id }) =>
    !data.draft && id.startsWith(`${locale}/`),
  );
  return docs.sort((a, b) => {
    const category = CATEGORY_ORDER.indexOf(a.data.category as DocCategory) -
      CATEGORY_ORDER.indexOf(b.data.category as DocCategory);
    return category || a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, locale);
  });
}

export async function getDoc(locale: Locale, slug: string): Promise<DocEntry | undefined> {
  return (await getDocs(locale)).find((doc) => docSlug(doc) === slug);
}

export async function getAlternates(slug: string): Promise<Partial<Record<Locale, string>>> {
  const [fr, en] = await Promise.all([getDoc("fr", slug), getDoc("en", slug)]);
  return {
    ...(fr ? { fr: docUrl(fr) } : {}),
    ...(en ? { en: docUrl(en) } : {}),
  };
}

export function adjacentDocs(docs: DocEntry[], current: DocEntry) {
  const index = docs.findIndex((doc) => doc.id === current.id);
  return {
    previous: index > 0 ? docs[index - 1] : undefined,
    next: index >= 0 && index < docs.length - 1 ? docs[index + 1] : undefined,
  };
}
