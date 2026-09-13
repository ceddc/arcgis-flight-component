const menuButton = document.querySelector(".menu-button");
const sidebar = document.querySelector(".sidebar");
const search = document.querySelector("#doc-search");
const results = document.querySelector("#search-results");

menuButton?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.body.classList.remove("nav-open");
  menuButton?.setAttribute("aria-expanded", "false");
  if (results) results.hidden = true;
});

sidebar?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  document.body.classList.remove("nav-open");
  menuButton?.setAttribute("aria-expanded", "false");
});

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

let searchIndex;

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
