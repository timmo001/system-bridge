// Writes every icon from the logo in .resources/system-bridge-logo.svg.
// Run with: mise run generate:icons
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const logoPath = ".resources/system-bridge-logo.svg";

/** The dark background behind the logo where it needs one. */
const background = "#18181b";

const logo = (await readFile(logoPath, "utf8")).trim();

const viewBox = /\bviewBox="([^"]+)"/.exec(logo)?.[1];

if (viewBox === undefined) {
  throw new Error(`${logoPath} must have a viewBox`);
}

/** The logo's drawing, without its own <svg> wrapper. */
const drawing = logo.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>$/, "");

/** The logo placed in a square of `size`, inset by `inset` on each side. */
const placed = (size: number, inset: number) =>
  `<svg x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" viewBox="${viewBox}">${drawing}</svg>`;

const circle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <title>System Bridge</title>
  <circle cx="64" cy="64" r="64" fill="${background}"/>
  ${placed(128, 12)}
</svg>
`;

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <title>System Bridge</title>
  <rect width="128" height="128" rx="24" fill="${background}"/>
  ${placed(128, 10)}
</svg>
`;

/** A full-bleed background with the logo in the middle 80%, safe to mask. */
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="${background}"/>
  ${placed(128, 16)}
</svg>
`;

const rect = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 372">
  <title>System Bridge</title>
  <rect width="512" height="372" rx="40" fill="${background}"/>
  <svg x="56" y="-14" width="400" height="400" viewBox="${viewBox}">${drawing}</svg>
</svg>
`;

/** The README's banner, laid out like the other sites' */
const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="400" viewBox="0 0 960 400">
  <rect width="960" height="400" fill="${background}"/>
  <svg x="320" y="-62" width="320" height="320" viewBox="${viewBox}">${drawing}</svg>
  <g text-anchor="middle" font-family="Inter, 'Noto Sans', 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="480" y="262" font-size="64" font-weight="600" letter-spacing="-1.5" fill="#ffffff">System Bridge</text>
    <g font-size="26" fill="#d4d4d8">
      <text x="480" y="314">Monitor and control your system from the web client,</text>
      <text x="480" y="350">Home Assistant, the terminal or your own code.</text>
    </g>
  </g>
</svg>
`;

const png = (svg: string, width: number, height = width) =>
  sharp(Buffer.from(svg), { density: 600 })
    .resize(width, height)
    .png()
    .toBuffer();

/** An .ico holding a PNG at each size. */
const ico = async (svg: string, sizes: readonly number[]) => {
  const images = await Promise.all(sizes.map((size) => png(svg, size)));
  const header = Buffer.alloc(6 + images.length * 16);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;

  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    const size = sizes[index] ?? 0;

    // 0 means 256 in an icon directory entry
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  }

  return Buffer.concat([header, ...images]);
};

/** An .icns holding a PNG for each type macOS reads. */
const icns = async (svg: string) => {
  const types = [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
  ] as const;

  const entries = await Promise.all(
    types.map(async ([type, size]) => {
      const image = await png(svg, size);
      const header = Buffer.alloc(8);

      header.write(type, 0, "ascii");
      header.writeUInt32BE(image.length + 8, 4);

      return Buffer.concat([header, image]);
    }),
  );

  const body = Buffer.concat(entries);
  const header = Buffer.alloc(8);

  header.write("icns", 0, "ascii");
  header.writeUInt32BE(body.length + 8, 4);

  return Buffer.concat([header, body]);
};

const sizes = [16, 32, 48, 64, 128, 256, 512] as const;
const icoSizes = [16, 24, 32, 48, 64, 128, 256] as const;

const written: string[] = [];

const write = async (file: string, data: Buffer | string) => {
  await writeFile(file, data);
  written.push(file);
};

// The app icon, for the desktop entries, the Windows executable and installer.
// It's called "dimmed" for historical reasons; the scripts use that name.
await write(".resources/system-bridge-dimmed.svg", `${logo}\n`);

for (const size of sizes) {
  await write(`.resources/system-bridge-dimmed-${size}.png`, await png(logo, size));
}

await write(".resources/system-bridge-dimmed.ico", await ico(logo, icoSizes));
await write(".resources/system-bridge-dimmed.icns", await icns(logo));

// The logo on a dark circle
await write(".resources/system-bridge-circle.svg", circle);

for (const size of sizes) {
  await write(`.resources/system-bridge-circle-${size}.png`, await png(circle, size));
}

await write(".resources/system-bridge-circle.ico", await ico(circle, icoSizes));
await write(".resources/system-bridge-circle.icns", await icns(circle));

// The logo on a dark rectangle
await write(".resources/system-bridge-rect.svg", rect);
await write(".resources/system-bridge-rect.png", await png(rect, 512, 372));

// The README's banner
await mkdir(".github/assets", { recursive: true });
await write(".github/assets/banner.svg", banner);
await write(".github/assets/banner.png", await png(banner, 960, 400));

// The tray icon
await write("tray/icon.png", await png(logo, 512));
await write("tray/icon.ico", await ico(logo, icoSizes));

// The web client's favicon, header logo and installable app icons
await write("client/web/public/icon.svg", `${logo}\n`);
await write("client/web/public/icon-192.png", await png(maskable, 192));
await write("client/web/public/icon-512.png", await png(maskable, 512));

// The docs' header, banner and favicons. Their share cards and other brand
// images come from `bun run brand` in docs/, which reads the same logo
for (const file of [
  "docs/src/assets/logo.svg",
  "docs/public/logo-light.svg",
  "docs/public/logo-dark.svg",
  "docs/public/favicon.svg",
]) {
  await copyFile(logoPath, file);
  written.push(file);
}

await write("docs/public/favicon.ico", await ico(square, [16, 32, 48]));

for (const file of written) console.log(`Wrote ${file}`);
