import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const stop = (message) => {
  console.error(`\nRelease stopped: ${message}\n`);
  process.exit(1);
};

const branch = git("branch", "--show-current");
if (branch !== "main") stop(`switch to main first (current branch: ${branch || "detached"}).`);
if (git("status", "--porcelain")) stop("commit or stash all changes first.");

console.log("Checking origin/main…");
git("fetch", "origin", "main");
const localHead = git("rev-parse", "HEAD");
const remoteHead = git("rev-parse", "origin/main");
if (localHead !== remoteHead) stop("local main must exactly match origin/main. Push or pull before releasing.");

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
const tag = `play-release-${timestamp}`;

console.log(`Creating ${tag}…`);
git("tag", "-a", tag, "-m", `PG HUB closed-testing release ${timestamp}`);

try {
  git("push", "origin", tag);
} catch (error) {
  try { git("tag", "-d", tag); } catch { /* Keep the original push error. */ }
  throw error;
}

console.log(`\nRelease requested successfully.`);
console.log(`Tag: ${tag}`);
console.log("GitHub Actions will build, sign, and upload this version to the Google Play alpha closed-testing track.");
