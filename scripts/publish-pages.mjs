import { access, cp, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const pagesDirectory = path.join(repositoryRoot, "dist", "pages");
const temporaryPrefix = path.join(os.tmpdir(), "arcgis-flight-pages-");

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

async function copyOutput(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    await cp(
      path.join(source, entry.name),
      path.join(destination, entry.name),
      { recursive: entry.isDirectory(), force: true },
    );
  }
}

await access(path.join(pagesDirectory, "index.html"));

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
  runGit(["add", "--all"], temporaryDirectory);
  runGit(["commit", "-m", `Deploy ${sourceCommit}`], temporaryDirectory);
  runGit(["push", "--force", "origin", "HEAD:gh-pages"], temporaryDirectory);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Published the static site from ${sourceCommit} to gh-pages.`);
