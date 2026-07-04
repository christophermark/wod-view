#!/usr/bin/env npx tsx
// Post-process raw Maestro marketing screenshots into App-Store-ready files:
// verify each is an accepted 6.9"-class size, strip the alpha channel (App
// Store Connect rejects PNGs with transparency), and emit the numbered set
// in store order. Invoked by scripts/marketing-screenshots.sh.

import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const root = path.join(__dirname, '..');
const rawDir = path.join(root, '.maestro', 'marketing', 'raw');
const outDir = path.join(root, '.maestro', 'marketing', 'out');

// Apple's accepted 6.9" iPhone portrait sizes (App Store Connect screenshot
// specifications, July 2026). One 6.9" set covers every smaller iPhone shelf.
const ACCEPTED = [
  { w: 1320, h: 2868 }, // iPhone 17 Pro Max / 16 Pro Max native
  { w: 1290, h: 2796 },
  { w: 1260, h: 2736 },
];

// Store presentation order: hook first, then depth.
const STORE_ORDER = ['log', 'workout', 'stats', 'calendar', 'onboarding'];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  let failed = false;

  for (const [i, name] of STORE_ORDER.entries()) {
    const src = path.join(rawDir, `${name}.png`);
    if (!fs.existsSync(src)) {
      console.error(`missing raw screenshot: ${src}`);
      failed = true;
      continue;
    }
    const img = sharp(src);
    const { width, height } = await img.metadata();
    if (!ACCEPTED.some((s) => s.w === width && s.h === height)) {
      console.error(
        `${name}.png is ${width}x${height} — not an accepted 6.9" size ` +
          `(${ACCEPTED.map((s) => `${s.w}x${s.h}`).join(', ')}). ` +
          `Capture on an iPhone 17 Pro Max simulator.`,
      );
      failed = true;
      continue;
    }
    const out = path.join(
      outDir,
      `${String(i + 1).padStart(2, '0')}-${name}-${width}x${height}.png`,
    );
    await img.removeAlpha().png({ compressionLevel: 9 }).toFile(out);
    console.log(`${path.basename(out)}  ✓ ${width}x${height}, alpha stripped`);
  }

  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
