/* Regenerates every DzKricar brand asset from the single mark definition below.

   Run:  node scripts/generate-brand.cjs
   Then: npx capacitor-assets generate    (rebuilds the Android/iOS icons + splashes)

   Everything downstream — favicon, PWA icons, app icon, splash screens, store
   graphics — is derived here, so the logo only ever has to change in one place. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ASSETS = path.join(ROOT, 'assets');
const STORE = path.join(ROOT, '..', 'store-assets');

/* ── The mark ───────────────────────────────────────────────────────────────
   A car profile — rocker line, windscreen, roof, bonnet, front wing — drawn as
   one continuous white stroke on the orange disc. Authored in a 1024 grid. */
const CAR_PATH =
  'M 452 576 L 216 576 C 300 470 390 388 486 374 C 578 360 634 424 676 472 ' +
  'C 700 500 736 486 780 500 C 818 514 832 550 826 592';
const STROKE = 46;
const DISC = { cx: 512, cy: 506, r: 366 };

/* Brand orange: amber at the top-left, deepening to red-orange bottom-right. */
const ORANGE_LIGHT = '#FF8C12';
const ORANGE = '#FF5A0A';
const ORANGE_DEEP = '#FA3C00';
const INK = '#171717';

const gradient = (id = 'g') => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${ORANGE_LIGHT}"/>
    <stop offset="0.55" stop-color="${ORANGE}"/>
    <stop offset="1" stop-color="${ORANGE_DEEP}"/>
  </linearGradient>`;

const markBody = (id = 'g') => `<circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="url(#${id})"/>
  <path d="${CAR_PATH}" fill="none" stroke="#FFFFFF" stroke-width="${STROKE}"
        stroke-linecap="round" stroke-linejoin="round"/>`;

/* Standalone mark, transparent background. */
const markSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${gradient()}</defs>
  ${markBody()}
</svg>
`;

/* Mark + wordmark, on a light or dark plate. */
const fullSvg = (dark) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320">
  <defs>${gradient()}</defs>
  <rect width="1200" height="320" fill="${dark ? '#0B0B0C' : '#FFFFFF'}"/>
  <!-- disc scaled to r=94 and centred at (168,160), clearing the wordmark at x=330 -->
  <g transform="translate(36 30) scale(0.257)">
    ${markBody()}
  </g>
  <text x="330" y="205" font-family="Arial, Helvetica, sans-serif"
        font-size="142" font-weight="700" letter-spacing="-4">
    <tspan fill="${dark ? '#FFFFFF' : INK}">Dz</tspan><tspan fill="${ORANGE}">Kricar</tspan>
  </text>
</svg>
`;

/* The mark centred on a square canvas — used for the app icon and splashes.
   `pad` is the share of the canvas left as breathing room around the disc. */
const plate = (size, bg, pad = 0.12) => {
  const inner = Math.round(size * (1 - pad * 2));
  const off = Math.round((size - inner) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradient()}</defs>
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  <g transform="translate(${off} ${off}) scale(${inner / 1024})">
    ${markBody()}
  </g>
</svg>`;
};

const png = (svg, file, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(file).then(() => console.log('  ' + path.relative(ROOT, file)));

/* Modern .ico files may simply embed PNGs — build the container by hand
   (6-byte header, then one 16-byte directory entry per image). */
async function writeIco(file, sizes) {
  const images = [];
  for (const s of sizes) {
    images.push({ size: s, buf: await sharp(Buffer.from(plate(s, null, 0.02))).resize(s, s).png().toBuffer() });
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dir = [];
  for (const im of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(im.size >= 256 ? 0 : im.size, 0);
    e.writeUInt8(im.size >= 256 ? 0 : im.size, 1);
    e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(im.buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += im.buf.length;
    dir.push(e);
  }
  fs.writeFileSync(file, Buffer.concat([header, ...dir, ...images.map(i => i.buf)]));
  console.log('  ' + path.relative(ROOT, file));
}

(async () => {
  console.log('Vector marks:');
  fs.writeFileSync(path.join(PUBLIC, 'logo-icon.svg'), markSvg());
  fs.writeFileSync(path.join(PUBLIC, 'logo-full.svg'), fullSvg(false));
  fs.writeFileSync(path.join(PUBLIC, 'logo-full-dark.svg'), fullSvg(true));
  ['logo-icon.svg', 'logo-full.svg', 'logo-full-dark.svg'].forEach(f => console.log('  public/' + f));

  console.log('Favicon:');
  await writeIco(path.join(PUBLIC, 'favicon.ico'), [16, 32, 48]);

  console.log('App icon + splashes (sources for capacitor-assets):');
  fs.mkdirSync(ASSETS, { recursive: true });
  await png(plate(1024, '#FFFFFF', 0.08), path.join(ASSETS, 'icon.png'), 1024);
  await png(plate(2732, '#FFFFFF', 0.36), path.join(ASSETS, 'splash.png'), 2732);
  await png(plate(2732, '#0B0B0C', 0.36), path.join(ASSETS, 'splash-dark.png'), 2732);

  /* PWA / "add to home screen" icons. Generated here rather than by
     capacitor-assets, which writes them outside public/ where Vite can't see them. */
  console.log('PWA icons:');
  const icons = path.join(PUBLIC, 'icons');
  fs.mkdirSync(icons, { recursive: true });
  for (const s of [48, 72, 96, 128, 192, 256, 512]) {
    await png(plate(s, '#FFFFFF', 0.06), path.join(icons, `icon-${s}.png`), s);
  }
  /* iOS home-screen icon must be opaque and un-rounded — iOS masks it itself. */
  await png(plate(180, '#FFFFFF', 0.06), path.join(PUBLIC, 'apple-touch-icon.png'), 180);

  if (fs.existsSync(STORE)) {
    console.log('Store graphics:');
    await png(plate(512, '#FFFFFF', 0.08), path.join(STORE, 'icon-playstore-512.png'), 512);
    await png(plate(1024, '#FFFFFF', 0.08), path.join(STORE, 'icon-appstore-1024.png'), 1024);
  }

  console.log('\nDone. Run `npx capacitor-assets generate` to push the icon into Android/iOS.');
})();
