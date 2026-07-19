const CARD_SELECTOR = "[data-github-repo]:not([data-github-demo-loaded])";

function setFallback(root: HTMLElement, selector: string, value: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) return;
  const current = element.textContent?.trim() ?? "";
  if (!current || /^(loading|chargement)/i.test(current)) element.textContent = value;
}

function initGithubCards(): void {
  const french = document.documentElement.lang === "fr";
  document.querySelectorAll<HTMLAnchorElement>(CARD_SELECTOR).forEach((card) => {
    const repo = card.dataset.githubRepo;
    if (!repo) return;

    card.setAttribute("data-github-demo-loaded", "");
    card.setAttribute("data-github-static", "");
    setFallback(
      card,
      "[data-gc-description]",
      french ? `Aperçu statique du dépôt GitHub ${repo}.` : `Static preview of the ${repo} GitHub repository.`,
    );
    setFallback(card, "[data-gc-stars]", "—");
    setFallback(card, "[data-gc-forks]", "—");
    setFallback(card, "[data-gc-language]", "GitHub");
    card.classList.remove("is-loading", "is-error");
    card.classList.add("is-loaded");
  });
}

initGithubCards();
document.addEventListener("astro:page-load", initGithubCards);
