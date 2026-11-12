// One-off generator: renders the same lucide "Boxes" mark shown in the app
// header/login card (bg-accent square + accent-foreground icon) into the
// PWA icon files. Rerun after changing the brand mark or accent color.
// Usage: node scripts/gen-app-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BG = '#fa6832'; // --accent (Prusa orange)
const FG = '#1a1a1a'; // --accent-foreground (graphite: dark mark on orange)

// lucide-react "boxes" icon path data (24x24 viewBox, stroke-based)
const BOXES_PATHS = [
  'M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z',
  'm7 16.5-4.74-2.85',
  'm7 16.5 5-3',
  'M7 16.5v5.17',
  'M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z',
  'm17 16.5-5-3',
  'm17 16.5 4.74-2.85',
  'M17 16.5v5.17',
  'M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z',
  'M12 8 7.26 5.15',
  'm12 8 4.74-2.85',
  'M12 13.5V8',
];

// strokeWidthUnits is in the glyph's own 24x24 space (lucide's default is 2)
// and scales together with the icon — bigger icon ⇒ proportionally bolder
// line, matching how the mark actually renders inline in the app.
function iconSvg({ size, cornerRatio, iconRatio, strokeWidthUnits = 2 }) {
  const rx = size * cornerRatio;
  const iconSize = size * iconRatio;
  const scale = iconSize / 24;
  const offset = (size - iconSize) / 2;

  const paths = BOXES_PATHS.map((d) => `<path d="${d}" />`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BG}" />
  <g transform="translate(${offset} ${offset}) scale(${scale})"
     fill="none" stroke="${FG}" stroke-width="${strokeWidthUnits}"
     stroke-linecap="round" stroke-linejoin="round">
    ${paths}
  </g>
</svg>`;
}

const outDir = path.join(process.cwd(), 'public');
mkdirSync(outDir, { recursive: true });

async function render(name, svg, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log('wrote', name);
}
async function renderSvg(name, svg) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path.join(outDir, name), svg);
  console.log('wrote', name);
}

async function main() {
  // "any" purpose: rounded squircle, generous fill, bolder line
  const anyStyle = {
    cornerRatio: 0.205,
    iconRatio: 0.66,
    strokeWidthUnits: 1.5,
  };
  await render('icon-192.png', iconSvg({ size: 192, ...anyStyle }), 192);
  await render('icon-512.png', iconSvg({ size: 512, ...anyStyle }), 512);
  await render(
    'apple-icon.png',
    // iOS masks/rounds this itself — full-bleed square, no pre-rounding
    iconSvg({ size: 180, ...anyStyle, cornerRatio: 0 }),
    180
  );

  // maskable: full-bleed square (OS applies its own mask shape), content
  // kept inside the safe zone but with less dead padding than before
  await render(
    'icon-maskable-512.png',
    iconSvg({
      size: 512,
      cornerRatio: 0,
      iconRatio: 0.5,
      strokeWidthUnits: 1.5,
    }),
    512
  );

  // Favicon: same mark, bolder + tighter crop so it still reads at 16-32px
  const faviconStyle = {
    size: 48,
    cornerRatio: 0.22,
    iconRatio: 0.68,
    strokeWidthUnits: 1.5,
  };
  await render('icon-light-32x32.png', iconSvg(faviconStyle), 32);
  await render('icon-dark-32x32.png', iconSvg(faviconStyle), 32);
  await renderSvg('icon.svg', iconSvg(faviconStyle));
}

main();
