import {
  ArrowLeft,
  Check,
  Copy,
  GitBranch,
  Laptop,
  LoaderCircle,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Settings2,
  Share2,
  Sun,
  Moon,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PREVIEW_CHANNEL,
  PREVIEW_PROTOCOL_VERSION,
  isPreviewEnvelope,
  isPreviewSettings,
  type PreviewFrameMessage,
  type PreviewManifestV1,
  type PreviewSettingsV1,
  type PreviewViewport,
} from "../../vendor/lisible/shared/preview/protocol";
import type { PublicVariant } from "../../vendor/lisible/shared/variants";

type Locale = "fr" | "en";
type PageKey = "home" | "blog" | "post" | "tags" | "archives" | "about";
type FrameSlot = { src: string; variant: PublicVariant | null; ready: boolean };

const variantNames: Record<PublicVariant, string> = {
  "motion-primitives": "Motion Primitives",
  "cult-ui": "Cult UI",
  aceternity: "Aceternity",
  reactbits: "ReactBits",
  organique: "Organique",
  h4x0r: "H4X0R",
};

const pageOrder: PageKey[] = ["home", "blog", "post", "tags", "archives", "about"];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Hsv = [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHsv([red, green, blue]: [number, number, number]): Hsv {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return [hue, max === 0 ? 0 : (delta / max) * 100, max * 100];
}

function hsvToHex([hue, saturation, value]: Hsv) {
  const s = saturation / 100;
  const v = value / 100;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = v - chroma;
  const [red, green, blue] = hue < 60
    ? [chroma, x, 0]
    : hue < 120
      ? [x, chroma, 0]
      : hue < 180
        ? [0, chroma, x]
        : hue < 240
          ? [0, x, chroma]
          : hue < 300
            ? [x, 0, chroma]
            : [chroma, 0, x];
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const content = {
  fr: {
    back: "Documentation",
    title: "Previewer",
    subtitle: "Six variantes. Tous vos réglages. En direct.",
    settings: "Réglages",
    close: "Fermer les réglages",
    source: "Source synchronisée",
    loading: "Chargement du rendu…",
    ready: "Rendu synchronisé",
    retry: "Réessayer",
    error: "Le rendu n’a pas répondu. La variante précédente reste disponible.",
    share: "Partager",
    copied: "Lien copié",
    reset: "Réinitialiser",
    groups: { explore: "Explorer", identity: "Identité", appearance: "Apparence", content: "Contenu" },
    fields: {
      variant: "Variante",
      page: "Page",
      viewport: "Viewport",
      locale: "Langue du blog",
      theme: "Thème",
      accent: "Couleur d’accent",
      siteTitle: "Titre du site",
      author: "Auteur",
      density: "Densité",
      coverPosition: "Position de la bannière d’article",
      covers: "Afficher les couvertures",
      featured: "Afficher la sélection",
      related: "Afficher les articles liés",
      motion: "Animations",
    },
    pages: { home: "Accueil", blog: "Blog", post: "Article", tags: "Tags", archives: "Archives", about: "À propos" },
    values: {
      system: "Système",
      light: "Clair",
      dark: "Sombre",
      comfortable: "Confortable",
      compact: "Compacte",
      up: "Au-dessus",
      down: "En dessous",
      full: "Complètes",
      reduced: "Réduites",
      responsive: "Full",
      desktop: "Bureau",
      tablet: "Tablette",
      mobile: "Mobile",
    },
  },
  en: {
    back: "Documentation",
    title: "Previewer",
    subtitle: "Six variants. Every setting. Live.",
    settings: "Settings",
    close: "Close settings",
    source: "Synchronized source",
    loading: "Loading preview…",
    ready: "Preview synchronized",
    retry: "Retry",
    error: "The preview did not respond. The previous variant remains available.",
    share: "Share",
    copied: "Link copied",
    reset: "Reset",
    groups: { explore: "Explore", identity: "Identity", appearance: "Appearance", content: "Content" },
    fields: {
      variant: "Variant",
      page: "Page",
      viewport: "Viewport",
      locale: "Blog language",
      theme: "Theme",
      accent: "Accent color",
      siteTitle: "Site title",
      author: "Author",
      density: "Density",
      coverPosition: "Article banner position",
      covers: "Show covers",
      featured: "Show featured posts",
      related: "Show related posts",
      motion: "Motion",
    },
    pages: { home: "Home", blog: "Blog", post: "Article", tags: "Tags", archives: "Archives", about: "About" },
    values: {
      system: "System",
      light: "Light",
      dark: "Dark",
      comfortable: "Comfortable",
      compact: "Compact",
      up: "Above",
      down: "Below",
      full: "Full",
      reduced: "Reduced",
      responsive: "Full",
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobile",
    },
  },
} as const;

function defaults(locale: Locale): PreviewSettingsV1 {
  return {
    version: 1,
    variant: "organique",
    path: locale === "fr" ? "/landing/french/" : "/en/",
    locale,
    theme: "system",
    accent: "#22c55e",
    title: "Lisible",
    author: "Lisible",
    density: "comfortable",
    coverPosition: "down",
    covers: true,
    featured: true,
    relatedPosts: true,
    motion: "full",
    viewport: "responsive",
  };
}

function storedAppearance(fallbackAccent: string): Pick<PreviewSettingsV1, "theme" | "accent"> {
  try {
    const storedTheme = localStorage.getItem("theme");
    const storedAccent = localStorage.getItem("accent");
    return {
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system",
      accent: storedAccent && HEX_COLOR.test(storedAccent) ? storedAccent.toLowerCase() : fallbackAccent,
    };
  } catch {
    return { theme: "system", accent: fallbackAccent };
  }
}

function accessibleAccent(hex: string, dark: boolean) {
  const value = Number.parseInt(hex.slice(1), 16);
  let rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const luminance = (channels: number[]) => {
    const linear = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  };
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  for (let index = 0; index < 60; index += 1) {
    if (dark ? contrast(luminance(rgb), 0) >= 3 : contrast(luminance(rgb), 1) >= 4.5) break;
    rgb = rgb.map((channel) => dark
      ? Math.min(255, Math.round(channel + (255 - channel) * 0.06) + 1)
      : Math.max(0, Math.round(channel * 0.94) - 1));
  }
  const resolvedLuminance = luminance(rgb);
  return {
    accent: `rgb(${rgb.join(" ")})`,
    foreground: contrast(resolvedLuminance, 0) >= 4.5 ? "#000000" : "#ffffff",
  };
}

function booleanParam(value: string | null, fallback: boolean) {
  return value === "1" ? true : value === "0" ? false : fallback;
}

function settingsFromUrl(fallback: PreviewSettingsV1): PreviewSettingsV1 | null {
  const query = new URLSearchParams(window.location.search);
  if (query.get("pv") !== "1") return null;
  const candidate: PreviewSettingsV1 = {
    ...fallback,
    variant: (query.get("variant") ?? fallback.variant) as PublicVariant,
    path: query.get("path") ?? fallback.path,
    locale: (query.get("locale") ?? fallback.locale) as Locale,
    theme: (query.get("theme") ?? fallback.theme) as PreviewSettingsV1["theme"],
    accent: query.get("accent") ?? fallback.accent,
    title: query.get("title") ?? fallback.title,
    author: query.get("author") ?? fallback.author,
    density: (query.get("density") ?? fallback.density) as PreviewSettingsV1["density"],
    coverPosition: (query.get("cover") ?? fallback.coverPosition) as PreviewSettingsV1["coverPosition"],
    covers: booleanParam(query.get("covers"), fallback.covers),
    featured: booleanParam(query.get("featured"), fallback.featured),
    relatedPosts: booleanParam(query.get("related"), fallback.relatedPosts),
    motion: (query.get("motion") ?? fallback.motion) as PreviewSettingsV1["motion"],
    viewport: (query.get("viewport") ?? fallback.viewport) as PreviewViewport,
  };
  return isPreviewSettings(candidate) ? candidate : null;
}

function settingsUrl(settings: PreviewSettingsV1) {
  return `${window.location.pathname}?${settingsQuery(settings)}`;
}

function settingsQuery(settings: PreviewSettingsV1) {
  return new URLSearchParams({
    pv: "1",
    variant: settings.variant,
    path: settings.path,
    locale: settings.locale,
    theme: settings.theme,
    accent: settings.accent,
    title: settings.title,
    author: settings.author,
    density: settings.density,
    cover: settings.coverPosition,
    covers: settings.covers ? "1" : "0",
    featured: settings.featured ? "1" : "0",
    related: settings.relatedPosts ? "1" : "0",
    motion: settings.motion,
    viewport: settings.viewport,
  }).toString();
}

function relativeRoute(route: string, basePath: string) {
  if (!route.startsWith(basePath)) return "/";
  const value = route.slice(basePath.length);
  return `/${value}`.replace(/\/+/g, "/");
}

function frameSrc(basePath: string, path: string, buildHash: string) {
  const clean = path.replace(/^\/+/, "");
  return `${basePath}${clean}${clean && !clean.endsWith("/") ? "/" : ""}?preview=1&v=${buildHash.slice(0, 16)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="previewer-field"><span>{label}</span>{children}</label>;
}

function Toggle({ checked, onChange, label, name }: { checked: boolean; onChange: (value: boolean) => void; label: string; name: string }) {
  return (
    <label className="previewer-toggle">
      <span>{label}</span>
      <input type="checkbox" name={name} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="previewer-toggle__track" aria-hidden="true"><span /></span>
    </label>
  );
}

function Segmented<T extends string>({ value, items, onChange, label }: {
  value: T;
  items: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <fieldset className="previewer-segmented">
      <legend>{label}</legend>
      <div>
        {items.map((item) => (
          <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PreviewAccentPicker({ value, onChange, label, locale }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  locale: Locale;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(value)));

  useEffect(() => setHsv(rgbToHsv(hexToRgb(value))), [value]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  const commit = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const updateSv = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    commit([hsv[0], x * 100, (1 - y) * 100]);
  };

  const updateHue = (element: HTMLElement, clientX: number) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    commit([Math.min(359.9, x * 360), hsv[1], hsv[2]]);
  };

  const startPointer = (event: React.PointerEvent<HTMLElement>, kind: "sv" | "hue") => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    if (kind === "sv") updateSv(event.currentTarget, event.clientX, event.clientY);
    else updateHue(event.currentTarget, event.clientX);
  };

  const movePointer = (event: React.PointerEvent<HTMLElement>, kind: "sv" | "hue") => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (kind === "sv") updateSv(event.currentTarget, event.clientX, event.clientY);
    else updateHue(event.currentTarget, event.clientX);
  };

  const adjustWithKeyboard = (event: React.KeyboardEvent<HTMLElement>, kind: "sv" | "hue") => {
    const step = event.shiftKey ? 10 : kind === "hue" ? 5 : 2;
    let next: Hsv | null = null;
    if (kind === "sv") {
      if (event.key === "ArrowLeft") next = [hsv[0], Math.max(0, hsv[1] - step), hsv[2]];
      else if (event.key === "ArrowRight") next = [hsv[0], Math.min(100, hsv[1] + step), hsv[2]];
      else if (event.key === "ArrowUp") next = [hsv[0], hsv[1], Math.min(100, hsv[2] + step)];
      else if (event.key === "ArrowDown") next = [hsv[0], hsv[1], Math.max(0, hsv[2] - step)];
    } else {
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = [Math.max(0, hsv[0] - step), hsv[1], hsv[2]];
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = [Math.min(359.9, hsv[0] + step), hsv[1], hsv[2]];
      else if (event.key === "Home") next = [0, hsv[1], hsv[2]];
      else if (event.key === "End") next = [359.9, hsv[1], hsv[2]];
    }
    if (!next) return;
    event.preventDefault();
    commit(next);
  };

  const hex = value.toUpperCase();
  const svLabel = locale === "fr" ? "Saturation et luminosité" : "Saturation and brightness";
  const hueLabel = locale === "fr" ? "Teinte" : "Hue";

  return (
    <div className="previewer-accent-picker" ref={rootRef}>
      <button
        type="button"
        className="previewer-color"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="previewer-accent-popover"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="previewer-color__wheel" aria-hidden="true">
          <span style={{ backgroundColor: value }}><Palette size={14} /></span>
        </span>
        <code>{hex}</code>
      </button>
      {open && (
        <div id="previewer-accent-popover" className="previewer-color-popover" role="dialog" aria-label={label}>
          <div
            className="previewer-color-sv"
            role="slider"
            tabIndex={0}
            aria-label={svLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv[1])}
            aria-valuetext={`${Math.round(hsv[1])}% / ${Math.round(hsv[2])}%`}
            style={{ background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${Math.round(hsv[0])}deg 100% 50%))` }}
            onPointerDown={(event) => startPointer(event, "sv")}
            onPointerMove={(event) => movePointer(event, "sv")}
            onKeyDown={(event) => adjustWithKeyboard(event, "sv")}
          >
            <span className="previewer-color-cursor" aria-hidden="true" style={{ left: `${hsv[1]}%`, top: `${100 - hsv[2]}%`, backgroundColor: value }} />
          </div>
          <div
            className="previewer-color-hue"
            role="slider"
            tabIndex={0}
            aria-label={hueLabel}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv[0])}
            onPointerDown={(event) => startPointer(event, "hue")}
            onPointerMove={(event) => movePointer(event, "hue")}
            onKeyDown={(event) => adjustWithKeyboard(event, "hue")}
          >
            <span className="previewer-color-cursor" aria-hidden="true" style={{ left: `${(hsv[0] / 360) * 100}%`, backgroundColor: `hsl(${Math.round(hsv[0])}deg 100% 50%)` }} />
          </div>
          <code className="previewer-color-hex">{hex}</code>
        </div>
      )}
    </div>
  );
}

export default function PreviewerApp({ locale }: { locale: Locale }) {
  const [uiLocale, setUiLocale] = useState<Locale>(locale);
  const copy = content[uiLocale];
  const [settings, setSettings] = useState<PreviewSettingsV1>(() => defaults(locale));
  const settingsRef = useRef(settings);
  const [manifest, setManifest] = useState<PreviewManifestV1 | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [frames, setFrames] = useState<[FrameSlot, FrameSlot]>([
    { src: "", variant: null, ready: false },
    { src: "", variant: null, ready: false },
  ]);
  const frameRefs = useRef<[HTMLIFrameElement | null, HTMLIFrameElement | null]>([null, null]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [pendingFrame, setPendingFrame] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [showReady, setShowReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const currentPath = useRef(settings.path);

  const activeVariant = manifest?.variants.find((variant) => variant.id === settings.variant) ?? null;

  useEffect(() => {
    const base = defaults(locale);
    let fallback = base;
    try {
      const stored = JSON.parse(localStorage.getItem("lisible-previewer:v1") ?? "null");
      if (isPreviewSettings(stored)) fallback = { ...stored, locale };
    } catch {}
    fallback = { ...fallback, ...storedAppearance(base.accent) };
    const restoredSettings = settingsFromUrl(fallback) ?? fallback;
    setSettings(restoredSettings);
    settingsRef.current = restoredSettings;
    setInitialized(true);

    fetch("/_previews/manifest.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
        return response.json() as Promise<PreviewManifestV1>;
      })
      .then((value) => {
        if (value.version !== 1 || value.variants.length === 0) throw new Error("Invalid preview manifest");
        setSettings((previous) => {
          const variant = value.variants.find((entry) => entry.id === previous.variant) ?? value.variants[0]!;
          const knownRoutes = Object.values(variant.routes[previous.locale]).map((route) => relativeRoute(route, variant.basePath));
          if (knownRoutes.includes(previous.path)) return previous;
          return { ...previous, variant: variant.id, path: relativeRoute(variant.routes[previous.locale].home, variant.basePath) };
        });
        setManifest(value);
      })
      .catch((error) => setManifestError(error instanceof Error ? error.message : "Manifest unavailable"));
  }, [locale]);

  useEffect(() => {
    settingsRef.current = settings;
    if (!initialized) return;
    localStorage.setItem("lisible-previewer:v1", JSON.stringify(settings));
    window.history.replaceState({}, "", settingsUrl(settings));
    for (const frame of frameRefs.current) {
      frame?.contentWindow?.postMessage({
        channel: PREVIEW_CHANNEL,
        version: PREVIEW_PROTOCOL_VERSION,
        type: "settings",
        settings,
      }, window.location.origin);
    }
  }, [initialized, settings]);

  useEffect(() => {
    if (!initialized) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyAppearance = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && media.matches);
      const root = document.documentElement;
      const colors = accessibleAccent(settings.accent, dark);
      root.classList.toggle("dark", dark);
      root.dataset.theme = settings.theme;
      root.dataset.resolvedTheme = dark ? "dark" : "light";
      root.style.colorScheme = dark ? "dark" : "light";
      root.style.backgroundColor = dark ? "#000000" : "#ffffff";
      root.style.setProperty("--accent", colors.accent);
      root.style.setProperty("--ring", colors.accent);
      root.style.setProperty("--accent-foreground", colors.foreground);
      if (settings.theme === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", settings.theme);
      localStorage.setItem("accent", settings.accent);
    };
    applyAppearance();
    media.addEventListener("change", applyAppearance);
    return () => media.removeEventListener("change", applyAppearance);
  }, [initialized, settings.theme, settings.accent]);

  useEffect(() => {
    if (!initialized) return;
    const syncAppearance = (event: StorageEvent) => {
      if (event.key !== "theme" && event.key !== "accent" && event.key !== null) return;
      const appearance = storedAppearance(defaults(locale).accent);
      setSettings((previous) => previous.theme === appearance.theme && previous.accent === appearance.accent
        ? previous
        : { ...previous, ...appearance });
    };
    window.addEventListener("storage", syncAppearance);
    return () => window.removeEventListener("storage", syncAppearance);
  }, [initialized, locale]);

  useEffect(() => {
    if (!manifest || !activeVariant) return;
    const active = frames[activeFrame];
    if (!active.src) {
      setFrames((previous) => {
        const next = [...previous] as [FrameSlot, FrameSlot];
        next[activeFrame] = { src: frameSrc(activeVariant.basePath, settings.path, activeVariant.buildHash), variant: settings.variant, ready: false };
        return next;
      });
      setBusy(true);
      return;
    }
    if (active.variant === settings.variant) return;
    const target = activeFrame === 0 ? 1 : 0;
    if (pendingFrame === target && frames[target].variant === settings.variant && frames[target].src) return;
    setRuntimeError(null);
    setBusy(true);
    setPendingFrame(target);
    setFrames((previous) => {
      const next = [...previous] as [FrameSlot, FrameSlot];
      next[target] = { src: frameSrc(activeVariant.basePath, settings.path, activeVariant.buildHash), variant: settings.variant, ready: false };
      return next;
    });
  }, [manifest, activeVariant, settings.variant, settings.path, activeFrame, pendingFrame, frames]);

  useEffect(() => {
    const postSettings = (index: number) => {
      frameRefs.current[index]?.contentWindow?.postMessage({
        channel: PREVIEW_CHANNEL,
        version: PREVIEW_PROTOCOL_VERSION,
        type: "settings",
        settings: settingsRef.current,
      }, window.location.origin);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !isPreviewEnvelope(event.data)) return;
      const index = frameRefs.current.findIndex((frame) => frame?.contentWindow === event.source);
      if (index === -1) return;
      const message = event.data as PreviewFrameMessage;
      if (message.type === "ready") {
        setFrames((previous) => {
          const next = [...previous] as [FrameSlot, FrameSlot];
          next[index] = { ...next[index], ready: true };
          return next;
        });
        postSettings(index);
        if (pendingFrame === index || (index === activeFrame && !frames[activeFrame].ready)) {
          currentPath.current = message.path;
          setActiveFrame(index);
          setPendingFrame(null);
          setBusy(false);
          setRuntimeError(null);
        }
        return;
      }
      if (message.type === "route" && index === activeFrame) {
        currentPath.current = message.path;
        const nextLocale: Locale = message.path.startsWith("/en/") ? "en" : "fr";
        setSettings((previous) => previous.path === message.path && previous.locale === nextLocale
          ? previous
          : { ...previous, path: message.path, locale: nextLocale });
        return;
      }
      if (message.type === "error" && (index === activeFrame || index === pendingFrame)) {
        setRuntimeError(message.message);
        setBusy(false);
      }
    };
    window.addEventListener("message", onMessage);
    for (const index of [0, 1]) if (frames[index]?.ready) postSettings(index);
    return () => window.removeEventListener("message", onMessage);
  }, [activeFrame, pendingFrame, frames]);

  useEffect(() => {
    if (!frames[activeFrame].ready || frames[activeFrame].variant !== settings.variant || currentPath.current === settings.path) return;
    frameRefs.current[activeFrame]?.contentWindow?.postMessage({
      channel: PREVIEW_CHANNEL,
      version: PREVIEW_PROTOCOL_VERSION,
      type: "navigate",
      path: settings.path,
    }, window.location.origin);
  }, [settings.path, settings.variant, activeFrame, frames]);

  useEffect(() => {
    if (!busy) return;
    const timeout = window.setTimeout(() => {
      setRuntimeError(copy.error);
      setBusy(false);
      setPendingFrame(null);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [busy, copy.error]);

  useEffect(() => {
    if (busy || runtimeError) {
      setShowReady(false);
      return;
    }
    setShowReady(true);
    const timeout = window.setTimeout(() => setShowReady(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [busy, runtimeError]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const selectedPage = useMemo<PageKey>(() => {
    if (!activeVariant) return "home";
    for (const key of pageOrder) {
      if (relativeRoute(activeVariant.routes[settings.locale][key], activeVariant.basePath) === settings.path) return key;
    }
    return "home";
  }, [activeVariant, settings.locale, settings.path]);

  const set = <K extends keyof PreviewSettingsV1>(key: K, value: PreviewSettingsV1[K]) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const localizedSettings = (nextLocale: Locale): PreviewSettingsV1 => ({
    ...settings,
    locale: nextLocale,
    path: activeVariant
      ? relativeRoute(activeVariant.routes[nextLocale][selectedPage], activeVariant.basePath)
      : defaults(nextLocale).path,
  });

  const localeHref = (nextLocale: Locale) => {
    const route = nextLocale === "fr" ? "/preview/" : "/en/preview/";
    return `${route}?${settingsQuery(localizedSettings(nextLocale))}`;
  };

  const switchLocale = (event: React.MouseEvent<HTMLAnchorElement>, nextLocale: Locale) => {
    event.preventDefault();
    if (nextLocale === uiLocale) return;
    const next = localizedSettings(nextLocale);
    settingsRef.current = next;
    localStorage.setItem("lisible-previewer:v1", JSON.stringify(next));
    localStorage.setItem("lisible-locale", nextLocale);
    setUiLocale(nextLocale);
    setSettings(next);
    document.documentElement.lang = nextLocale;
    document.documentElement.dataset.lisibleLocale = nextLocale;
    document.title = nextLocale === "fr"
      ? "Previewer Lisible - Testez chaque variante en direct"
      : "Lisible Previewer - Customize every variant live";
    const route = nextLocale === "fr" ? "/preview/" : "/en/preview/";
    window.history.replaceState({}, "", `${route}?${settingsQuery(next)}`);
  };

  const cycleTheme = () => {
    const order: PreviewSettingsV1["theme"][] = ["system", "light", "dark"];
    set("theme", order[(order.indexOf(settings.theme) + 1) % order.length]!);
  };

  const changePage = (page: PageKey) => {
    if (!activeVariant) return;
    set("path", relativeRoute(activeVariant.routes[settings.locale][page], activeVariant.basePath));
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const retry = () => {
    if (!activeVariant) return;
    const target = pendingFrame ?? activeFrame;
    setRuntimeError(null);
    setBusy(true);
    setPendingFrame(target);
    setFrames((previous) => {
      const next = [...previous] as [FrameSlot, FrameSlot];
      next[target] = {
        src: `${frameSrc(activeVariant.basePath, settings.path, activeVariant.buildHash)}&retry=${Date.now()}`,
        variant: settings.variant,
        ready: false,
      };
      return next;
    });
  };

  const viewportIcons: Record<PreviewViewport, React.ReactNode> = {
    responsive: <Laptop size={16} aria-hidden="true" />,
    desktop: <Monitor size={16} aria-hidden="true" />,
    tablet: <Tablet size={16} aria-hidden="true" />,
    mobile: <Smartphone size={16} aria-hidden="true" />,
  };

  const themeIcon = settings.theme === "light"
    ? <Sun size={17} aria-hidden="true" />
    : settings.theme === "dark"
      ? <Moon size={17} aria-hidden="true" />
      : <Monitor size={17} aria-hidden="true" />;

  return (
    <div className="previewer-app">
      <header className="previewer-header">
        <div className="previewer-header__identity">
          <a className="previewer-back" href={uiLocale === "fr" ? "/docs/" : "/en/docs/"}>
            <ArrowLeft size={17} aria-hidden="true" /> <span>{copy.back}</span>
          </a>
          <span className="previewer-header__divider" aria-hidden="true" />
          <div>
            <div className="previewer-title-row"><span className="brand-blob" aria-hidden="true" /><h1>{copy.title}</h1></div>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <div className="previewer-header__actions">
          <nav className="previewer-page-locales" aria-label={uiLocale === "fr" ? "Langue de la page et du rendu" : "Page and preview language"}>
            <a href={localeHref("fr")} hrefLang="fr" aria-current={uiLocale === "fr" ? "page" : undefined} onClick={(event) => switchLocale(event, "fr")}>FR</a>
            <a href={localeHref("en")} hrefLang="en" aria-current={uiLocale === "en" ? "page" : undefined} onClick={(event) => switchLocale(event, "en")}>EN</a>
          </nav>
          <button
            className="previewer-button previewer-theme-switch"
            type="button"
            onClick={cycleTheme}
            aria-label={`${copy.fields.theme}: ${copy.values[settings.theme]}`}
            title={`${copy.fields.theme}: ${copy.values[settings.theme]}`}
          >
            {themeIcon}<span>{copy.values[settings.theme]}</span>
          </button>
          {manifest && (
            <a className="previewer-source" href={`https://github.com/didntchooseaname/lisible/commit/${manifest.source.sha}`} target="_blank" rel="noreferrer">
              <span className="previewer-source__dot" aria-hidden="true" />
              <span>{copy.source}</span>
              <code>{manifest.source.sha.slice(0, 7)}</code>
            </a>
          )}
          <a className="previewer-icon-button" href="https://github.com/didntchooseaname/lisible" target="_blank" rel="noreferrer" aria-label="GitHub">
            <GitBranch size={18} aria-hidden="true" />
          </a>
          <button className="previewer-button previewer-share-button" type="button" onClick={share}>
            {copied ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
            <span>{copied ? copy.copied : copy.share}</span>
          </button>
          <button className="previewer-icon-button previewer-settings-open" type="button" onClick={() => setDrawerOpen(true)} aria-label={copy.settings}>
            <Settings2 size={19} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="previewer-workspace">
        <section className="previewer-canvas" aria-label={copy.title}>
          <div className={`previewer-device previewer-device--${settings.viewport}`}>
            {frames.map((frame, index) => frame.src && (
              <iframe
                key={`${index}-${frame.src}`}
                ref={(frame) => { frameRefs.current[index] = frame; }}
                className={index === activeFrame ? "is-active" : ""}
                src={frame.src}
                title={`${variantNames[frame.variant ?? settings.variant]} - ${copy.title}`}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="fullscreen"
              />
            ))}
            {!frames[activeFrame].ready && (
              <div className="previewer-empty" role="status">
                {manifestError ? <><RefreshCw size={24} aria-hidden="true" /><strong>{manifestError}</strong></> : <><LoaderCircle className="is-spinning" size={26} aria-hidden="true" /><strong>{copy.loading}</strong></>}
              </div>
            )}
          </div>
          <div
            className={`previewer-status ${runtimeError ? "is-error" : ""} ${!busy && !runtimeError && !showReady ? "is-hidden" : ""}`}
            aria-live="polite"
            aria-hidden={!busy && !runtimeError && !showReady}
          >
            {runtimeError ? (
              <><span>{runtimeError}</span><button type="button" onClick={retry}><RefreshCw size={14} aria-hidden="true" />{copy.retry}</button></>
            ) : busy ? (
              <><LoaderCircle className="is-spinning" size={14} aria-hidden="true" /><span>{copy.loading}</span></>
            ) : (
              <><Check size={14} aria-hidden="true" /><span>{copy.ready}</span></>
            )}
          </div>
        </section>

        <button className={`previewer-scrim ${drawerOpen ? "is-open" : ""}`} type="button" aria-label={copy.close} onClick={() => setDrawerOpen(false)} />
        <aside className={`previewer-sidebar ${drawerOpen ? "is-open" : ""}`} aria-label={copy.settings}>
          <div className="previewer-sidebar__header">
            <div><Settings2 size={17} aria-hidden="true" /><strong>{copy.settings}</strong></div>
            <button type="button" className="previewer-icon-button" onClick={() => setDrawerOpen(false)} aria-label={copy.close}><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="previewer-sidebar__body">
            <fieldset className="previewer-group">
              <legend>{copy.groups.explore}</legend>
              <Field label={copy.fields.variant}>
                <select name="variant" value={settings.variant} onChange={(event) => set("variant", event.target.value as PublicVariant)} disabled={!manifest}>
                  {(manifest?.variants ?? []).map((variant) => <option key={variant.id} value={variant.id}>{variantNames[variant.id]}</option>)}
                </select>
              </Field>
              {activeVariant && <p className="previewer-variant-description">{activeVariant.description}</p>}
              <Field label={copy.fields.page}>
                <select name="page" value={selectedPage} onChange={(event) => changePage(event.target.value as PageKey)}>
                  {pageOrder.map((page) => <option key={page} value={page}>{copy.pages[page]}</option>)}
                </select>
              </Field>
              <Segmented
                label={copy.fields.viewport}
                value={settings.viewport}
                onChange={(value) => set("viewport", value)}
                items={(Object.keys(viewportIcons) as PreviewViewport[]).map((value) => ({ value, label: copy.values[value], icon: viewportIcons[value] }))}
              />
            </fieldset>

            <fieldset className="previewer-group">
              <legend>{copy.groups.identity}</legend>
              <Field label={copy.fields.siteTitle}>
                <input name="site-title" value={settings.title} maxLength={80} onChange={(event) => set("title", event.target.value || "Lisible")} />
              </Field>
              <Field label={copy.fields.author}>
                <input name="author" value={settings.author} maxLength={80} onChange={(event) => set("author", event.target.value || "Lisible")} />
              </Field>
            </fieldset>

            <fieldset className="previewer-group">
              <legend>{copy.groups.appearance}</legend>
              <div className="previewer-field">
                <span>{copy.fields.accent}</span>
                <PreviewAccentPicker
                  value={settings.accent}
                  onChange={(accent) => set("accent", accent)}
                  label={copy.fields.accent}
                  locale={uiLocale}
                />
              </div>
              <Field label={copy.fields.density}>
                <select name="density" value={settings.density} onChange={(event) => set("density", event.target.value as PreviewSettingsV1["density"])}>
                  <option value="comfortable">{copy.values.comfortable}</option>
                  <option value="compact">{copy.values.compact}</option>
                </select>
              </Field>
              <Field label={copy.fields.motion}>
                <select name="motion" value={settings.motion} onChange={(event) => set("motion", event.target.value as PreviewSettingsV1["motion"])}>
                  <option value="full">{copy.values.full}</option>
                  <option value="reduced">{copy.values.reduced}</option>
                </select>
              </Field>
            </fieldset>

            <fieldset className="previewer-group">
              <legend>{copy.groups.content}</legend>
              <Field label={copy.fields.coverPosition}>
                <select name="cover-position" value={settings.coverPosition} onChange={(event) => set("coverPosition", event.target.value as PreviewSettingsV1["coverPosition"])}>
                  <option value="up">{copy.values.up}</option>
                  <option value="down">{copy.values.down}</option>
                </select>
              </Field>
              <Toggle name="covers" checked={settings.covers} onChange={(value) => set("covers", value)} label={copy.fields.covers} />
              <Toggle name="featured" checked={settings.featured} onChange={(value) => set("featured", value)} label={copy.fields.featured} />
              <Toggle name="related-posts" checked={settings.relatedPosts} onChange={(value) => set("relatedPosts", value)} label={copy.fields.related} />
            </fieldset>
          </div>
          <div className="previewer-sidebar__footer">
            <button type="button" className="previewer-button previewer-button--wide" onClick={() => setSettings(defaults(uiLocale))}><RotateCcw size={16} aria-hidden="true" />{copy.reset}</button>
            <button type="button" className="previewer-button previewer-button--primary previewer-button--wide" onClick={share}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? copy.copied : copy.share}</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
