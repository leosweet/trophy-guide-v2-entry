// Leonida Legend v2 — GTA 6 trophy guide entry (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, app.js,
// storage.js, roadmap.js, data/trophies.json): no build step, no network at run
// time. This program hands the entry in: it copies app/ and screenshots/ from
// beside this file into /output and writes /output/dossier.json with the
// vendored make.fun library, exactly as the scorer re-derives it. Leave
// vendor/makefun-frontend.ts untouched — the dossier must match byte for byte.
// v2 is a full rewrite of the guide: post-launch cited guides, a deeper tracker
// with per-trophy sub-checklists, and a five-stage roadmap to the platinum.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): text_max_bytes shapes the dossier
// text; the other limits refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB, more than 993 files and directories in
// app/, or app/ over 48 MiB. app/ counts beside /output's own 1000-entry cap.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
