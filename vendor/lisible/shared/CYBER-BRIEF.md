# Brief: variante 6 "cyber" (versions/cyber)

Expérience immersive complète sur le thème cyber/informatique, entièrement animée et interactive, construite avec un MAXIMUM de composants MagicUI pertinents (catalogue: `shared/research/magicui.json`, registry `https://magicui.design/r/<name>.json`, MCP magicui accessible via ToolSearch pour récupérer les sources).

## Direction design (issue du skill ui-ux-pro-max, pattern "Immersive/Interactive Experience")

- Dark first OLED assumé: notre fond noir pur est l'écran du terminal. Le mode light obligatoire devient un "terminal papier / blueprint": fond blanc pur, encre sombre, grille discrète, mêmes composants, contrastes AA.
- Néon = la variable d'accent. AUCUN néon en dur: tout passe par `var(--color-accent)` et ses dérivés translucides; le picker d'accent de l'utilisateur pilote donc la couleur du néon de toute l'expérience (vert matrix par défaut, magenta/cyan s'il veut).
- Typographie: tokens intacts (contrat 127 lignes). La variante impose JetBrains Mono comme voix dominante via les utilitaires `font-mono`, et ajoute Orbitron Variable (fontsource, latest) comme fonte display des grands titres (déclarée en fin de global.css, chargée en `font-display: swap`, preload).
- Effets signature (discrets, jamais au détriment de la lisibilité): glow néon léger (`text-shadow: 0 0 10px` sur titres et éléments actifs), scanlines en overlay `repeating-linear-gradient` opacité <= 0.05 désactivées en reduced-motion, angles chanfreinés (`clip-path`) sur les cartes, curseur clignotant 500ms sur les éléments "terminal", coins HUD (crochets aux angles des panneaux).
- Anti-patterns interdits: néon sur néon illisible, glitch permanent (le glitch est un accent d'entrée ou de survol, jamais une boucle infinie sur du texte courant), autoplay sonore, animation qui bloque l'interaction.

## Répartition de l'intensité (décision utilisateur)

- **Pages articles** (`/blog/<slug>`): le blog doit marcher et se lire. Immersion tempérée: cadre HUD, barres de statut, ligne de statut terminal des métadonnées, TOC habillée, effets d'entrée; mais la prose reste confortable (fond quasi figé ou très discret derrière la colonne de lecture, aucun élément animé permanent dans le champ de lecture, contrastes de texte irréprochables).
- **TOUTES les autres pages** (home, /blog index, tags, séries, archives, about, 404, modal de recherche, newsletter): METTRE LE PAQUET. Fond interactif dense, mise en scène maximale, animations riches, composants spectaculaires, séquences orchestrées: c'est là que l'effet wow se joue, sans retenue.

## L'exigence centrale: WOW propre

Le but assumé de cette variante est l'effet wow: une expérience animée, dynamique, interactive et COMPLÈTE. Pas un blog classique avec trois effets posés dessus: une scénographie totale où chaque page est habillée, où le fond RÉAGIT au visiteur, et où un moment signature orchestré (boot + révélation du hero) marque l'arrivée. "Propre" fait partie de l'exigence: lisibilité irréprochable, cohérence de la scène d'une page à l'autre, aucune accumulation gadget: chaque effet a un rôle, la qualité d'exécution prime sur la quantité.

## Expérience immersive (structure)

0. **Fond INTERACTIF permanent** (la pièce maîtresse): une scène de fond présente sur toutes les pages qui RÉPOND au visiteur, pas une simple boucle: la grille/pluie de glyphes s'illumine et s'écarte autour du curseur (répulsion ou surbrillance dans un rayon, retour élastique), pulse sous les clics (onde radiale), dérive légèrement en parallaxe au scroll (2 à 3 couches de profondeur: grille arrière, particules/glyphes intermédiaires, vignette et scanlines en avant-plan CSS). Base: `interactive-grid-pattern` ou `glyph-matrix` ou `flickering-grid` ENRICHI en canvas maison si nécessaire. Au tactile: réaction au touch (onde au tap), densité réduite. La scène est unique et partagée (persistante entre les pages via transition:persist si possible, sinon ré-initialisée sans flash), teintée par l'accent, en pause hors focus/onglet caché, aria-hidden, et remplacée par un décor statique élégant en reduced-motion.
1. **Séquence de boot** (première visite uniquement, sessionStorage): plein écran terminal, lignes d'init qui se tapent (composant `terminal` + `typing-animation`), curseur clignotant, barre de progression, "ACCESS GRANTED" puis révélation du site orchestrée (le hero se dévoile dans la continuité du boot: c'est LE moment signature). TOUJOURS un bouton "Passer" visible dès la première frame, Escape passe aussi; reduced-motion ou revisite = aucune séquence. Durée max 3.5s.
2. **Home "console d'opérateur"**: par-dessus le fond interactif: titre en `hyper-text` (scramble), sous-titre en `typing-animation`, articles en vedette dans une fenêtre `terminal` (logs `animated-list` cliquables), grille d'articles en `magic-card`/`neon-gradient-card` avec `border-beam` sur la carte active, stats en `number-ticker`, marquee de tags (`marquee`, pausable au hover et gelé en reduced-motion), CTA newsletter en `shimmer-button` dans une `warp-background` discrète.
3. **Décor complet, sur TOUTES les pages**: cadre HUD persistant autour du viewport (fine bordure, crochets d'angle), barre de statut haute (chemin courant style `~/blog/article.md`, heure, locale) et basse (progression de lecture, télémétrie factice discrète type coordonnées du curseur), scrollbar stylée fine, sélection teintée accent, modal de recherche et CTA newsletter habillés terminal: AUCUNE page ni surface ne reste "nue" (home, blog, article, tags, séries, about, 404, archives, modal).
4. **Header HUD**: barre fixe style HUD avec crochets d'angle, nav + recherche + langue + picker accent + toggler animé (contrat commun conservés, habillage cyber), `scroll-progress` MagicUI en liseré néon.
4. **Article**: cadre HUD, TOC en panneau latéral à coins chanfreinés avec `border-beam` subtil au survol, images de prose dans `lens` (zoom interactif, cohérent avec le thème), reveals `blur-fade`/`text-reveal` doux, métadonnées en ligne de statut terminal (`user@blog:~$ cat article.md`).
5. **Pages tags**: nuage en `orbiting-circles` ou grille interactive (`interactive-grid-pattern`), 404 en écran de crash mémorable (`hyper-text` scramble + terminal "segmentation fault" + `ripple`), page about en "dossier agent" (`file-tree` pour l'arborescence du blog, `animated-beam` reliant des blocs de compétences).
6. **Micro-interactions**: `smooth-cursor` custom (pointer:fine uniquement, désactivé reduced-motion), `pointer` sur les zones interactives, boutons `ripple-button`/`interactive-hover-button`, `cool-mode` ou `confetti` en easter egg (déclenché par le code Konami, jamais spontanément).

## Règle spéciale de cette variante: ZÉRO garde-fou (décision utilisateur)

Contrairement aux 5 autres variantes, la variante cyber est EXEMPTÉE de toutes les contraintes de performance et d'audit: AUCUN audit Lighthouse, aucun seuil de perf/CLS/TBT, aucune limite de nombre de fonds animés ou de canvas, WebGL et three.js AUTORISÉS (`globe`, `icon-cloud` et tout composant lourd redeviennent éligibles), pas d'obligation de pause hors viewport ni d'adaptation à la puissance du device, pas d'exigence reduced-motion au-delà de ce que le CSS global fournit déjà, boot aussi long et spectaculaire que le concept le mérite (le bouton passer reste une bonne idée, pas une obligation). Seuls comptent: l'expérience, la créativité, l'animation complète, l'effet wow.

## Ce qui reste vrai (identité du produit, pas des garde-fous)

- Le blog fonctionne: les fonctionnalités du socle restent utilisables dans les deux locales (lire les articles, rechercher, naviguer, changer de langue/thème/accent, RSS). L'habillage et la mise en scène sont libres.
- Contrat thème: 127 premières lignes de global.css intactes; ajouts en fin de fichier; les néons dérivent de `var(--color-accent)` (le picker pilote la couleur de l'expérience).
- Objectif d'intégration: au moins 18 composants MagicUI réellement rendus, listés dans le rapport. Jamais de long tiret. Dépendances en dernière version.
