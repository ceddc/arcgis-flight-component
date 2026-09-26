/**
 * Publishes the already-assembled dist/pages tree to the repository's
 * gh-pages branch. A disposable local Git repository prevents this deployment
 * commit from changing the user's source checkout or its current branch.
 *
 * When a local, git-ignored `site-analytics.local.html` exists, its markup is
 * added to the head of every published page. It exists only in the gh-pages
 * deployment: the repository, local builds, and dist/pages never contain it.
 */
import { access, cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const pagesDirectory = path.join(repositoryRoot, "dist", "pages");
const headSnippetFile = path.join(repositoryRoot, "site-analytics.local.html");
const dryRun = process.argv.includes("--dry-run");
const temporaryPrefix = path.join(os.tmpdir(), "arcgis-flight-pages-");

/**
 * Runs one Git command in the requested checkout and optionally returns stdout.
 *
 * @param {string[]} args Arguments passed to Git.
 * @param {string} workingDirectory Checkout in which Git runs.
 * @param {boolean} captureOutput When true, capture and return trimmed stdout.
 * @returns {string} Captured stdout or an empty string for inherited output.
 * @throws If Git exits unsuccessfully.
 */
function runGit(args, workingDirectory, captureOutput = false) {
  const result = spawnSync("git", args, {
    cwd: workingDirectory,
    encoding: "utf8",
    stdio: captureOutput ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed with exit code ${result.status}.`);
  }

  return captureOutput ? result.stdout.trim() : "";
}

/**
 * Copies each entry in the built site root into a fresh deployment checkout.
 *
 * @param {string} source Generated pages directory.
 * @param {string} destination Temporary gh-pages checkout.
 */
async function copyOutput(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    await cp(
      path.join(source, entry.name),
      path.join(destination, entry.name),
      { recursive: entry.isDirectory(), force: true },
    );
  }
}

/**
 * Adds `snippet` before `</head>` in every HTML file under `directory`,
 * skipping pages that already contain it.
 *
 * @param {string} directory Deployment checkout to update in place.
 * @param {string} snippet Head markup from the local snippet file.
 * @returns {Promise<number>} Number of pages updated.
 */
async function addHeadSnippet(directory, snippet) {
  let updated = 0;
  for (const entry of await readdir(directory, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const file = path.join(entry.parentPath, entry.name);
    const html = await readFile(file, "utf8");
    if (!html.includes("</head>") || html.includes(snippet)) continue;
    await writeFile(file, html.replace("</head>", `${snippet}\n</head>`), "utf8");
    updated += 1;
  }
  return updated;
}

await access(path.join(pagesDirectory, "index.html"));
const headSnippet = (await readFile(headSnippetFile, "utf8").catch(() => "")).trim();

const remoteUrl = runGit(["remote", "get-url", "origin"], repositoryRoot, true);
const sourceCommit = runGit(["rev-parse", "--short", "HEAD"], repositoryRoot, true);
const temporaryDirectory = await mkdtemp(temporaryPrefix);

if (!temporaryDirectory.startsWith(temporaryPrefix)) {
  throw new Error(`Unexpected temporary deployment path: ${temporaryDirectory}`);
}

try {
  runGit(["init", "--initial-branch=gh-pages"], temporaryDirectory);
  runGit(["remote", "add", "origin", remoteUrl], temporaryDirectory);
  await copyOutput(pagesDirectory, temporaryDirectory);
  if (headSnippet) {
    const pages = await addHeadSnippet(temporaryDirectory, headSnippet);
    console.log(`Added the local head snippet to ${pages} published pages.`);
  } else {
    console.log("No site-analytics.local.html found; publishing without a head snippet.");
  }
  // --dry-run prepares the deployment checkout without committing or pushing.
  if (dryRun) {
    console.log(`Dry run: deployment prepared in ${temporaryDirectory}; nothing was published.`);
    process.exit(0);
  }
  runGit(["add", "--all"], temporaryDirectory);
  runGit(["commit", "-m", `Deploy ${sourceCommit}`], temporaryDirectory);
  runGit(["push", "--force", "origin", "HEAD:gh-pages"], temporaryDirectory);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Published the static site from ${sourceCommit} to gh-pages.`);
