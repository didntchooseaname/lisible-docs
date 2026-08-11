type MermaidApi = typeof import("mermaid").default;

let mermaidPromise: Promise<MermaidApi> | null = null;
let renderQueue = Promise.resolve();

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

function decode(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

let convertCtx: CanvasRenderingContext2D | null = null;
function toRgb(color: string): string {
  if (!color || color.startsWith("rgb")) return color;
  convertCtx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const ctx = convertCtx;
  if (!ctx) return color;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

function readToken(probe: HTMLElement, token: string): string {
  probe.style.color = `var(${token})`;
  return toRgb(getComputedStyle(probe).color);
}

function themeConfig() {
  const isDark = document.documentElement.classList.contains("dark");
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const card = readToken(probe, "--color-card");
  const fg = readToken(probe, "--color-foreground");
  const border = readToken(probe, "--color-border");
  const muted = readToken(probe, "--color-muted-foreground");
  const secondary = readToken(probe, "--color-secondary");
  const accent = readToken(probe, "--accent");
  const bg = readToken(probe, "--color-background");
  probe.remove();
  return {
    // "base" is the only mermaid theme meant to be fully driven by
    // themeVariables; "default"/"dark" leak their own palette (purple
    // lifelines, #ccc actor lines) around the overrides.
    theme: "base",
    themeVariables: {
      darkMode: isDark,
      background: bg,
      mainBkg: secondary,
      primaryColor: secondary,
      primaryTextColor: fg,
      primaryBorderColor: border,
      secondaryColor: card,
      secondaryTextColor: fg,
      secondaryBorderColor: border,
      tertiaryColor: card,
      tertiaryTextColor: fg,
      tertiaryBorderColor: border,
      lineColor: muted,
      textColor: fg,
      titleColor: fg,
      nodeBorder: border,
      nodeTextColor: fg,
      clusterBkg: card,
      clusterBorder: border,
      edgeLabelBackground: bg,
      noteBkgColor: card,
      noteTextColor: fg,
      noteBorderColor: border,
      actorBkg: secondary,
      actorBorder: accent,
      actorTextColor: fg,
      actorLineColor: muted,
      signalColor: muted,
      signalTextColor: fg,
      labelBoxBkgColor: card,
      labelBoxBorderColor: border,
      labelTextColor: fg,
      loopTextColor: fg,
      activationBkgColor: secondary,
      activationBorderColor: accent,
      sequenceNumberColor: bg,
    },
  } as const;
}

async function initMermaid(): Promise<MermaidApi> {
  const mermaid = await loadMermaid();
  const cfg = themeConfig();
  const fontFamily =
    getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim() ||
    "sans-serif";
  mermaid.initialize({
    startOnLoad: false,
    theme: cfg.theme,
    fontFamily,
    securityLevel: "loose",
    themeVariables: cfg.themeVariables as Record<string, string | boolean>,
  });
  return mermaid;
}

function prepareSvg(svgEl: SVGSVGElement) {
  const vb = svgEl.viewBox.baseVal;
  if (vb?.width && vb?.height) {
    svgEl.setAttribute("width", `${vb.width}`);
    svgEl.setAttribute("height", `${vb.height}`);
  }
  svgEl.style.display = "block";
  svgEl.style.maxWidth = "none";
  svgEl.style.maxHeight = "none";
}

function setupPanZoom(container: HTMLElement) {
  const viewport = container.querySelector<HTMLElement>("[data-mermaid-viewport]");
  const pan = container.querySelector<HTMLElement>("[data-mermaid-pan]");
  const level = container.querySelector<HTMLElement>("[data-mermaid-zoom-level]");
  const hint = container.querySelector<HTMLElement>("[data-mermaid-hint]");
  if (!viewport || !pan) return;

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let panning = false;
  let sx = 0;
  let sy = 0;

  const apply = () => {
    pan.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    pan.style.transformOrigin = "center center";
    if (level) level.textContent = `${Math.round(scale * 100)}%`;
  };
  const hideHint = () => {
    if (hint) hint.style.opacity = "0";
  };
  const fit = () => {
    const svg = pan.querySelector<SVGSVGElement>("svg");
    const vb = svg?.viewBox.baseVal;
    const rect = viewport.getBoundingClientRect();
    if (!vb?.width || !vb?.height || !rect.width || !rect.height) {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
      return;
    }
    const pad = 40;
    scale = Math.min((rect.width - pad) / vb.width, (rect.height - pad) / vb.height);
    scale = Math.min(Math.max(scale, 0.2), 8);
    tx = 0;
    ty = 0;
    apply();
  };

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      scale = e.deltaY < 0 ? Math.min(scale * 1.1, 8) : Math.max(scale / 1.1, 0.2);
      apply();
      hideHint();
    },
    { passive: false },
  );
  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    panning = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
    viewport.style.cursor = "grabbing";
    viewport.setPointerCapture(e.pointerId);
    hideHint();
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!panning) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    apply();
  });
  const stop = () => {
    panning = false;
    viewport.style.cursor = "grab";
  };
  viewport.addEventListener("pointerup", stop);
  viewport.addEventListener("pointercancel", stop);

  container.querySelector("[data-mermaid-zoom-in]")?.addEventListener("click", () => {
    scale = Math.min(scale * 1.25, 8);
    apply();
    hideHint();
  });
  container.querySelector("[data-mermaid-zoom-out]")?.addEventListener("click", () => {
    scale = Math.max(scale / 1.25, 0.2);
    apply();
    hideHint();
  });
  container.querySelector("[data-mermaid-reset]")?.addEventListener("click", fit);

  requestAnimationFrame(fit);
}

async function renderDiagram(container: HTMLElement) {
  const sourceEl = container.querySelector<HTMLElement>("[data-mermaid-source]");
  const target = container.querySelector<HTMLElement>("[data-mermaid-render]");
  const loading = container.querySelector<HTMLElement>("[data-mermaid-loading]");
  if (!sourceEl || !target) return;
  const code = decode(sourceEl.getAttribute("data-mermaid-source") || "");
  if (!code) return;

  try {
    const mermaid = await initMermaid();
    const svgId = `${container.id}-svg`;
    document.getElementById(svgId)?.remove();
    const { svg } = await mermaid.render(svgId, code);
    target.innerHTML = svg;
    const svgEl = target.querySelector<SVGSVGElement>("svg");
    if (svgEl) prepareSvg(svgEl);
    if (loading) loading.style.display = "none";
  } catch (error) {
    if (loading) loading.style.display = "none";
    container.classList.add("diagram-error");
    if (sourceEl) sourceEl.hidden = false;
    console.error("Mermaid render error:", error);
    return;
  }

  setupPanZoom(container);

  const copyBtn = container.querySelector<HTMLElement>("[data-mermaid-copy]");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.classList.add("is-copied");
      window.setTimeout(() => copyBtn.classList.remove("is-copied"), 1400);
    } catch {
    }
  });
}

function queueRender(container: HTMLElement) {
  if (container.hasAttribute("data-mermaid-rendered")) return;
  container.setAttribute("data-mermaid-rendered", "");
  renderQueue = renderQueue.then(() => renderDiagram(container));
}

function renderWhenVisible(container: HTMLElement) {
  if (container.hasAttribute("data-mermaid-rendered") || container.hasAttribute("data-mermaid-observed"))
    return;
  if (!("IntersectionObserver" in window)) {
    queueRender(container);
    return;
  }
  container.setAttribute("data-mermaid-observed", "");
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      container.removeAttribute("data-mermaid-observed");
      queueRender(container);
    },
    { rootMargin: "300px 0px" },
  );
  observer.observe(container);
}

function renderAll() {
  document.querySelectorAll<HTMLElement>("[data-mermaid]").forEach(renderWhenVisible);
}

async function reRenderAll() {
  const containers = document.querySelectorAll<HTMLElement>("[data-mermaid][data-mermaid-rendered]");
  for (const container of containers) {
    const sourceEl = container.querySelector<HTMLElement>("[data-mermaid-source]");
    const target = container.querySelector<HTMLElement>("[data-mermaid-render]");
    if (!sourceEl || !target) continue;
    const code = decode(sourceEl.getAttribute("data-mermaid-source") || "");
    if (!code) continue;
    try {
      const mermaid = await initMermaid();
      const svgId = `${container.id}-svg`;
      document.getElementById(svgId)?.remove();
      const { svg } = await mermaid.render(svgId, code);
      target.innerHTML = svg;
      const svgEl = target.querySelector<SVGSVGElement>("svg");
      if (svgEl) prepareSvg(svgEl);
    } catch (error) {
      console.error("Mermaid re-render error:", error);
    }
  }
}

let themeTimer = 0;
function scheduleReRender() {
  window.clearTimeout(themeTimer);
  themeTimer = window.setTimeout(reRenderAll, 120);
}

document.addEventListener("astro:page-load", renderAll);

const themeObserver = new MutationObserver(scheduleReRender);
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class", "style"],
});
