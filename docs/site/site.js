/**
 * Adds the documentation site's small client-side behaviors: responsive
 * navigation, code copying, and search against the generated page index.
 */
const menuButton = document.querySelector(".menu-button");
const sidebar = document.querySelector(".sidebar");
const search = document.querySelector("#doc-search");
const results = document.querySelector("#search-results");

// Keep the menu button's accessibility state in sync with the mobile sidebar.
menuButton?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(open));
});

// Escape closes transient documentation UI regardless of which child has focus.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.body.classList.remove("nav-open");
  menuButton?.setAttribute("aria-expanded", "false");
  if (results) results.hidden = true;
});

// Selecting a page on a narrow screen also dismisses the navigation drawer.
sidebar?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  document.body.classList.remove("nav-open");
  menuButton?.setAttribute("aria-expanded", "false");
});

// Copy the neighboring code sample and restore the button label after feedback.
document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = button.parentElement?.querySelector("code")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy failed";
    }
    window.setTimeout(() => { button.textContent = "Copy"; }, 1_500);
  });
});

/** @typedef {{ url: string, title: string, text: string }} SearchIndexEntry */

/** Loaded once on demand so reading a page does not fetch the full search corpus. */
/** @type {SearchIndexEntry[] | undefined} */
let searchIndex;

/**
 * Replaces the search-results region with matching page links and short context.
 * @param {SearchIndexEntry[]} matches Pages already ranked and limited by the search handler.
 * @param {string} query The user's query, used to explain empty results.
 */
function showSearchResults(matches, query) {
  if (!results) return;
  results.replaceChildren();
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = `No results for "${query}".`;
    results.append(empty);
    results.hidden = false;
    return;
  }
  const list = document.createElement("ul");
  for (const match of matches) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = match.url;
    const title = document.createElement("strong");
    title.textContent = match.title;
    const summary = document.createElement("span");
    const location = match.text.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, location - 45);
    summary.textContent = match.text.slice(start, start + 140);
    link.append(title, summary);
    item.append(link);
    list.append(item);
  }
  results.append(list);
  results.hidden = false;
}

// Fetch the generated index on first use, then require every query term to match.
search?.addEventListener("input", async () => {
  const query = search.value.trim();
  if (!results) return;
  if (query.length < 2) {
    results.hidden = true;
    return;
  }
  try {
    searchIndex ??= await fetch("search-index.json").then((response) => {
      if (!response.ok) throw new Error("Documentation search index could not be loaded.");
      return response.json();
    });
  } catch {
    results.replaceChildren();
    const error = document.createElement("p");
    error.textContent = "Search is temporarily unavailable.";
    results.append(error);
    results.hidden = false;
    return;
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  // Require all words, rank exact-term coverage, and cap results to keep the menu compact.
  const matches = searchIndex
    .map((entry) => {
      const haystack = `${entry.title} ${entry.text}`.toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
      return { ...entry, score };
    })
    .filter((entry) => entry.score === words.length)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 7);
  showSearchResults(matches, query);
});
