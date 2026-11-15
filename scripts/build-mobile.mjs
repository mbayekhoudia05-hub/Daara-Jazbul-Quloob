import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "www");
const excludedDirectories = new Set([".git", ".github", "node_modules", "www", "android", "ios", "scripts"]);
const excludedFiles = new Set(["package.json", "package-lock.json", "capacitor.config.json", ".gitignore", "README.md", "MOBILE_APP_PLAN.md"]);

async function copyPublicFiles(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && excludedFiles.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyPublicFiles(from, to);
    else if (entry.isFile()) await cp(from, to);
  }
}

await rm(output, { recursive: true, force: true });
await copyPublicFiles(root, output);
if (!(await stat(path.join(output, "index.html")).catch(() => null))) {
  throw new Error("index.html introuvable dans les ressources mobiles.");
}
console.log("Ressources web copiées dans www/ pour Capacitor.");
