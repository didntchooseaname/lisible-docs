import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = join(import.meta.dirname, "..");
const sourceDirectory = join(root, "src/assets/open-graph");
const outputDirectory = join(root, "public/open-graph");

type Locale = "fr" | "en";
type Variant = {
  name: string;
  locale: Locale;
  kind: "landing" | "docs" | "preview";
  eyebrow: string;
  title: string[];
  description: string;
};

const variants: Variant[] = [
  {
    name: "landing-fr",
    locale: "fr",
    kind: "landing",
    eyebrow: "DOCUMENTATION OFFICIELLE",
    title: ["Publier devient", "plus simple."],
    description: "Du premier fichier au site prêt à partager.",
  },
  {
    name: "landing-en",
    locale: "en",
    kind: "landing",
    eyebrow: "OFFICIAL DOCUMENTATION",
    title: ["Publishing gets", "simpler."],
    description: "From the first file to a site ready to share.",
  },
  {
    name: "docs-fr",
    locale: "fr",
    kind: "docs",
    eyebrow: "GUIDE BILINGUE",
    title: ["Documentation", "Lisible"],
    description: "Comprendre. Rédiger. Personnaliser. Publier.",
  },
  {
    name: "docs-en",
    locale: "en",
    kind: "docs",
    eyebrow: "BILINGUAL GUIDE",
    title: ["Lisible", "Documentation"],
    description: "Understand. Write. Customize. Publish.",
  },
  {
    name: "preview-fr",
    locale: "fr",
    kind: "preview",
    eyebrow: "PREVIEWER INTERACTIF",
    title: ["Six variantes.", "En direct."],
    description: "Testez chaque réglage sans compte ni installation.",
  },
  {
    name: "preview-en",
    locale: "en",
    kind: "preview",
    eyebrow: "INTERACTIVE PREVIEWER",
    title: ["Six variants.", "Live."],
    description: "Try every setting with no account or installation.",
  },
];

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character]!);
}

function textLines(lines: string[], x: number, startY: number, size: number, gap: number) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${startY + index * gap}" class="display" font-size="${size}">${escapeXml(line)}</text>`
  )).join("\n");
}

function interfacePanel(locale: Locale, kind: Variant["kind"]) {
  const labels = locale === "fr"
    ? ["Architecture", "Rédaction MDX", "SEO & découverte", "Déploiement"]
    : ["Architecture", "MDX authoring", "SEO & discovery", "Deployment"];

  if (kind === "landing") {
    return `
      <g transform="translate(786 148)">
        <rect width="324" height="344" rx="24" fill="#101713" stroke="#2B3A30"/>
        <circle cx="28" cy="27" r="5" fill="#22C55E"/>
        <circle cx="48" cy="27" r="5" fill="#35423A"/>
        <circle cx="68" cy="27" r="5" fill="#35423A"/>
        <path d="M24 61H300" stroke="#2B3A30"/>
        <rect x="24" y="88" width="78" height="8" rx="4" fill="#22C55E"/>
        <rect x="24" y="114" width="228" height="12" rx="6" fill="#F5F7F5"/>
        <rect x="24" y="138" width="178" height="12" rx="6" fill="#F5F7F5"/>
        <rect x="24" y="174" width="276" height="1" fill="#2B3A30"/>
        <rect x="24" y="201" width="132" height="86" rx="14" fill="#151F19" stroke="#2B3A30"/>
        <rect x="168" y="201" width="132" height="86" rx="14" fill="#151F19" stroke="#2B3A30"/>
        <path d="M48 258l20-20 17 14 29-34" fill="none" stroke="#22C55E" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M194 229h72M194 247h48M194 265h60" stroke="#A8B2AB" stroke-width="7" stroke-linecap="round"/>
        <rect x="24" y="307" width="276" height="12" rx="6" fill="#263129"/>
      </g>`;
  }

  if (kind === "preview") {
    const settings = locale === "fr"
      ? ["Variante", "Thème", "Couleur", "Couvertures"]
      : ["Variant", "Theme", "Color", "Covers"];
    return `
      <g transform="translate(716 120)">
        <rect width="418" height="408" rx="24" fill="#101713" stroke="#2B3A30"/>
        <rect x="18" y="18" width="260" height="372" rx="15" fill="#F4F7F4"/>
        <rect x="18" y="18" width="260" height="42" rx="15" fill="#E9EFEA"/>
        <circle cx="39" cy="39" r="5" fill="#22C55E"/>
        <path d="M57 35h61M57 43h38" stroke="#56655B" stroke-width="5" stroke-linecap="round"/>
        <rect x="40" y="91" width="74" height="7" rx="3.5" fill="#22C55E"/>
        <path d="M40 125h180M40 146h154" stroke="#17231B" stroke-width="12" stroke-linecap="round"/>
        <path d="M40 190h196" stroke="#C9D3CB"/>
        <rect x="40" y="219" width="87" height="91" rx="12" fill="#DCE6DE"/>
        <path d="M147 231h78M147 250h61M147 283h78M147 300h49" stroke="#859189" stroke-width="7" stroke-linecap="round"/>
        <rect x="40" y="339" width="196" height="8" rx="4" fill="#CBD5CD"/>
        <g transform="translate(296 22)">
          <text x="0" y="14" class="label" font-size="12" fill="#7F8B82" letter-spacing="1.5">SETTINGS</text>
          ${settings.map((label, index) => {
            const y = 41 + index * 70;
            return `<g transform="translate(0 ${y})">
              <text x="0" y="13" class="label" font-size="12" fill="#A8B2AB">${escapeXml(label)}</text>
              <rect y="23" width="102" height="35" rx="9" fill="#151F19" stroke="#2B3A30"/>
              ${index === 2
                ? '<circle cx="18" cy="40.5" r="8" fill="#22C55E"/><path d="M34 40.5h52" stroke="#566158" stroke-width="5" stroke-linecap="round"/>'
                : `<path d="M12 40.5h${index === 3 ? 56 : 69}" stroke="${index === 3 ? "#22C55E" : "#D6DED8"}" stroke-width="6" stroke-linecap="round"/>`}
            </g>`;
          }).join("")}
          <rect y="331" width="102" height="38" rx="10" fill="#22C55E"/>
          <path d="M24 350h54" stroke="#07110A" stroke-width="6" stroke-linecap="round"/>
        </g>
      </g>`;
  }

  return `
    <g transform="translate(764 132)">
      <rect width="350" height="378" rx="24" fill="#101713" stroke="#2B3A30"/>
      <rect x="24" y="24" width="112" height="11" rx="5.5" fill="#22C55E"/>
      <path d="M24 59H326" stroke="#2B3A30"/>
      ${labels.map((label, index) => {
        const y = 82 + index * 67;
        return `
          <g transform="translate(24 ${y})">
            <rect width="302" height="51" rx="12" fill="${index === 2 ? "#17261C" : "#131B16"}" stroke="${index === 2 ? "#2C7A45" : "#263129"}"/>
            <text x="17" y="31" class="label" font-size="15" fill="${index === 2 ? "#EAF8EE" : "#B8C2BB"}">${escapeXml(label)}</text>
            <path d="M274 19l7 7-7 7" fill="none" stroke="${index === 2 ? "#22C55E" : "#68736B"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </g>`;
      }).join("")}
      <rect x="24" y="350" width="216" height="6" rx="3" fill="#263129"/>
    </g>`;
}

function createSvg(variant: Variant) {
  const titleSize = variant.kind === "landing" ? 70 : 66;
  const titleGap = variant.kind === "landing" ? 78 : 72;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(variant.title.join(" "))}</title>
  <desc id="description">${escapeXml(variant.description)}</desc>
  <defs>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(897 188) rotate(138) scale(508 402)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22C55E" stop-opacity=".22"/>
      <stop offset="1" stop-color="#22C55E" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#D9FBE2" stroke-opacity=".045"/>
    </pattern>
    <style>
      .display { fill: #F5F7F5; font-family: Inter, Arial, sans-serif; font-weight: 760; letter-spacing: -2.4px; }
      .label { font-family: Inter, Arial, sans-serif; font-weight: 650; }
      .copy { font-family: Inter, Arial, sans-serif; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="#080D0A"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="42" y="42" width="1116" height="546" rx="32" fill="none" stroke="#2B3A30"/>
  <g transform="translate(82 78)">
    <rect width="42" height="42" rx="11" fill="#F5F7F5"/>
    <path d="M11 13h20M11 21h15M11 29h10" stroke="#080D0A" stroke-width="4" stroke-linecap="round"/>
    <path d="M26 29h5" stroke="#22C55E" stroke-width="4" stroke-linecap="round"/>
    <text x="58" y="27" class="label" font-size="19" fill="#F5F7F5" letter-spacing=".3">LISIBLE</text>
    <text x="144" y="27" class="copy" font-size="16" fill="#7F8B82">/ DOCS</text>
  </g>
  <text x="82" y="186" class="label" font-size="14" fill="#22C55E" letter-spacing="2.2">${escapeXml(variant.eyebrow)}</text>
  ${textLines(variant.title, 82, 270, titleSize, titleGap)}
  <text x="82" y="466" class="copy" font-size="23" fill="#A8B2AB">${escapeXml(variant.description)}</text>
  <g transform="translate(82 520)">
    <circle cx="6" cy="6" r="6" fill="#22C55E"/>
    <text x="24" y="12" class="label" font-size="15" fill="#D7DDD8" letter-spacing=".3">lisible.xsec.fr</text>
  </g>
  ${interfacePanel(variant.locale, variant.kind)}
</svg>`.replace(/[ \t]+$/gm, "");
}

await Promise.all([mkdir(sourceDirectory, { recursive: true }), mkdir(outputDirectory, { recursive: true })]);

for (const variant of variants) {
  const svg = createSvg(variant);
  await writeFile(join(sourceDirectory, `${variant.name}.svg`), svg);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(join(outputDirectory, `${variant.name}.png`));
}

console.log(`Open Graph assets generated: ${variants.map(({ name }) => `${name}.png`).join(", ")}`);
