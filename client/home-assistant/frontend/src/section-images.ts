import type { SectionName } from "./sections";

const rect = (x: number, y: number, w: number, h: number, op: number, rx = 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="currentColor" fill-opacity="${op}"/>`;

const outline = (x: number, y: number, w: number, h: number, rx = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" stroke="currentColor" stroke-opacity="0.48" stroke-width="2"/>`;

const dot = (x: number, y: number, r: number, op: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" fill-opacity="${op}"/>`;

const line = (d: string, op: number) =>
  `<path d="${d}" stroke="currentColor" stroke-opacity="${op}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

const area = (d: string, op: number) =>
  `<path d="${d}" fill="currentColor" fill-opacity="${op}"/>`;

const columns = (count: number, draw: (index: number) => string) =>
  Array.from({ length: count }, (_, index) => draw(index)).join("");

const GRAPH = "M8 28 L22 24 L36 30 L50 14 L64 20 L78 10 L86 12";

/** A small picture of what each section shows, in the style of HA's select box images. */
const DRAWINGS: Record<SectionName, string> = {
  storage:
    rect(8, 10, 78, 6, 0.12, 3) +
    rect(8, 10, 52, 6, 0.4, 3) +
    rect(8, 19, 78, 6, 0.12, 3) +
    rect(8, 19, 30, 6, 0.4, 3) +
    rect(8, 28, 78, 6, 0.12, 3) +
    rect(8, 28, 64, 6, 0.4, 3),
  audio:
    area("M14 17 L20 17 L28 10 L28 34 L20 27 L14 27 Z", 0.48) +
    rect(36, 17, 50, 4, 0.12, 2) +
    rect(36, 17, 34, 4, 0.4, 2) +
    rect(36, 25, 30, 3, 0.24, 1.5),
  "now-playing":
    area("M12 12 L12 32 L28 22 Z", 0.48) +
    rect(36, 17, 50, 3, 0.12, 1.5) +
    rect(36, 17, 28, 3, 0.4, 1.5) +
    rect(36, 25, 30, 3, 0.24, 1.5),
  "audio-outputs":
    area("M14 17 L20 17 L28 10 L28 34 L20 27 L14 27 Z", 0.48) +
    rect(36, 15, 50, 4, 0.12, 2) +
    rect(36, 15, 34, 4, 0.4, 2) +
    rect(36, 25, 50, 4, 0.12, 2) +
    rect(36, 25, 20, 4, 0.4, 2),
  "audio-inputs":
    rect(17, 9, 10, 17, 0.48, 5) +
    line("M13 22 Q22 34 31 22 M22 30 L22 35", 0.48) +
    rect(36, 15, 50, 4, 0.12, 2) +
    rect(36, 15, 26, 4, 0.4, 2) +
    rect(36, 25, 50, 4, 0.12, 2) +
    rect(36, 25, 40, 4, 0.4, 2),
  "overview-load":
    line("M8 30 L22 24 L36 28 L50 16 L64 22 L78 12 L86 14", 0.72) +
    line("M8 34 L22 32 L36 33 L50 28 L64 30 L78 26 L86 27", 0.32),
  "overview-power": area("M46 6 L34 24 L43 24 L40 38 L56 18 L46 18 Z", 0.48),
  "overview-temperatures":
    rect(24, 8, 8, 22, 0.24, 4) +
    dot(28, 32, 6, 0.48) +
    rect(26, 14, 4, 18, 0.48, 2) +
    line("M46 32 L56 24 L66 28 L78 12", 0.72),
  battery:
    outline(24, 11, 44, 22, 4) +
    rect(70, 18, 4, 8, 0.48, 1) +
    rect(28, 15, 26, 14, 0.48),
  "device-batteries": columns(
    3,
    (i) =>
      outline(10 + i * 26, 14, 18, 12, 3) +
      rect(29 + i * 26, 18, 2, 4, 0.48, 1) +
      rect(13 + i * 26, 17, [12, 6, 9][i] ?? 8, 6, 0.48, 1),
  ),
  cpu:
    outline(34, 10, 26, 24, 4) +
    rect(41, 17, 12, 10, 0.48) +
    columns(3, (i) => rect(39 + i * 8, 5, 2, 5, 0.32, 1)) +
    columns(3, (i) => rect(39 + i * 8, 34, 2, 5, 0.32, 1)),
  "cpu-history": area(`${GRAPH} L86 34 L8 34 Z`, 0.12) + line(GRAPH, 0.72),
  "cpu-cores": columns(8, (i) =>
    rect(
      8 + (i % 4) * 20,
      10 + Math.floor(i / 4) * 14,
      18,
      10,
      [0.48, 0.24, 0.4, 0.12, 0.32, 0.48, 0.12, 0.24][i] ?? 0.24,
    ),
  ),
  memory:
    outline(8, 12, 78, 20, 3) +
    columns(6, (i) => rect(14 + i * 12, 18, 8, 8, i < 4 ? 0.48 : 0.12, 1)),
  "memory-history": line(
    "M8 32 L24 32 L24 24 L40 24 L40 28 L58 28 L58 14 L72 14 L72 18 L86 18",
    0.72,
  ),
  mount:
    rect(8, 12, 78, 20, 0.12, 4) +
    rect(14, 20, 40, 4, 0.32, 2) +
    dot(76, 22, 3, 0.48),
  "disk-activity": columns(11, (i) => {
    const height = [8, 16, 12, 22, 10, 18, 26, 14, 20, 9, 15][i] ?? 10;

    return rect(
      10 + i * 7,
      36 - height,
      5,
      height,
      i % 2 === 0 ? 0.48 : 0.24,
      1,
    );
  }),
  display:
    outline(24, 8, 46, 24, 3) +
    rect(42, 32, 10, 3, 0.4) +
    rect(36, 35, 22, 2, 0.4),
  gpu:
    outline(12, 10, 70, 22, 3) +
    dot(34, 21, 7, 0.32) +
    dot(34, 21, 2.5, 0.48) +
    rect(50, 16, 24, 3, 0.24, 1.5) +
    rect(50, 23, 14, 3, 0.24, 1.5) +
    rect(18, 32, 14, 3, 0.32),
  network:
    area("M30 8 L40 20 L34 20 L34 34 L26 34 L26 20 L20 20 Z", 0.48) +
    area("M64 36 L74 24 L68 24 L68 10 L60 10 L60 24 L54 24 Z", 0.32),
  interface:
    dot(20, 22, 6, 0.48) +
    dot(74, 22, 6, 0.48) +
    rect(26, 21, 42, 2, 0.32, 1) +
    rect(43, 14, 8, 16, 0.24, 2),
  desktop:
    rect(36, 20, 22, 16, 0.48, 3) +
    `<path d="M41 20 V15 A6 6 0 0 1 53 15 V20" stroke="currentColor" stroke-opacity="0.48" stroke-width="2"/>`,
  processes: columns(
    4,
    (i) =>
      rect(8, 9 + i * 8, 6, 5, 0.4, 1) +
      rect(18, 9 + i * 8, [60, 44, 52, 30][i] ?? 40, 5, 0.24),
  ),
  commands: columns(3, (i) =>
    rect(10 + i * 26, 12, 22, 20, i === 0 ? 0.48 : 0.24, 4),
  ),
  system:
    `<circle cx="47" cy="22" r="13" stroke="currentColor" stroke-opacity="0.48" stroke-width="2"/>` +
    dot(47, 15.5, 2, 0.48) +
    rect(45, 20, 4, 11, 0.48, 1),
};

export const sectionImage = (name: SectionName, dark: boolean) => {
  const ink = dark ? "white" : "black";
  const edge = dark ? 0.24 : 0.12;

  const svg =
    `<svg width="94" height="44" viewBox="0 0 94 44" fill="none" color="${ink}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="94" height="44" rx="8" fill="${dark ? "#1C1C1C" : "white"}"/>` +
    `<rect x="0.5" y="0.5" width="93" height="43" rx="7.5" stroke="${ink}" stroke-opacity="${edge}"/>` +
    `${DRAWINGS[name]}</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
