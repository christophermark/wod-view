#!/usr/bin/env npx tsx
// Composes the branded App Store preview images: each raw Maestro screenshot
// (.maestro/marketing/raw/) framed inside a "meet card" — mono eyebrow, huge
// Barlow Condensed headline with the closing phrase in signal red (the same
// "last word in red" move the onboarding hero and app icon make), screenshot
// in an ink device frame bleeding off the bottom edge.
//
//   npm run store-previews          (raw screenshots must exist — npm run screenshots)
//
// Emits every slide at all accepted store sizes (App Store Connect + Google
// Play Console specs, July 2026): iPhone 6.9" 1320x2868, iPhone 6.5"
// 1284x2778 (a separate required upload bucket in ASC, not auto-waived by
// the 6.9" set), iPad 13" 2048x2732, and three 9:16 Google Play sets —
// phone 1440x2560, 7" tablet 1080x1920, 10" tablet 2160x3840. Play rejects
// the iPhone canvases outright (hard 2:1 max aspect; modern iPhones are
// ~2.17:1) and wants exact 9:16 at ≥1080px for promotion eligibility, hence
// the dedicated sets. Also emits the Play feature graphic (1024x500).
// The iPad set is uploadable only if/when the app ships iPad support —
// generated anyway so it's ready. Slide copy lives in SLIDES below; edit it
// there, never the PNGs.
// Follows the generate-brand-assets.ts pattern: opentype.js text → SVG paths
// → sharp, so nothing depends on installed system fonts.

import fs from 'node:fs';
import path from 'node:path';

import { parse as parseFont, Font } from 'opentype.js';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const RAW = path.join(ROOT, '.maestro', 'marketing', 'raw');
const OUT = path.join(ROOT, '.maestro', 'marketing', 'out', 'store');

const PAPER = '#F6F4EE';
const INK = '#16130D';
const ACCENT = '#E8391D';
const HAIRLINE = '#E7E3D8';
const INK_SOFT = '#5C574B';
const GOLD = '#A87B00';
const CARD = '#FFFFFF';

const loadFont = (p: string): Font =>
  parseFont(fs.readFileSync(path.join(ROOT, p)).buffer as ArrayBuffer);
const display = loadFont(
  'node_modules/@expo-google-fonts/barlow-condensed/900Black/BarlowCondensed_900Black.ttf',
);
const mono = loadFont(
  'node_modules/@expo-google-fonts/ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf',
);

// ---------------------------------------------------------------------------
// Slide deck — the editable part.
// ---------------------------------------------------------------------------

interface Segment {
  text: string;
  accent?: boolean; // render in signal red (paper slides) / stays paper on red bg
}

interface Slide {
  /** Raw screenshot basename in .maestro/marketing/raw/, or null for type-only. */
  shot: string | null;
  /** Output name; final files are NN-<name>-WxH.png in store order. */
  name: string;
  /** Mono eyebrow line. */
  eyebrow: string;
  /** Headline lines; each line is segments so a phrase can flip to accent. */
  lines: Segment[][];
  /** Canvas treatment. */
  bg: 'paper' | 'ink' | 'accent';
  /** Optional small mono footer line (used by the type-only closer). */
  footer?: string;
  /** Render the export → import → insight diagram instead of a screenshot. */
  diagram?: boolean;
}

const SLIDES: Slide[] = [
  {
    shot: 'log',
    name: 'log',
    eyebrow: 'PERSONAL WOD ARCHIVE',
    lines: [
      [{ text: 'EVERY REP.' }],
      [{ text: 'EVERY PR.' }],
      [{ text: 'ANALYZED.', accent: true }],
    ],
    bg: 'ink',
  },
  {
    shot: null,
    name: 'import',
    eyebrow: 'HOW IT WORKS',
    lines: [[{ text: 'IMPORT YOUR' }], [{ text: 'WORKOUTS ' }, { text: 'HERE.', accent: true }]],
    bg: 'paper',
    diagram: true,
    footer: 'IMPORT TAKES ABOUT TWO MINUTES.',
  },
  {
    shot: 'stats',
    name: 'stats',
    eyebrow: 'THE STATS',
    lines: [
      [{ text: 'THE WORKOUT STATS' }],
      [{ text: 'YOU ALWAYS ' }, { text: 'CRAVED.', accent: true }],
    ],
    bg: 'paper',
  },
  {
    shot: 'workout',
    name: 'workout',
    eyebrow: 'THE WORKOUT',
    lines: [[{ text: 'PR DAYS, ' }, { text: 'ORGANIZED.', accent: true }]],
    bg: 'paper',
  },
  {
    shot: 'calendar',
    name: 'calendar',
    eyebrow: 'THE CALENDAR',
    lines: [[{ text: 'ATTENDANCE IN' }], [{ text: 'BLACK AND ' }, { text: 'RED.', accent: true }]],
    bg: 'paper',
  },
  {
    shot: 'search',
    name: 'search',
    eyebrow: 'SEARCH',
    lines: [[{ text: 'THAT ONE WOD? ' }, { text: 'FOUND.', accent: true }]],
    bg: 'paper',
  },
  {
    shot: null,
    name: 'private',
    eyebrow: 'PRIVATE BY ARCHITECTURE',
    lines: [[{ text: 'NO ACCOUNT.' }], [{ text: 'NO SERVERS.' }], [{ text: 'JUST YOUR HISTORY.' }]],
    bg: 'accent',
    footer: 'YOUR DATA NEVER LEAVES THIS DEVICE.',
  },
];

// ---------------------------------------------------------------------------
// Store canvases (accepted App Store Connect sizes, July 2026).
// ---------------------------------------------------------------------------

interface Device {
  dir: string;
  w: number;
  h: number;
  margin: number;
  /** Screenshot width as a fraction of canvas width. */
  shotFraction: number;
}

const DEVICES: Device[] = [
  { dir: 'iphone-6.9', w: 1320, h: 2868, margin: 96, shotFraction: 0.8 },
  // App Store Connect's separate "iPhone 6.5" Display" bucket accepts either
  // 1242x2688 or 1284x2778 — 1284x2778 is the newer/larger of the two.
  { dir: 'iphone-6.5', w: 1284, h: 2778, margin: 96, shotFraction: 0.8 },
  { dir: 'ipad-13', w: 2048, h: 2732, margin: 144, shotFraction: 0.46 },
  // Google Play sets: exact 9:16 (promotion-eligible; Play's hard limit is
  // 2:1, which the iPhone canvases above exceed). Same aspect for phone and
  // both tablet buckets — Play has no separate tablet aspect, just separate
  // upload slots — so these three render identically, only scaled. Margins
  // track canvas height (96 at the 2868 reference) to keep the composition
  // identical across sizes.
  { dir: 'play-phone', w: 1440, h: 2560, margin: 86, shotFraction: 0.66 },
  { dir: 'play-tablet-7', w: 1080, h: 1920, margin: 64, shotFraction: 0.66 },
  { dir: 'play-tablet-10', w: 2160, h: 3840, margin: 129, shotFraction: 0.66 },
];

const RAW_W = 1320; // raws must come off an iPhone 17 Pro Max simulator
const RAW_H = 2868;

// ---------------------------------------------------------------------------
// SVG text helpers (glyphs → paths; no system fonts involved).
//
// Outlines are always generated at the font's native em size and scaled with
// an SVG transform: opentype.js 2.0 emits corrupt contours for some glyphs at
// fractional pixel sizes (a runaway vertex whose winding blanks the rest of
// the path) — e.g. Barlow Condensed "ATTENDANCE" at size 168. Native-em
// coordinates are integers, which sidesteps the bug entirely; it's also why
// generate-brand-assets.ts (UPM-space paths) never hit it.
// ---------------------------------------------------------------------------

/** Single-color text run as a filled path. */
function textPath(font: Font, text: string, x: number, y: number, size: number, fill: string) {
  const s = size / font.unitsPerEm;
  const d = font.getPath(text, 0, 0, font.unitsPerEm).toPathData(2);
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(6)})"><path d="${d}" fill="${fill}"/></g>`;
}

/** Mono text with letter tracking (per-glyph advance). Returns svg + width. */
function trackedText(
  font: Font,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  tracking: number,
) {
  const upm = font.unitsPerEm;
  const s = size / upm;
  const trackingEm = tracking / s;
  let cursor = 0;
  const parts: string[] = [];
  for (const ch of text) {
    // Glyphs are drawn at x=0 and positioned by transform: passing the
    // accumulated (float-noisy) cursor into getPath can trip the same
    // opentype.js 2.0 contour bug as fractional sizes — e.g. Plex Mono "W"
    // at x=6900.000000000001 comes back with every x coordinate NaN.
    const d = font.getPath(ch, 0, 0, upm).toPathData(2);
    parts.push(
      `<g transform="translate(${cursor.toFixed(2)} 0)"><path d="${d}" fill="${fill}"/></g>`,
    );
    cursor += font.getAdvanceWidth(ch, upm) + trackingEm;
  }
  return {
    svg: `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(6)})">${parts.join('')}</g>`,
    width: (cursor - trackingEm) * s,
  };
}

// ---------------------------------------------------------------------------
// Import diagram (the value-prop slide): export → import → insight, drawn in
// the app's own UI grammar — numbered rows like the onboarding value props,
// the csv chip from settings, the real import button, stat tiles from the
// stats screen. All sizes are iPhone-canvas units scaled by `s`.
// ---------------------------------------------------------------------------

function importDiagram(margin: number, contentTop: number, s: number): string {
  const parts: string[] = [];
  const contentX = margin + 118 * s;
  const artifactW = 950 * s;

  // Renders number + label + sub lines; returns the y where the step's
  // artifact should start. Sub lines shrink to fit the text column.
  const maxSubW = artifactW + 60 * s;
  const stepLabel = (n: string, label: string, subs: string[], baseline: number): number => {
    parts.push(trackedText(mono, n, margin, baseline - 10 * s, 40 * s, ACCENT, 4 * s).svg);
    parts.push(textPath(display, label, contentX, baseline, 88 * s, INK));
    let subY = baseline + 78 * s;
    for (const sub of subs) {
      let size = 40 * s;
      const probe = trackedText(mono, sub, 0, 0, size, INK_SOFT, 3 * s);
      if (probe.width > maxSubW) size *= maxSubW / probe.width;
      parts.push(trackedText(mono, sub, contentX, subY, size, INK_SOFT, 3 * s).svg);
      subY += 58 * s;
    }
    return subY - 58 * s + 50 * s;
  };
  const arrow = (y: number) => {
    const ax = contentX + 90 * s;
    parts.push(
      `<polygon points="${ax - 20 * s},${y} ${ax + 20 * s},${y} ${ax},${y + 34 * s}" fill="${ACCENT}"/>`,
    );
  };

  // 01 EXPORT — the csv chip (settings screen's grammar).
  let y = contentTop + 110 * s;
  const chipTop = stepLabel(
    '01',
    'EXPORT',
    ['YOUR WORKOUT DATA FROM YOUR GYM APP', '(SUGARWOD AND CHALK IT PRO SUPPORTED)'],
    y,
  );
  const chipH = 170 * s;
  parts.push(
    `<rect x="${contentX}" y="${chipTop}" width="${artifactW}" height="${chipH}" rx="${24 * s}" fill="${CARD}" stroke="${HAIRLINE}" stroke-width="${2.5 * s}"/>`,
    `<rect x="${contentX + 30 * s}" y="${chipTop + 32 * s}" width="${106 * s}" height="${106 * s}" rx="${18 * s}" fill="${ACCENT}"/>`,
  );
  const csv = trackedText(mono, 'CSV', 0, 0, 30 * s, PAPER, 2 * s);
  parts.push(
    trackedText(
      mono,
      'CSV',
      contentX + 30 * s + (106 * s - csv.width) / 2,
      chipTop + 96 * s,
      30 * s,
      PAPER,
      2 * s,
    ).svg,
    trackedText(mono, 'workouts.csv', contentX + 176 * s, chipTop + 102 * s, 46 * s, INK, 1 * s)
      .svg,
  );
  arrow(chipTop + chipH + 92 * s);

  // 02 IMPORT — the app's actual button.
  y = chipTop + chipH + 300 * s;
  const btnTop = stepLabel('02', 'IMPORT', ['ONE TAP. PARSED ON THIS PHONE.'], y);
  const btnH = 160 * s;
  parts.push(
    `<rect x="${contentX}" y="${btnTop}" width="${artifactW}" height="${btnH}" rx="${20 * s}" fill="${INK}"/>`,
  );
  const btnLabelW = display.getAdvanceWidth('IMPORT ', 60 * s);
  const btnFile = trackedText(mono, 'workouts.csv…', 0, 0, 44 * s, PAPER, 0);
  const btnX = contentX + (artifactW - btnLabelW - btnFile.width) / 2;
  const btnBase = btnTop + btnH / 2 + 22 * s;
  parts.push(
    textPath(display, 'IMPORT ', btnX, btnBase, 60 * s, PAPER),
    trackedText(mono, 'workouts.csv…', btnX + btnLabelW, btnBase, 44 * s, PAPER, 0).svg,
  );
  arrow(btnTop + btnH + 92 * s);

  // 03 INSIGHT — stat tiles (stats screen's grammar).
  y = btnTop + btnH + 300 * s;
  const tileTopFromLabel = stepLabel('03', 'INSIGHT', ['THE NUMBERS YOU NEVER HAD'], y);
  const tiles: [value: string, label: string, color: string][] = [
    ['372', 'WODS', INK],
    ['23', 'PRS', GOLD],
    ['30', 'WK STREAK', ACCENT],
  ];
  const tileTop = tileTopFromLabel;
  const tileW = 298 * s;
  const tileH = 280 * s;
  const tileGap = 28 * s;
  tiles.forEach(([value, label, color], i) => {
    const tx = contentX + i * (tileW + tileGap);
    parts.push(
      `<rect x="${tx}" y="${tileTop}" width="${tileW}" height="${tileH}" rx="${24 * s}" fill="${CARD}" stroke="${HAIRLINE}" stroke-width="${2.5 * s}"/>`,
      trackedText(mono, value, tx + 34 * s, tileTop + 128 * s, 84 * s, color, 0).svg,
      trackedText(mono, label, tx + 34 * s, tileTop + 200 * s, 30 * s, INK_SOFT, 3 * s).svg,
    );
  });

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Slide renderer
// ---------------------------------------------------------------------------

function palette(bg: Slide['bg']) {
  switch (bg) {
    case 'paper':
      return { bg: PAPER, type: INK, accent: ACCENT, eyebrow: ACCENT, frame: INK, edge: HAIRLINE };
    case 'ink':
      return {
        bg: INK,
        type: PAPER,
        accent: ACCENT,
        eyebrow: ACCENT,
        frame: '#000000',
        edge: '#3A362C',
      };
    case 'accent':
      return { bg: ACCENT, type: PAPER, accent: PAPER, eyebrow: PAPER, frame: INK, edge: PAPER };
  }
}

async function renderSlide(slide: Slide, device: Device, index: number) {
  const { w, h, margin } = device;
  const colors = palette(slide.bg);
  // Type scale tracks canvas height so iPhone and iPad decks feel identical.
  const s = h / RAW_H;
  const eyebrowSize = 40 * s;
  // Auto-fit: shrink the whole headline block if any line would overflow.
  const maxLineWidth = Math.max(
    ...slide.lines.map((line) =>
      line.reduce((wsum, seg) => wsum + display.getAdvanceWidth(seg.text, 168 * s), 0),
    ),
  );
  const fit = Math.min(1, (w - margin * 2) / maxLineWidth);
  const headSize = 168 * s * fit;
  const lineHeight = 156 * s * fit;

  const parts: string[] = [`<rect width="${w}" height="${h}" fill="${colors.bg}"/>`];

  // Eyebrow: red index number + tracked label, with a short rule.
  const eyebrowY = margin + 110 * s;
  const num = trackedText(
    mono,
    String(index + 1).padStart(2, '0'),
    margin,
    eyebrowY,
    eyebrowSize,
    colors.eyebrow,
    4 * s,
  );
  parts.push(num.svg);
  const label = trackedText(
    mono,
    slide.eyebrow,
    margin + num.width + 36 * s,
    eyebrowY,
    eyebrowSize,
    colors.eyebrow,
    7 * s,
  );
  parts.push(label.svg);

  // Headline lines, mixed-color segments.
  let baseline = eyebrowY + 74 * s + headSize;
  for (const line of slide.lines) {
    let x = margin;
    for (const seg of line) {
      parts.push(
        textPath(
          display,
          seg.text,
          x,
          baseline,
          headSize,
          seg.accent ? colors.accent : colors.type,
        ),
      );
      x += display.getAdvanceWidth(seg.text, headSize);
    }
    baseline += lineHeight;
  }
  const headlineBottom = baseline - lineHeight;

  if (slide.shot) {
    const rawPath = path.join(RAW, `${slide.shot}.png`);
    if (!fs.existsSync(rawPath))
      throw new Error(`missing raw screenshot: ${rawPath} — run npm run screenshots first`);
    const meta = await sharp(rawPath).metadata();
    if (meta.width !== RAW_W || meta.height !== RAW_H) {
      throw new Error(
        `${slide.shot}.png is ${meta.width}x${meta.height}, expected ${RAW_W}x${RAW_H} ` +
          `(capture on an iPhone 17 Pro Max simulator)`,
      );
    }

    // Device frame: ink bezel, rounded corners, screenshot clipped inside,
    // bleeding off the bottom of the canvas.
    const shotW = w * device.shotFraction;
    const shotH = (RAW_H / RAW_W) * shotW;
    const bezel = 16 * s;
    const shotX = (w - shotW) / 2;
    const shotY = headlineBottom + 120 * s;
    const rOuter = 84 * (shotW / RAW_W) + bezel;
    const rInner = 84 * (shotW / RAW_W);
    const b64 = fs.readFileSync(rawPath).toString('base64');

    parts.push(
      // bezel + hairline edge
      `<rect x="${shotX - bezel}" y="${shotY - bezel}" width="${shotW + bezel * 2}" height="${shotH + bezel * 2}" rx="${rOuter}" fill="${colors.frame}" stroke="${colors.edge}" stroke-width="${2.5 * s}"/>`,
      `<clipPath id="shot"><rect x="${shotX}" y="${shotY}" width="${shotW}" height="${shotH}" rx="${rInner}"/></clipPath>`,
      `<image clip-path="url(#shot)" x="${shotX}" y="${shotY}" width="${shotW}" height="${shotH}" href="data:image/png;base64,${b64}"/>`,
    );
  }

  if (slide.diagram) {
    parts.push(importDiagram(margin, headlineBottom + 60 * s, s));
  } else if (!slide.shot) {
    // Type-only slide: fill the field with a giant ghost of the "W" mark
    // (the app icon's glyph), bleeding off the bottom-right corner.
    const wSize = 2300 * s;
    parts.push(
      `<g opacity="0.14">${textPath(display, 'W', w - display.getAdvanceWidth('W', wSize) * 0.72, h + 8 * s, wSize, colors.type)}</g>`,
    );
  }

  if (slide.footer) {
    const f = trackedText(mono, slide.footer, 0, 0, 34 * s, colors.type, 6 * s);
    const fx = (w - f.width) / 2;
    const fy = h - margin - 40 * s;
    parts.push(
      `<line x1="${fx}" y1="${fy - 72 * s}" x2="${fx + f.width}" y2="${fy - 72 * s}" stroke="${colors.type}" stroke-width="${3 * s}" opacity="0.4"/>`,
      trackedText(mono, slide.footer, fx, fy, 34 * s, colors.type, 6 * s).svg,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  const outDir = path.join(OUT, device.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `${String(index + 1).padStart(2, '0')}-${slide.name}-${w}x${h}.png`,
  );
  await sharp(Buffer.from(svg), { density: 72 })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  // Belt and braces: emitted files must be exactly the store size.
  const check = await sharp(outPath).metadata();
  if (check.width !== w || check.height !== h) {
    throw new Error(`${outPath} rendered at ${check.width}x${check.height}, expected ${w}x${h}`);
  }
  console.log(`${device.dir}/${path.basename(outPath)}  ✓`);
}

// ---------------------------------------------------------------------------
// Google Play feature graphic (1024x500) — the listing's landscape banner.
// The ink hero slide's grammar turned sideways: mono eyebrow, headline stack
// with the last word in red, ghost W bleeding off the right edge. No
// screenshot — Play crops and dims this asset in some placements, so it
// stays pure branding with everything important well inside the edges.
// ---------------------------------------------------------------------------

async function renderFeatureGraphic() {
  const w = 1024;
  const h = 500;
  const margin = 64;
  const parts: string[] = [`<rect width="${w}" height="${h}" fill="${INK}"/>`];

  const wSize = 760;
  parts.push(
    `<g opacity="0.14">${textPath(display, 'W', w - display.getAdvanceWidth('W', wSize) * 0.7, h + 40, wSize, PAPER)}</g>`,
  );

  const eyebrowY = margin + 26;
  parts.push(trackedText(mono, 'PERSONAL WOD ARCHIVE', margin, eyebrowY, 24, ACCENT, 4).svg);

  const lines: Segment[][] = [
    [{ text: 'EVERY REP.' }],
    [{ text: 'EVERY PR.' }],
    [{ text: 'ANALYZED.', accent: true }],
  ];
  const headSize = 108;
  const lineHeight = 100;
  let baseline = eyebrowY + 40 + headSize;
  for (const line of lines) {
    let x = margin;
    for (const seg of line) {
      parts.push(textPath(display, seg.text, x, baseline, headSize, seg.accent ? ACCENT : PAPER));
      x += display.getAdvanceWidth(seg.text, headSize);
    }
    baseline += lineHeight;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  const outPath = path.join(OUT, `feature-graphic-${w}x${h}.png`);
  await sharp(Buffer.from(svg), { density: 72 })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const check = await sharp(outPath).metadata();
  if (check.width !== w || check.height !== h) {
    throw new Error(`${outPath} rendered at ${check.width}x${check.height}, expected ${w}x${h}`);
  }
  console.log(`${path.basename(outPath)}  ✓`);
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const device of DEVICES) {
    for (const [i, slide] of SLIDES.entries()) await renderSlide(slide, device, i);
  }
  await renderFeatureGraphic();
  console.log(
    `\nStore previews: ${OUT.replace(`${ROOT}/`, '')}/{${DEVICES.map((d) => d.dir).join(',')}}`,
  );
  console.log('iPad set is uploadable only once the app ships iPad support (iPhone-only today).');
  console.log('Play uploads: play-phone + play-tablet-7 + play-tablet-10 + feature graphic;');
  console.log('the Play listing icon is assets/images/play-icon.png (generate-brand-assets.ts).');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
