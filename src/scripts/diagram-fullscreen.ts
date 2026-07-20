type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};
type FullscreenFrame = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const frames = "[data-mermaid-container], [data-mermaid], [data-drawio-container], [data-drawio]";
const controls = ".mermaid-actions, .mermaid-toolbar__actions, .mermaid-controls, .drawio-actions, .drawio-toolbar__actions, .drawio-controls, .diagram-actions, .diagram-controls";
const toolbars = ".mermaid-toolbar, .drawio-toolbar, .diagram-toolbar";
const expandIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>`;
const collapseIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M21 16h-5v5"/></svg>`;

function activeFullscreen() {
  return document.fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement ?? null;
}
function label(exit: boolean) {
  const french = document.documentElement.lang.startsWith("fr");
  return exit ? (french ? "Quitter le plein écran" : "Exit full screen") : (french ? "Afficher le diagramme en plein écran" : "View diagram in full screen");
}
function expanded(frame: HTMLElement) {
  return activeFullscreen() === frame || frame.hasAttribute("data-diagram-fullscreen-fallback");
}
function update() {
  document.querySelectorAll<HTMLButtonElement>("[data-diagram-fullscreen]").forEach((button) => {
    const frame = button.closest<HTMLElement>(frames);
    const active = Boolean(frame && expanded(frame));
    button.innerHTML = active ? collapseIcon : expandIcon;
    button.setAttribute("aria-label", label(active));
    button.setAttribute("title", label(active));
    button.setAttribute("aria-pressed", String(active));
  });
}
function closeFallback() {
  document.querySelectorAll("[data-diagram-fullscreen-fallback]").forEach((frame) => frame.removeAttribute("data-diagram-fullscreen-fallback"));
  document.documentElement.classList.remove("diagram-fullscreen-open");
  update();
}
function openFallback(frame: HTMLElement) {
  closeFallback();
  frame.setAttribute("data-diagram-fullscreen-fallback", "");
  document.documentElement.classList.add("diagram-fullscreen-open");
  update();
}
async function toggle(frame: FullscreenFrame) {
  if (frame.hasAttribute("data-diagram-fullscreen-fallback")) return closeFallback();
  if (activeFullscreen() === frame) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await (document as FullscreenDocument).webkitExitFullscreen?.();
    return;
  }
  try {
    if (frame.requestFullscreen) await frame.requestFullscreen();
    else if (frame.webkitRequestFullscreen) await frame.webkitRequestFullscreen();
    else openFallback(frame);
  } catch { openFallback(frame); }
}
function addStyles() {
  if (document.querySelector("[data-diagram-fullscreen-styles]")) return;
  const style = document.createElement("style");
  style.dataset.diagramFullscreenStyles = "";
  style.textContent = `
    .diagram-fullscreen-frame{position:relative}
    .diagram-fullscreen-floating{position:absolute;z-index:12;top:.65rem;right:.65rem;display:inline-grid;width:2.5rem;height:2.5rem;padding:0;place-items:center;border:1px solid var(--color-border,var(--border,#7777));border-radius:var(--radius-md,.5rem);color:var(--color-foreground,var(--foreground,currentColor));background:var(--color-card,var(--card,Canvas));cursor:pointer}
    .diagram-fullscreen-frame:fullscreen,.diagram-fullscreen-frame[data-diagram-fullscreen-fallback]{display:flex!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;padding:0!important;flex-direction:column;border:0!important;border-radius:0!important;color:var(--color-foreground,var(--foreground,CanvasText));background:var(--color-background,var(--background,Canvas))}
    .diagram-fullscreen-frame[data-diagram-fullscreen-fallback]{position:fixed!important;z-index:2147483646!important;inset:0!important}
    .diagram-fullscreen-frame:fullscreen :is([data-mermaid-viewport],[data-drawio-viewport]),.diagram-fullscreen-frame[data-diagram-fullscreen-fallback] :is([data-mermaid-viewport],[data-drawio-viewport]){flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;border-radius:0!important}
    .diagram-fullscreen-frame:fullscreen :is(.mermaid-toolbar,.drawio-toolbar,.diagram-toolbar),.diagram-fullscreen-frame[data-diagram-fullscreen-fallback] :is(.mermaid-toolbar,.drawio-toolbar,.diagram-toolbar){flex:0 0 auto}
    html.diagram-fullscreen-open,html.diagram-fullscreen-open body{overflow:hidden!important}
  `;
  document.head.append(style);
}
function enhance(frame: HTMLElement) {
  if (frame.hasAttribute("data-diagram-fullscreen-ready")) return;
  frame.setAttribute("data-diagram-fullscreen-ready", "");
  frame.classList.add("diagram-fullscreen-frame");
  let target = frame.querySelector<HTMLElement>(controls);
  const toolbar = frame.querySelector<HTMLElement>(toolbars);
  if (!target && toolbar) {
    target = document.createElement("div");
    target.className = "diagram-fullscreen-controls";
    toolbar.append(target);
  }
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.diagramFullscreen = "";
  button.className = target?.querySelector<HTMLButtonElement>("button")?.className || "diagram-fullscreen-floating";
  button.addEventListener("click", () => void toggle(frame));
  (target ?? frame).append(button);
}
function init() {
  addStyles();
  document.querySelectorAll<HTMLElement>(frames).forEach(enhance);
  update();
}
document.addEventListener("fullscreenchange", update);
document.addEventListener("webkitfullscreenchange", update);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector("[data-diagram-fullscreen-fallback]")) closeFallback();
});
document.addEventListener("astro:page-load", init);
init();
