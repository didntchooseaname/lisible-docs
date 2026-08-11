type ViewTransitionLike = {
  ready?: Promise<void>;
  finished?: Promise<void>;
};
type DocWithVT = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

const DURATION = 500;

/**
 * Runs `apply` inside a view transition that reveals the new theme in a
 * circle growing from `origin`, matching the lisible blog theme toggle.
 * Falls back to a plain `apply()` without animation when view transitions
 * are unavailable or reduced motion is requested.
 */
export function circularThemeTransition(origin: HTMLElement, apply: () => void): void {
  const doc = document as DocWithVT;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof doc.startViewTransition !== "function" || reduce) {
    apply();
    return;
  }

  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
  const from = `circle(0px at ${x}px ${y}px)`;
  const to = `circle(${maxRadius}px at ${x}px ${y}px)`;

  const root = document.documentElement;
  root.dataset.magicuiThemeVt = "active";
  root.style.setProperty("--magicui-theme-toggle-vt-duration", `${DURATION}ms`);
  root.style.setProperty("--magicui-theme-vt-clip-from", from);

  const cleanup = () => {
    delete root.dataset.magicuiThemeVt;
    root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    root.style.removeProperty("--magicui-theme-vt-clip-from");
  };

  const transition = doc.startViewTransition(() => {
    apply();
  });

  if (transition.finished && typeof transition.finished.finally === "function") {
    transition.finished.finally(cleanup);
  } else {
    cleanup();
  }

  if (transition.ready && typeof transition.ready.then === "function") {
    transition.ready.then(() => {
      root.animate(
        { clipPath: [from, to] },
        {
          duration: DURATION,
          easing: "ease-in-out",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }
}
