# Thème standardisé (identique pour les 4 versions)

Style: Swiss Modernism 2.0, minimal, éditorial, dark first.
Référence design: grille 12 colonnes, hiérarchie typographique nette, espaces multiples de 4px, pas de décor gratuit.

## Tokens

Le fichier `shared/theme.css` est LA source de vérité. Chaque version le copie tel quel dans `src/styles/global.css` (seul ajout autorisé: les tokens spécifiques exigés par les composants du kit, ajoutés en fin de fichier sans modifier les tokens communs).

- Fonts: Inter Variable (texte), JetBrains Mono Variable (code). Packages: `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, importés dans le layout.
- Palette NEUTRE, sans dominante colorée: dark = noir véritable (fond oklch(0 0 0)), light = blanc pur (fond oklch(1 0 0)), gris neutres pour les surfaces et textes secondaires.
- Accent: vert (green-500 en dark, green-700 en light pour le contraste sur blanc). Usage réservé: liens, CTA, états actifs.
- Radius: 0.5rem. Bordures subtiles (neutral-900 en dark, neutral-200 en light).
- Conteneur: max-w-6xl, prose max 72ch, padding horizontal 1rem mobile / 1.5rem desktop.
- Micro-interactions: 150 à 300ms, ease-out à l'entrée, transform/opacity uniquement.

## Dark first + switcher (contrat commun)

Convention: classe `dark` sur `<html>` (convention shadcn, compatible avec les 4 kits).

1. Script inline no-flash dans le `<head>` (avant tout CSS paint), identique partout:

```html
<script is:inline>
  const stored = localStorage.getItem("theme");
  const theme = stored === "light" || stored === "dark"
    ? stored
    : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.classList.toggle("dark", theme === "dark");
</script>
```

Résultat: préférence stockée prioritaire, sinon préférence système, sinon dark (défaut).

2. Switcher: bouton icône soleil/lune (Lucide, SVG, jamais d'emoji), aria-label="Changer de thème", zone cliquable 44x44px minimum, placé dans le header. Au clic:

```js
const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
document.documentElement.classList.toggle("dark", next === "dark");
localStorage.setItem("theme", next);
```

3. Animation du toggle (obligatoire, identique sur les 6 versions): révélation circulaire fluide façon MagicUI Animated Theme Toggler (référence: `shared/reference/animated-theme-toggler.registry.json`, source tsx incluse). Le clic déclenche `document.startViewTransition` et anime un `clip-path: circle()` qui part du centre du bouton jusqu'à couvrir le viewport (rayon = hypoténuse max), durée 500ms, easing ease-in-out, variant "circle" uniquement. Adaptations imposées: persistance `localStorage.theme` et classe `dark` conservées (contrat ci-dessus), `applyAccent()` ré-exécuté DANS le callback de la transition (l'accent du bon mode doit être dans le snapshot), CSS compagnon qui neutralise le crossfade par défaut du snapshot old et épingle le clip initial (garde-fou Firefox), fallback SANS animation si `document.startViewTransition` absent ou si `prefers-reduced-motion`, aucun conflit avec le ClientRouter d'Astro (état scoped par data-attribute le temps de la transition). Les versions gardent l'habillage de leur bouton (skin kit, aria-label localisé, 44px): seule la logique de bascule est remplacée. Implémentation vanilla pour les togglers .astro, React pour les togglers en îlot.
4. Persistance entre pages avec les View Transitions Astro: ré-appliquer le thème sur `astro:after-swap`.

4. Les îlots React lisent le thème via la classe sur `document.documentElement` (MutationObserver ou simple lecture au montage). Aucune lib de thème (pas de next-themes).

## Accent personnalisable (contrat commun)

- Le webmaster fixe le défaut dans `src/site.config.ts`: `SITE.accent` (hex, défaut `"#22C55E"`).
- L'utilisateur peut changer l'accent via un picker dans le header: bouton icône palette (aria-label localisé) ouvrant un popover MINIMALISTE qui montre DIRECTEMENT la surface de sélection, sans clic intermédiaire ni input natif à re-cliquer, et sans aucune pastille prédéfinie. Contenu exact du popover: un carré saturation/luminosité (~180x140px, gradients CSS sur la teinte courante, curseur draggable), une barre de teinte horizontale en dessous (gradient arc-en-ciel, curseur draggable), la valeur hex courante en petit texte mono, et un bouton "Réinitialiser" discret en texte. Rien d'autre. Implémentation maison sans dépendance (conversions HSV/RGB/hex en pur JS).
- Application EN CONTINU pendant le drag (pointermove), pas seulement au relâchement. Persistance à chaque changement.
- Clavier: les deux surfaces sont des `role="slider"` focusables pilotables aux flèches (saturation/luminosité sur le carré, teinte sur la barre), aria-valuetext parlant. Fermeture par Escape (refocus du déclencheur) et clic extérieur.
- Persistance: `localStorage.accent` (hex). Réinitialiser supprime la clé (retour au défaut webmaster).
- Application: fonction `applyAccent()` dans le script no-flash (étendu), pur JS sans dépendance:
  1. hex choisi (ou défaut config) converti en RGB;
  2. variante par mode, garantie de contraste: en dark, éclaircir progressivement jusqu'à contraste >= 3:1 contre le noir; en light, assombrir jusqu'à >= 4.5:1 contre le blanc;
  3. `--accent-foreground` = noir ou blanc selon la luminance de la variante (contraste >= 4.5:1);
  4. pose en style inline sur `document.documentElement`: `--accent`, `--accent-foreground`, `--ring` (les styles inline priment sur les blocs `:root`/`.dark` de theme.css, qui restent le fallback no-JS).
- Ré-application: au toggle de thème, sur `astro:after-swap` et `astro:page-load`.
- Interdiction du vert en dur dans les composants: toujours `var(--color-accent)` / classes sémantiques (`text-accent`, `bg-accent`, `border-accent`). Les seules occurrences littérales autorisées: le fallback de theme.css, `SITE.accent`, et l'image OG générée au build.

## Scrollbars accordées au thème (contrat commun)

Les barres de défilement suivent le thème via les tokens, dans les deux modes, fines et discrètes. Bloc de référence (fera partie de `theme.css`, donc du contrat des 148 lignes après consolidation):

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 999px;
  border: 2px solid var(--color-background);
}
::-webkit-scrollbar-thumb:hover { background-color: var(--color-muted-foreground); }
```

Les variantes qui stylisent déjà leur scrollbar (cyber en néon accent, etc.) gardent leur version dans leurs additions (elles priment dans la cascade car placées après le contrat). Le pouce de la scrollbar peut être teinté à l'accent (`var(--color-accent)`) dans les variantes expressives, mais reste sur `--color-border` par défaut pour le socle minimal.

## Code (Shiki)

Config Astro markdown `shikiConfig.themes = { light: "github-light", dark: "github-dark" }` + le bloc CSS `.dark .astro-code` déjà présent dans `theme.css`.

## Accessibilité (non négociable)

- Contraste texte 4.5:1 dans les deux modes (muted-foreground compris).
- Focus visible partout, navigation clavier complète.
- `prefers-reduced-motion` respecté (déjà dans theme.css); les composants animés des kits doivent le respecter aussi ou rester purement décoratifs.
- Icônes SVG avec aria-label, jamais d'emoji comme icône.
