// Generates all app icon / logo assets from the Barlow Condensed Black "W" glyph.
//
//   npx tsx scripts/generate-brand-assets.ts
//
// The mark: an ink "W" (the app's display face) with the final upstroke in
// signal red — the same "last word in red" move the onboarding hero makes.
// Everything is rendered from one SVG source so the icon, splash, favicon,
// Android adaptive set, and in-app logo images always match.
//
// sharp and opentype.js are devDependencies used only by this script.

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseFont } from 'opentype.js';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = join(ROOT, 'assets', 'images');
const FONT_PATH = join(
  ROOT,
  'node_modules/@expo-google-fonts/barlow-condensed/900Black/BarlowCondensed_900Black.ttf',
);

const PAPER = '#F6F4EE';
const INK = '#16130D';
const ACCENT = '#E8391D';

// ---------------------------------------------------------------------------
// Mark geometry
// ---------------------------------------------------------------------------

const font = parseFont(readFileSync(FONT_PATH).buffer as ArrayBuffer);

// Glyph space: 1000 units per em, y grows downward, baseline at y=0.
const UPM = 1000;
const wPath = font.getPath('W', 0, 0, UPM).toPathData(2);
const wBox = font.getPath('W', 0, 0, UPM).getBoundingBox();

// The final upstroke's inner (left) edge runs from the top of the right
// counter notch (488,-380) to (517,-686). Extending that line through the
// merged lower V and past the glyph bounds isolates the last stroke, so the
// red fill follows the letterform's own angle.
const CLIP_SLOPE = (517 - 488) / (686 - 380); // dx per unit of rise
const clipX = (y: number) => 488 - (y - -380) * CLIP_SLOPE;
const CLIP_TOP_Y = wBox.y1 - 60;
const CLIP_BOTTOM_Y = wBox.y2 + 60;
const clipPolygon = [
  `${clipX(CLIP_BOTTOM_Y).toFixed(1)},${CLIP_BOTTOM_Y}`,
  `${clipX(CLIP_TOP_Y).toFixed(1)},${CLIP_TOP_Y}`,
  `${wBox.x2 + 120},${CLIP_TOP_Y}`,
  `${wBox.x2 + 120},${CLIP_BOTTOM_Y}`,
].join(' ');

type MarkColors = {
  /** Render the whole mark in one flat color (Android monochrome, iOS tinted). */
  mono?: string;
  /** Ink-stroke color override; the last stroke stays signal red (dark icon). */
  body?: string;
};

/** The two-color W mark, positioned inside an arbitrary canvas. */
function markGroup(opts: { scale: number; cx: number; baselineY: number } & MarkColors) {
  const { scale, cx, baselineY, mono, body } = opts;
  const glyphCx = (wBox.x1 + wBox.x2) / 2;
  const tx = cx - glyphCx * scale;
  const paths = mono
    ? `<path d="${wPath}" fill="${mono}"/>`
    : `<path d="${wPath}" fill="${body ?? INK}"/>
       <clipPath id="lastStroke"><polygon points="${clipPolygon}"/></clipPath>
       <path d="${wPath}" fill="${ACCENT}" clip-path="url(#lastStroke)"/>`;
  return `<g transform="translate(${tx.toFixed(2)} ${baselineY.toFixed(2)}) scale(${scale})">${paths}</g>`;
}

function iconSvg(canvas: number, glyphWidthRatio: number, opts?: { bg?: string } & MarkColors) {
  const scale = (canvas * glyphWidthRatio) / (wBox.x2 - wBox.x1);
  const glyphH = (wBox.y2 - wBox.y1) * scale; // y1 is cap, y2 ≈ baseline
  const baselineY = (canvas + glyphH) / 2 - wBox.y2 * scale;
  const bg = opts?.bg ? `<rect width="${canvas}" height="${canvas}" fill="${opts.bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}">${bg}${markGroup(
    { scale, cx: canvas / 2, baselineY, mono: opts?.mono, body: opts?.body },
  )}</svg>`;
}

/** Standalone mark on transparent ground, tight box plus small padding. */
function markSvg(height: number, opts?: { mono?: string }) {
  const pad = height * 0.06;
  const scale = (height - pad * 2) / (wBox.y2 - wBox.y1);
  const width = (wBox.x2 - wBox.x1) * scale + pad * 2;
  return {
    width: Math.round(width),
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(1)} ${height}">${markGroup(
      { scale, cx: width / 2, baselineY: height - pad - wBox.y2 * scale, mono: opts?.mono },
    )}</svg>`,
  };
}

/** "WOD VIEW" lockup for marketing use — WOD in ink, VIEW in red. */
function wordmarkSvg(height: number) {
  const size = height * 0.94;
  const wod = font.getPath('WOD', 0, 0, size);
  const wodWidth = font.getAdvanceWidth('WOD', size);
  const gap = size * 0.14;
  const view = font.getPath('VIEW', wodWidth + gap, 0, size);
  const viewWidth = font.getAdvanceWidth('VIEW', size);
  const width = Math.ceil(wodWidth + gap + viewWidth);
  const baseline = height * 0.97;
  return {
    width,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <g transform="translate(0 ${baseline})">
        <path d="${wod.toPathData(2)}" fill="${INK}"/>
        <path d="${view.toPathData(2)}" fill="${ACCENT}"/>
      </g>
    </svg>`,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

async function png(svg: string, outPath: string, width: number, height?: number) {
  await sharp(Buffer.from(svg), { density: 72 })
    .resize(width, height ?? width)
    .png()
    .toFile(outPath);
  console.log('wrote', outPath.replace(`${ROOT}/`, ''), `${width}x${height ?? width}`);
}

async function main() {
  mkdirSync(IMAGES, { recursive: true });

  // App icon (App Store listing uses this same 1024px art).
  await png(iconSvg(1024, 0.62, { bg: PAPER }), join(IMAGES, 'icon.png'), 1024);

  // Google Play listing icon: 512x512, full-bleed square (Play applies its
  // own corner mask, same as the in-app adaptive icon does).
  await png(iconSvg(1024, 0.62, { bg: PAPER }), join(IMAGES, 'play-icon.png'), 512);

  // iOS appearance variants (app.json ios.icon): dark and tinted must sit on
  // transparent ground — the system supplies the dark/tinted backdrop.
  await png(iconSvg(1024, 0.62, { body: PAPER }), join(IMAGES, 'ios-icon-dark.png'), 1024);
  await png(iconSvg(1024, 0.62, { mono: '#FFFFFF' }), join(IMAGES, 'ios-icon-tinted.png'), 1024);

  // Android adaptive icon: foreground must keep art inside the middle ~66%
  // safe zone; background is a solid paper layer.
  await png(iconSvg(1024, 0.42), join(IMAGES, 'android-icon-foreground.png'), 1024);
  await png(iconSvg(1024, 0, { bg: PAPER }), join(IMAGES, 'android-icon-background.png'), 1024);
  await png(
    iconSvg(1024, 0.42, { mono: '#FFFFFF' }),
    join(IMAGES, 'android-icon-monochrome.png'),
    1024,
  );

  // Splash: mark only on transparent ground (expo-splash-screen supplies the
  // paper background color and sizes it via imageWidth).
  const splash = markSvg(512);
  await png(splash.svg, join(IMAGES, 'splash-icon.png'), splash.width, 512);

  await png(iconSvg(64, 0.62, { bg: PAPER }), join(IMAGES, 'favicon.png'), 64);

  // In-app logo mark (onboarding hero) at 1x/2x/3x.
  for (const [suffix, h] of [
    ['', 44],
    ['@2x', 88],
    ['@3x', 132],
  ] as const) {
    const mark = markSvg(h);
    await png(mark.svg, join(IMAGES, `logo-mark${suffix}.png`), mark.width, h);
  }

  // Marketing wordmark (not bundled by any screen; for the App Store listing).
  const wordmark = wordmarkSvg(256);
  await png(wordmark.svg, join(IMAGES, 'logo-wordmark.png'), wordmark.width, 256);
}

main();
