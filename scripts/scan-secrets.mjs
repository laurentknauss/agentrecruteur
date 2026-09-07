// Scan de secrets — utilisé par les hooks Husky (pre-commit/pre-push) et la CI.
// Usage:
//   node scripts/scan-secrets.mjs            → scanne les fichiers trackés du worktree
//   node scripts/scan-secrets.mjs --staged   → scanne uniquement le diff indexé
// Sortie: liste fichier:ligne avec motif (masqué), exit 1 si détection.

import { execSync } from "node:child_process";

const PATTERNS = [
  [/sk-[A-Za-z0-9]{16,}/g, "clé API OpenAI/Moonshot (sk-…)"],
  [/ghp_[A-Za-z0-9]{36,}/g, "token GitHub (ghp_)"],
  [/gho_[A-Za-z0-9]{36,}/g, "token GitHub OAuth (gho_)"],
  [/github_pat_[A-Za-z0-9_]{20,}/g, "token GitHub PAT"],
  [/AKIA[0-9A-Z]{16}/g, "clé AWS (AKIA…)"],
  [/AIza[0-9A-Za-z_-]{20,}/g, "clé Google (AIza…)"],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/g, "token Slack"],
  [/-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g, "clé privée (PEM)"],
  [/mongodb(\+srv)?:\/\/[^\s$<]{8,}/g, "URI MongoDB (avec credentials éventuels)"],
];

const staged = process.argv.includes("--staged");

let target;
try {
  target = staged
    ? execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf-8" })
    : execSync("git ls-files -z", { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
} catch {
  process.exit(0); // pas de diff / hors git
}

const files = staged
  ? target.split("\n").filter(Boolean)
  : target.split("\0").filter(Boolean);

const exts = /\.(pdf|png|jpe?g|gif|webp|ico|woff2?|ttf|lock|map|tex)$/i;

const findings = [];
for (const file of files) {
  if (exts.test(file)) continue;
  if (file.includes("node_modules")) continue;
  if (/\.env\.example/.test(file)) continue;
  let content;
  try {
    content = staged
      ? execSync(`git show :${file}`, { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 }).replace(/\r\n/g, "\n")
      : execSync(`git show HEAD:${file}`, { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 }).replace(/\r\n/g, "\n");
  } catch {
    try {
      content = require("node:fs").readFileSync(file, "utf-8");
    } catch {
      continue;
    }
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const [re, label] of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(lines[i])) {
        findings.push(`${file}:${i + 1}  [${label}]`);
        break;
      }
    }
  }
  // Fichier d'environnement committé (hors .env.example) → alerte
  if (/\.env(\..+)?$/.test(file)) {
    findings.push(`${file}:1  [fichier .env committé — interdit]`);
  }
}

if (findings.length) {
  console.error("❌ Scan secrets : détection — refusé :");
  for (const f of findings) console.error("   " + f);
  process.exit(1);
}
console.log("✅ Scan secrets : OK");
