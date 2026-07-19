import type { APIRoute } from "astro";
import { getDocs, docUrl } from "@/lib/docs";
import { SITE } from "@/site.config";

export async function getStaticPaths() {
  return [{ params: { llms: "llms" } }, { params: { llms: "llms-full" } }];
}

export const GET: APIRoute = async ({ params }) => {
  const [fr, en] = await Promise.all([getDocs("fr"), getDocs("en")]);
  const full = params.llms === "llms-full";
  const summary = [
    `# ${SITE.product}`,
    "",
    SITE.description,
    "",
    "## Français",
    ...fr.map((doc) =>
      `- [${doc.data.title}](${new URL(docUrl(doc), SITE.url)}): ${doc.data.description}`,
    ),
    "",
    "## English",
    ...en.map((doc) =>
      `- [${doc.data.title}](${new URL(docUrl(doc), SITE.url)}): ${doc.data.description}`,
    ),
  ];

  const corpus = full
    ? [
        "",
        "# Full corpus / Corpus complet",
        ...[...fr, ...en].flatMap((doc) => [
          "",
          `## ${doc.data.title}`,
          `URL: ${new URL(docUrl(doc), SITE.url)}`,
          `Language: ${doc.id.startsWith("en/") ? "en" : "fr"}`,
          "",
          doc.body ?? doc.data.description,
        ]),
      ]
    : [];

  return new Response([...summary, ...corpus].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
