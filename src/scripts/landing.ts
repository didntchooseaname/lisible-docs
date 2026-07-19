const tabKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];

function activateTab(tab: HTMLButtonElement) {
  const tablist = tab.closest<HTMLElement>("[data-landing-tabs]");
  if (!tablist) return;

  for (const item of tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
    const active = item === tab;
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
    const panelId = item.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (panel instanceof HTMLElement) panel.hidden = !active;
  }
}

function initLandingTabs() {
  for (const tablist of document.querySelectorAll<HTMLElement>("[data-landing-tabs]:not([data-ready])")) {
    tablist.dataset.ready = "true";
    const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    for (const [index, tab] of tabs.entries()) {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!tabKeys.includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        const next = tabs[nextIndex];
        activateTab(next);
        next.focus();
      });
    }
  }
}

function initPointerCards() {
  for (const card of document.querySelectorAll<HTMLElement>("[data-pointer-card]:not([data-pointer-ready])")) {
    card.dataset.pointerReady = "true";
    let frame = 0;

    card.addEventListener("pointermove", (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      });
    });

    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--pointer-x");
      card.style.removeProperty("--pointer-y");
    });
  }
}

function initLanding() {
  initLandingTabs();
  initPointerCards();
}

initLanding();
document.addEventListener("astro:page-load", initLanding);
