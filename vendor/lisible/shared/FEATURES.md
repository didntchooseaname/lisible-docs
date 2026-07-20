# Fonctionnalités cœur (identiques pour les 4 versions)

Inspirées de ../documentationv2 (Astro, static, bun). Chaque version DOIT implémenter tout ce qui suit. Les composants visuels changent selon le kit, les fonctionnalités non.

## Stack

- Astro en dernière version stable (7+), `output: 'static'`, TypeScript strict, alias `@/*` vers `src/*`
- `@astrojs/react` (React 19, îlots uniquement)
- Tailwind CSS v4 via `@tailwindcss/vite` (PAS de tailwind.config, tokens CSS-first dans `src/styles/global.css` copié depuis `shared/theme.css`)
- `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`
- `clsx` + `tailwind-merge` (helper `cn()` dans `src/lib/utils.ts`), `lucide-react` pour les icônes
- Package manager: bun. Scripts: `dev`, `build` (= `astro build`), `preview`
- TOUTES les dépendances en dernière version (`bun outdated` doit être vide)

## i18n (obligatoire, déjà câblée, pas "prévue")

- i18n native d'Astro: `i18n: { locales: ['fr', 'en'], defaultLocale: 'fr' }`. FR sans préfixe (`/blog/...`), EN préfixé (`/en/blog/...`).
- Contenu: `src/content/blog/fr/` et `src/content/blog/en/` (7 fichiers chacun: 6 publiés + 1 brouillon), copiés depuis `shared/content/blog/`. La locale d'un article vient du préfixe de son id; le lien de traduction est le nom de fichier identique. L'URL retire le préfixe de locale: `/blog/bienvenue` et `/en/blog/bienvenue`.
- Toutes les chaînes d'UI dans `src/i18n/ui.ts` (dict typé fr/en + helper `t(locale)`), AUCUN texte d'interface en dur dans les composants: nav, recherche, TOC, temps de lecture ("X min de lecture" / "X min read"), dates (Intl.DateTimeFormat par locale), prev/next, footer, newsletter, 404, tags.
- Pages: chaque route FR a son équivalente EN sous `src/pages/en/` (wrappers minces, la logique vit dans des composants/layouts paramétrés par locale).
- `<html lang>` correct par page (fr ou en); Pagefind détecte la langue par page automatiquement.
- Sélecteur de langue dans le header (FR/EN): pointe vers la page équivalente traduite quand elle existe, sinon vers l'index du blog de la locale cible. Accessible clavier, aria-label localisé.
- SEO: `<link rel="alternate" hreflang>` (fr, en, x-default) sur chaque page qui a un équivalent; option i18n de @astrojs/sitemap configurée.
- RSS par locale: `/rss.xml` (articles FR) et `/en/rss.xml` (articles EN).
- Tags: les slugs de tags sont partagés entre locales; les pages tags existent dans les deux locales et listent les articles de leur locale.

## Navigation sans rechargement (obligatoire)

- `ClientRouter` (astro:transitions) monté dans le layout de base: TOUTES les navigations internes passent par les view transitions, zéro full reload. La meta `astro-view-transitions-enabled` doit être présente dans le HTML de chaque page.
- Prefetch agressif: `prefetch: { prefetchAll: true, defaultStrategy: 'hover' }` dans astro.config, pour des transitions perçues comme instantanées.
- Aucun lien interne avec `data-astro-reload`. Aucun formulaire qui recharge la page.
- Tous les scripts client se ré-initialisent sur `astro:page-load`; le thème est ré-appliqué sur `astro:after-swap` (voir THEME.md); thème ET langue survivent à toute navigation.
- Transitions discrètes (fade court), `prefers-reduced-motion` respecté.
- Le switcher de thème porte `transition:persist`. La modal de recherche se ferme proprement à la navigation.

## Contenu

- Content collection `blog` (loader glob, `src/content/blog/`), schéma zod:
  `title` (string, max 70), `description` (string, max 160), `pubDate` (coerce date), `updatedDate` (coerce date, optionnel), `tags` (string[], défaut []), `draft` (boolean, défaut false)
- Articles de démo: copier tels quels depuis `shared/content/blog/` (fr/ et en/, ne pas les modifier). Copier aussi `shared/content/public-images/demo-ilots.svg` vers `public/images/demo-ilots.svg`.
- Brouillons: visibles en dev, exclus en prod (liste, RSS, sitemap, tags), helper central `getPublishedPosts(locale)` dans `src/lib/posts.ts`
- Tri par pubDate décroissante partout (l'article démo du 2026-07-17 doit apparaître en premier)

## Pages (x2 locales)

- `/` : hero (titre du blog + tagline + CTA newsletter visuel), 2 articles mis en avant, derniers articles
- `/blog` : tous les articles groupés par année
- `/blog/[slug]` : article avec prose stylée, TOC, métadonnées (date, temps de lecture, tags), navigation article précédent/suivant, barre de progression de lecture, bouton retour en haut
- `/tags` et `/tags/[tag]`
- `/about`, `/404`
- `/rss.xml`, `robots.txt` (endpoint dynamique référençant le sitemap)
- Les équivalents EN sous `/en/...` (le 404 peut rester unique et bilingue)

## Fonctionnalités transverses

- Thème: voir `shared/THEME.md` (dark first, switcher, no-flash, convention classe `dark`)
- Accent personnalisable: color picker client-side dans le header, persisté en localStorage, défaut webmaster dans `SITE.accent`, contraste garanti dans les deux modes (contrat détaillé dans `shared/THEME.md`)
- Code: `astro-expressive-code` (dernière version) avec TOUTES ses fonctionnalités, en remplacement du Shiki brut (`markdown.syntaxHighlight: false`, intégration placée AVANT mdx):
  - thèmes `github-dark`/`github-light` avec DARK EN PREMIER dans le tableau (dark first: les couleurs par défaut inline doivent être celles du dark), liés à la CLASSE `.dark` (`useDarkModeMediaQuery: false`, `themeCssSelector` mappant github-dark sur `.dark` et github-light sur `:root:not(.dark)`; ATTENTION: la référence documentationv2 utilise `[data-theme=...]`, ce qui ne matche JAMAIS chez nous: interdiction d'un sélecteur data-theme dans la config EC)
  - preuve de contraste exigée en dark: dans le HTML/CSS généré, les couleurs de syntaxe, fonds de frames, marqueurs de lignes ({n}/ins/del) et marqueurs de mots visibles en mode dark proviennent de github-dark (fonds de marqueurs translucides sombres, texte clair), jamais de github-light; vérification visuelle obligatoire au navigateur dans les deux modes avant livraison
  - frames éditeur et terminal avec titres (`title="..."`, `frame="terminal"`), bouton copier intégré d'Expressive Code (tooltip localisé via ses options)
  - numéros de ligne (`@expressive-code/plugin-line-numbers`), désactivés par défaut pour bash/ansi/text/diff via `defaultProps` par langage
  - marqueurs de lignes `{n}`/`ins=`/`del=` et de mots `"..."` (plugin text-markers inclus), sections repliables (`@expressive-code/plugin-collapsible-sections`, `collapse={a-b}`, style collapsible-auto)
  - `wrap: true` par défaut, badge de langue en haut à droite (petit plugin local adapté de `../documentationv2/src/plugins/expressive-code/language-badge.js`)
  - `styleOverrides` branchés sur les tokens pour un match parfait avec le thème: `borderColor: var(--color-border)`, `borderRadius: var(--radius)`, `codeFontFamily: var(--font-mono)`, `uiFontFamily: var(--font-sans)`, fonds de frame sur `var(--color-card)`, titres/onglets sur les tokens muted, ombres désactivées ou très discrètes; AUCUNE couleur en dur hors tokens
  - l'ancien script client "bouton copier" du socle est SUPPRIMÉ (plus de double bouton); le bloc CSS `.astro-code` de theme.css devient inerte et reste tel quel (contrat des 148 lignes intangible)
  - bouton copier et tooltip RESTYLÉS, petits, discrets et modernes, suivant le thème dans les deux modes: case COMPACTE de 28x28px visuels (zone cliquable étendue invisiblement à 36px minimum via padding ou pseudo-élément), icône copy lucide FINE de 14px (stroke 1.5, pas l'icône par défaut d'EC), fantôme invisible par défaut, révélé au survol/focus du bloc (transition opacity 150-200ms), fond transparent puis `var(--color-secondary)` au hover, bordure `var(--color-border)` 1px, radius `var(--radius-sm)`; INVARIANT ANTI-BUG (constaté par l'utilisateur: icône qui disparaît au hover en dark): la couleur de l'icône est TOUJOURS `var(--color-muted-foreground)` au repos et `var(--color-foreground)` au hover, jamais héritée d'un swap d'arrière-plan EC; vérifier explicitement dans les DEUX thèmes que l'icône reste visible au survol (les valeurs calculées icône vs fond de hover doivent différer nettement); POSITION STABLE (bug constaté par l'utilisateur sur les frames terminal: le bouton se décale vers le bas au hover): le bouton copier est ancré en absolu en HAUT À DROITE du bloc, aligné verticalement avec la ligne du badge de langue et du titre de frame (juste à gauche du badge, petit écart), et sa position est IDENTIQUE dans tous les états (repos, hover, focus, après copie) et pour tous les types de blocs (frame éditeur titrée, frame terminal, bloc nu); aucune transition sur top/translate verticale, seule l'opacité change au reveal; au succès l'icône passe brièvement en check teinté `var(--color-accent)`; le tooltip/feedback ("Copié" / "Copied") est une petite bulle compacte aux tokens (`var(--color-popover)`, bordure border, texte foreground, font-sans 11-12px, radius-sm, ombre très légère), PAS le style par défaut d'Expressive Code; le tout via styleOverrides EC et un appoint CSS en fin de global.css, zéro couleur en dur
- TOC: générée depuis les headings (depth 2-3), scroll-spy (IntersectionObserver) qui surligne la section active, sidebar sticky en desktop, masquée en mobile
- Temps de lecture: 200 mots/minute
- Recherche: `astro-pagefind`, modal ouverte par bouton loupe et raccourci Ctrl+K / Cmd+K, lazy-load de pagefind, désactivée gracieusement en dev, UI localisée
- Carte de dépôt GitHub: directive `::github{repo="owner/repo"}` dans le markdown (remark-directive), rendue en carte custom stylée avec les tokens du thème et hydratée côté client via l'API publique GitHub (avatar, description, étoiles, forks, langage; gestion d'erreur silencieuse si l'API est indisponible). Implémentation de référence: `../documentationv2/src/plugins/remark-directive-rehype.js`, `rehype-component-github-card.mjs` et `src/scripts/github-card.ts`
- Aperçus de liens: une URL nue seule sur sa ligne devient une carte OpenGraph (titre, description, image, favicon, domaine) construite AU BUILD via open-graph-scraper, avec cache disque `.link-card-cache.json` à la racine du projet (pas de fetch en dev, dégradation en lien simple si le scrape échoue). Implémentation de référence: `../documentationv2/src/plugins/remark-link-card.ts` et `src/styles/link-card.css`. Les URLs des ancres autoliées dans un paragraphe restent des liens normaux
- SEO: composant Head avec title, description, canonical, OpenGraph complet (og:locale correct), Twitter card, sitemap, lien RSS, hreflang
- Header sticky: nom du site, nav (Blog, Tags, About localisés), bouton recherche, sélecteur de langue, switcher de thème
- Footer: copyright, liens sociaux (GitHub, RSS), mention "Propulsé par Astro" localisée
- Accessibilité: skip-link, focus visibles, aria-labels localisés sur tous les boutons icône, hiérarchie de headings stricte, prefers-reduced-motion respecté

## Performance et SEO (Lighthouse, obligatoire)

Objectif chiffré, vérifié par audit Lighthouse réel (mobile, `google-chrome-stable` headless) sur la home ET une page article: Performance >= 90, Accessibility >= 95, Best Practices >= 95, SEO >= 95.

- Fonts: self-hosted via fontsource, `font-display: swap`, `<link rel="preload">` des deux woff2 variables critiques (URL importée avec `?url` pour suivre le hash de build), `crossorigin`.
- Images: `width`/`height` explicites PARTOUT (zéro CLS), `loading="lazy"` sous la ligne de flottaison, `decoding="async"`, `<Image>` d'Astro pour les rasters. Les fonds animés des kits ont une couleur de fond de secours (pas de flash).
- JavaScript: îlots minimaux, `client:visible`/`client:idle` par défaut, `client:load` réservé au header/switcher/barre de progression. Jamais de three.js. Maximum un canvas/WebGL par page.
- HTML sémantique: `main`, `nav`, `article`, `time datetime`, un seul h1 par page, titres uniques < 60 caractères, meta descriptions uniques par page.
- JSON-LD: `WebSite` sur la home, `BlogPosting` sur chaque article (headline, description, datePublished, dateModified, author, inLanguage), via un composant partagé.
- OG image par défaut: `public/og-default.png` (1200x630, générée depuis un SVG avec `rsvg-convert`, sobre: fond noir, titre du site en Inter, accent vert), référencée par `og:image` et `twitter:image` avec dimensions.
- Déjà couverts mais comptent pour le score: canonical, hreflang, robots.txt, sitemap, lang par page, contraste 4.5:1, aria-labels, focus, skip-link, tap targets 44px.

## Vague 2 (validée par l'utilisateur, obligatoire sur les 6 projets)

### Contrat transverse: feature flags + documentation

- `src/site.config.ts` exporte `FEATURES`, un objet de flags typés qui active/désactive CHAQUE fonctionnalité de cette vague (et les existantes quand c'est pertinent): `callouts`, `mdxComponents`, `imageZoom`, `headingAnchors`, `relatedPosts`, `math`, `mermaid`, `drawio`, `ogPerPost`, `llmsTxt`, `aiButtons`, `socialShare`, `styledRss`, `webmentions`, `comments`, `newPostCli` (toujours dispo), `linkCheck`, `covers`, `pinned`, `pagination` (objet `{ enabled, pageSize }`), `archives`, `series`, `commandPalette`. Un flag à false coupe PROPREMENT la feature: plugin retiré du pipeline markdown (build), composant non rendu (UI), page non générée (routes), script non chargé. Zéro trace dans dist quand désactivé.
- Webmentions et commentaires demandent des comptes externes: implémentés mais `false` par défaut, avec une config dédiée à remplir (`WEBMENTIONS = { domain }`, `COMMENTS = { provider: 'giscus' | 'bluesky', ... }`) et une erreur de build claire si activés sans config.
- DOCUMENTATION obligatoire: `README.md` complet à la racine de chaque version, EN ANGLAIS (comme le README racine), SANS aucune mention d'IA (jamais de "generated by/with", Claude, Anthropic, co-authored, AI...), SANS emoji, SANS tiret long (em/en dash): présentation, démarrage, arborescence, tableau de TOUS les feature flags (nom, effet, défaut, config associée), guide de chaque fonctionnalité (écrire un article, callouts, math, diagrammes, séries, covers, épinglage, i18n, thème/accent, déploiement). Le README du socle fait foi, les versions l'adaptent (nom + spécificités kit).

### Réactivité au thème en direct (sans refresh)

Tout réagit AU VOL au switcher de thème ET au picker d'accent, sans rechargement: Mermaid se re-rend avec le thème correspondant (pattern documentationv2: MutationObserver sur la classe de html), draw.io rebascule son fond/cadre, les images OG et embeds restent corrects, la constellation (organique) se re-teinte déjà. Aucun élément ne doit rester bloqué sur l'ancien thème après un toggle.

### Lecture

- Callouts/admonitions: `:::note`, `:::tip`, `:::warning`, `:::caution`, `:::important` via remark-directive, stylés aux tokens (bordure gauche accent ou sémantique, icône lucide, titre localisable, variante repliable `:::note[titre]{collapse}`).
- Composants MDX: `Tabs`, `Steps`, `Spoiler` utilisables dans les articles .mdx, stylés aux tokens, accessibles clavier. CRITÈRES ANTI-BUG Steps (exigences utilisateur, à vérifier VISUELLEMENT dans le rendu de demo-composants):
  1. Numérotation unique: le composant gère SEUL ses numéros (cercle numéroté); la liste markdown interne ne doit JAMAIS afficher ses propres numéros en plus (`list-style: none`, marqueurs de l'`ol` interne neutralisés). Chaque étape affiche EXACTEMENT UN numéro.
  2. Alignement vertical du titre: le titre de chaque étape est PARFAITEMENT centré verticalement par rapport au cercle contenant le chiffre (le milieu du texte du titre aligné avec le centre du cercle, pas décalé vers le haut ni le bas). En pratique: l'en-tête de l'étape (cercle + titre) est un flex `align-items: center`, le titre sans marge parasite (`margin: 0`, `line-height` maîtrisée), et si le corps de l'étape suit sous le titre, seul le titre est aligné au cercle. Vérifier que titre et cercle partagent la même ligne médiane sur une étape à titre court ET à titre long (qui passe sur deux lignes: le cercle reste aligné à la première ligne ou au bloc selon le design, sans décalage disgracieux).
- Visionneuse d'images plein écran (flag `imageZoom`): au CLIC sur toute image de prose, mode plein écran en overlay avec ZOOM réel: molette et pincement pour zoomer, glisser pour se déplacer une fois zoomé, double-clic pour basculer zoom/ajustement, boutons + / - / réinitialiser accessibles, navigation flèches entre les images de l'article, Escape et clic sur le fond pour fermer, focus trap, boutons localisés, overlay correct dans les deux thèmes, compatible view transitions (ré-init sur astro:page-load). Implémentation de référence adaptable: `../documentationv2/src/scripts/image-lightbox.ts` (zoom molette, pan, galerie, clavier, focus trap éprouvés).
- Ancres de titres: icône lien au survol de chaque h2/h3/h4 (rehype-autolink-headings ou équivalent), clic = copie de l'URL avec feedback, aria-label localisé.
- Articles liés: bloc "À lire ensuite" en fin d'article, 2-3 articles de la même locale par similarité de tags (Jaccard) calculée au build, zéro JS client.
- KaTeX: remark-math + rehype-katex, CSS KaTeX self-hosted (pas de CDN), chargé uniquement sur les pages qui contiennent des maths.
- Mermaid: rendu client lazy (import dynamique quand un bloc ```mermaid est visible), pan/zoom, re-rendu au changement de thème, fallback code source si échec. CRITÈRE ANTI-BUG (exigence utilisateur): le bloc ```mermaid doit AFFICHER LE DIAGRAMME RENDU (SVG avec boîtes et flèches), jamais le code source mermaid en clair; une fois hydraté, le code sous-jacent est masqué (visible uniquement en no-JS ou en cas d'échec réel de rendu). ATTENTION Expressive Code: exclure le langage mermaid du pipeline EC (sinon EC gèle le bloc en frame de code et le rendu client ne s'applique pas). Acceptation: PREUVE VISUELLE au navigateur que le flowchart de l'article démo s'affiche en diagramme dans les deux thèmes.
- draw.io: composant d'intégration pour diagrammes .drawio ou SVG exportés, visionneuse interactive avec zoom/pan (viewer self-hosted, lazy en client:visible), thème respecté en direct, fallback image statique.

### SEO, partage, rayonnement

- OG par article: image OpenGraph unique générée AU BUILD pour chaque article et chaque locale (titre, description tronquée, branding accent, fond noir cohérent), via satori + resvg ou astro-og-canvas (dernière version), référencée par og:image/twitter:image de l'article; la home et les pages génériques gardent og-default.png.
- llms.txt: `/llms.txt` (index descriptif + liens .md), `/llms-full.txt` (contenu complet), et une version `.md` propre de chaque article accessible à URL prévisible (`/blog/<slug>.md` ou équivalent documenté).
- Boutons IA: sur chaque article, menu discret "Copier en Markdown" + "Ouvrir dans Claude" + "Ouvrir dans ChatGPT" (URLs q= standard), localisé.
- Partage social: rangée discrète en fin d'article: X, Bluesky, LinkedIn, Mastodon (avec instance demandée une fois puis mémorisée en localStorage), copier le lien; zéro SDK externe, liens d'intention simples.
- RSS stylé: feuille XSL type pretty-feed rendant /rss.xml lisible dans le navigateur avec explication RSS, dans les deux locales.
- Webmentions (flag off par défaut): récupération webmention.io au build + section likes/reposts/mentions sous l'article.
- Commentaires (flag off par défaut): provider giscus (thème synchronisé dark/light, lazy en client:visible) OU replies Bluesky (config `COMMENTS.provider`).

### Identité (décision utilisateur)

- Le projet s'appelle Lisible. Baseline FR: "Un framework de blog minimaliste et rapide, pensé pour la lecture." Baseline EN: "A minimal, fast blog framework built for reading." `SITE.title = "Lisible"`, plus AUCUNE mention de Mathys nulle part (auteur par défaut: "Votre nom", placeholder documenté).
- La variante active se choisit à la racine dans `lisible.config.json` (scripts proxy `bun run dev|build|preview` à la racine, `bun run preview:all` pour comparer). Le README racine documente tout avec des aperçus (docs/previews/). Chaque variante recevra en vague 2 son README détaillé conforme au contrat de documentation ci-dessus.

### Normalisation pour commit GitHub (décision utilisateur, toutes les versions)

- Aucune info perso nulle part (pas d'email, pas de vrai nom): l'auteur de TOUS les blogs est le placeholder `SITE.author = "Votre nom"`; `SITE.social.github` reste `"https://github.com/"` (placeholder que l'auteur remplira); `SITE.repo.url` reste vide par défaut (le bouton "Modifier sur GitHub" ne s'affiche donc pas tant que l'auteur ne l'a pas renseigné). Ces placeholders sont l'état commit-ready.
- Footer, ligne "propulsé par" (identique partout, dans les deux locales): "Propulsé par Astro et Lisible" / "Powered by Astro and Lisible", où "Astro" pointe vers https://astro.build et "Lisible" pointe vers https://github.com/didntchooseaname/lisible. Le lien Lisible est le dépôt DU FRAMEWORK (constante partagée, ex. `SITE.framework = { name: "Lisible", url: "https://github.com/didntchooseaname/lisible" }`), distinct de `SITE.repo` (le futur dépôt du blog de l'auteur). Le connecteur "et"/"and" vit dans `i18n.footer` (ex. `poweredByAnd`).
- La ligne copyright `© {année} {SITE.author}` reste (avec le placeholder "Votre nom").
- Dépôt propre: `.gitignore` racine (node_modules, dist, .astro, .link-card-cache.json, .env, .DS_Store...). CLAUDE.md jamais commité (déjà dans .git/info/exclude).

### Modifier sur GitHub (toutes les versions)

- `src/site.config.ts` gagne `repo` optionnel: `{ url: "https://github.com/<owner>/<repo>", branch: "main", contentBase: "versions/<variante>" }` (placeholder vide par défaut, documenté).
- Quand `repo.url` est renseigné: bouton discret "Modifier cette page sur GitHub" / "Edit this page on GitHub" en bas de CHAQUE article (et des pages about), pointant vers `<url>/edit/<branch>/<contentBase>/src/content/blog/<locale>/<fichier>.md`. Icône lucide, aria-label localisé, rel externe. Quand `repo.url` est vide: aucun bouton, zéro trace dans dist.
- Les dates restent affichées sur chaque article: date de publication ET date de mise à jour quand elle existe (`time datetime`, format localisé), y compris sur les cartes de liste pour la publication.

### Expérience auteur

- CLI: `bun new-post <slug>` (script scripts/new-post.ts): crée l'article dans la locale demandée (`--locale fr|en`, défaut fr) avec frontmatter valide pré-rempli (date du jour, draft true), refuse d'écraser; `bun new-post <slug> --translate` crée le miroir dans l'autre locale. Snippets VS Code (.vscode/*.code-snippets) pour le frontmatter.
- Vérification qualité: `bun check-links` (liens internes/externes du contenu, échec sur 4xx/5xx, concurrence limitée, timeout) et `bun check-assets` (budgets de taille par type sur dist, seuils configurables), inspirés de documentationv2, branchés dans un script `check:all`.
- Covers: champ frontmatter optionnel `cover` (image() Astro) + `coverAlt`, affiché sur l'article et sur les cartes, pipeline d'images Astro (formats modernes, dimensions explicites, zéro CLS).
- POSITION de la bannière (cover) sur l'article, IDENTIQUE sur les 7 variantes, pilotée par `SITE.coverPosition: "up" | "down"` (défaut `"down"`):
  - `"down"` (DÉFAUT, comportement de référence = celui de H4X0R): la bannière se place APRÈS le bloc d'en-tête (titre + date/temps de lecture + tags), juste AVANT le corps de l'article (la prose). C'est le comportement de base de toutes les variantes.
  - `"up"`: la bannière se place AU-DESSUS du titre (en tête d'article).
  - Les deux positions gardent l'espacement uniforme (>= 24px du bloc adjacent au-dessus, >= 32px vers le contenu qui suit). Documenter l'option dans le README de chaque variante.
- Barre de progression de lecture: OBLIGATOIRE et fonctionnelle sur la page article de CHAQUE variante (barre fine en haut du viewport, largeur proportionnelle au scroll de l'article, teintée à l'accent, re-init sur astro:page-load, respecte prefers-reduced-motion). Si une variante ne la rend pas ou l'a cassée, l'ajouter/réparer.
- Épinglage: champ frontmatter `featured: boolean`; les épinglés remontent dans la section vedette de la home (sinon fallback sur les plus récents).

### Structure

- Pagination: `/blog/2`, `/blog/3`... et pagination des pages de tags, taille via `FEATURES.pagination.pageSize`, liens précédent/suivant accessibles, URLs stables, rel prev/next.
- Archives: page `/archives` (et `/en/archives`) timeline compacte groupée par année puis mois, toujours liée dans la navigation haute et jamais dans le footer.
- Séries: champ frontmatter `series` (slug) + `seriesOrder` (number): bloc de navigation de série dans l'article (position, précédent/suivant de la série, liste dépliable), index `/series`, page `/series/[slug]` listant la série dans l'ordre et temps de lecture cumulé. Le lien `Séries` de la navigation haute n'apparaît que si au moins un article publié de la locale possède le champ `series`; il n'est jamais rendu dans le footer.
- Organique: la constellation est un graphe interactif. Chaque nœud se déplace au pointeur maintenu, conserve sa nouvelle position pendant la visite et met en évidence ses nœuds et liens voisins pendant le survol ou le déplacement.
- Command palette: le Ctrl+K devient une palette complète: en plus de la recherche Pagefind, des actions filtrables au clavier: basculer le thème, changer de langue, réinitialiser l'accent, copier l'URL courante, aller à Blog/Tags/Archives/À propos, ouvrir le RSS. Sections séparées, localisée, navigable aux flèches.

### Démo

L'article démo (fr + en) est étendu pour montrer: callouts (toutes variantes), un tableau de composants MDX si l'article passe en .mdx (sinon un second article démo .mdx dédié), une formule KaTeX inline et un bloc, un diagramme Mermaid, un diagramme draw.io, le zoom d'images, les ancres de titres, le bloc articles liés, les boutons de partage et IA, et sa checklist de fonctionnalités mise à jour.

## Hors périmètre (décision utilisateur)

CMS git-based (Keystatic/Sveltia), collection notes/microblog, collections authors/projects, PWA/service worker, analytics.
