// Neon Sunset Cover Studio — the program that hands the entry in.
//
// It runs under Node 22 with the standard library only. It copies the
// offline web app (app/) and the screenshots (screenshots/) from beside
// this file into the output directory, then writes dossier.json there
// with the vendored make.fun library, so the judge can read the entry.
// Run it twice and the dossier bytes must not change.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it with /output as the target instead.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(target, { recursive: true });
copyTree(join(repoRoot, 'app'), join(target, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(target, 'screenshots'));

const dossier = buildDossier(target, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(target, 'dossier.json'), dossier);
console.log(`Entry written to ${target} (dossier.json: ${dossier.length} bytes).`);
