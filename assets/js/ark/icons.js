// Copied unchanged from ARK Studio ark_studio/web/js/icons.js (commit f8df3be).
// ARK Studio, GNU AGPL-3.0, Copyright (c) 2026 Raymon Yip. See site/assets/js/ark/LICENSE.
// Re-copy instead of editing.
const NS = "http://www.w3.org/2000/svg";

// A small, consistent stroke set (Lucide-compatible geometry).
const PATHS = {
  overview: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  bulb: ["M9 18h6", "M10 22h4", "M8.5 14.5a6 6 0 1 1 7 0c-.8.6-1.5 1.6-1.5 2.5h-4c0-.9-.7-1.9-1.5-2.5Z"],
  route: ["M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M15 8H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"],
  map: ["M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z", "M9 3v15", "M15 6v15"],
  tasks: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  palette: ["M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1 3.7c.4.7 0 2.3-3 2.3Z", "M7.5 10.5h.01", "M12 7.5h.01", "M16.5 10.5h.01"],
  send: ["m22 2-7 20-4-9-9-4 20-7Z", "M22 2 11 13"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
  command: ["M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 0 0 0-6Z"],
  sun: ["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", "M12 1v2", "M12 21v2", "M4.2 4.2l1.4 1.4", "M18.4 18.4l1.4 1.4", "M1 12h2", "M21 12h2", "M4.2 19.8l1.4-1.4", "M18.4 5.6l1.4-1.4"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  chevron: ["m6 9 6 6 6-6"],
  chevronRight: ["m9 18 6-6-6-6"],
  chevronLeft: ["m15 18-6-6 6-6"],
  chevronsLeft: ["m11 17-5-5 5-5", "m18 17-5-5 5-5"],
  chevronsRight: ["m6 17 5-5-5-5", "m13 17 5-5-5-5"],
  filter: ["M22 3H2l8 9.5V19l4 2v-8.5L22 3Z"],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  graph: ["M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M9 6.5h6a4 4 0 0 1 4 4V15", "M6 9v3a4 4 0 0 0 4 4h5"],
  gantt: ["M4 4v16", "M4 8h9", "M4 13h13", "M4 18h6", "M13 5v6", "M17 10v6", "M10 16v4"],
  arrowRight: ["M5 12h14", "m12 5 7 7-7 7"],
  arrowDown: ["M12 5v14", "m19 12-7 7-7-7"],
  arrowUp: ["M12 19V5", "m5 12 7-7 7 7"],
  terminal: ["m4 17 6-6-6-6", "M12 19h8"],
  stop: ["M7 7h10v10H7z"],
  arrowLeft: ["M19 12H5", "m12 19-7-7 7-7"],
  link: ["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"],
  external: ["M15 3h6v6", "M10 14 21 3", "M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"],
  sparkles: ["m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z", "M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z", "M5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6L5 3Z"],
  copy: ["M8 8h12v12H8z", "M16 8V4H4v12h4"],
  check: ["m5 12 5 5L20 7"],
  circle: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  inbox: ["m4 4-2 8v8h20v-8l-2-8Z", "M2 12h6l2 3h4l2-3h6"],
  // View plugins (Settings > Plugins, plugin views without their own icon).
  puzzle: ["M9 4h4a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0 3 0V5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4h-1.5a1.5 1.5 0 0 0 0 3H20v7a1 1 0 0 1-1 1h-4v-1.5a1.5 1.5 0 0 0-3 0V20H5a1 1 0 0 1-1-1v-6h1.5a1.5 1.5 0 0 0 0-3H4V5a1 1 0 0 1 1-1h4Z"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  eyeOff: ["M3 3l18 18", "M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2", "M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  ban: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "m6 6 12 12"],
  archive: ["M3 3h18v4H3Z", "M5 7v14h14V7", "M10 11h4"],
  monitor: ["M3 4h18v12H3Z", "M8 20h8", "M12 16v4"],
  key: ["M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "m11 11 9 9", "m16 16 2-2", "m18 18 2-2"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"],
  alert: ["M12 3 2 21h20L12 3Z", "M12 9v5", "M12 18h.01"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v6l4 2"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  cpu: ["M6 6h12v12H6z", "M9 1v3", "M15 1v3", "M9 20v3", "M15 20v3", "M1 9h3", "M1 15h3", "M20 9h3", "M20 15h3", "M9 9h6v6H9z"],
  database: ["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Z", "M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
  image: ["M3 3h18v18H3z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", "m21 15-5-5L5 21"],
  upload: ["M12 16V3", "m7 8 5-5 5 5", "M5 21h14"],
  download: ["M12 3v13", "m7 11 5 5 5-5", "M5 21h14"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6Z", "M14 2v6h6", "M8 13h8", "M8 17h5"],
  play: ["m6 3 14 9-14 9V3Z"],
  layers: ["m12 2 10 5-10 5L2 7l10-5Z", "m2 12 10 5 10-5", "m2 17 10 5 10-5"],
  target: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"],
  more: ["M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  maximize: ["M8 3H3v5", "M16 3h5v5", "M21 16v5h-5", "M3 16v5h5"],
  minimize: ["M8 8H3V3", "M16 8h5V3", "M21 16h-5v5", "M3 16h5v5"],
  zoomIn: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3", "M11 8v6", "M8 11h6"],
  zoomOut: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3", "M8 11h6"],
  fit: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
  // Full screen enter / exit (Lucide "expand" / "shrink": diagonal arrows,
  // so they never look like Fit's corner brackets).
  expand: ["m21 21-6-6m6 6v-4.8m0 4.8h-4.8", "M3 16.2V21m0 0h4.8M3 21l6-6", "M21 7.8V3m0 0h-4.8M21 3l-6 6", "M3 7.8V3m0 0h4.8M3 3l6 6"],
  shrink: ["m15 15 6 6m-6-6v4.8m0-4.8h4.8", "M9 19.8V15m0 0H4.2M9 15l-6 6", "M15 4.2V9m0 0h4.8M15 9l6-6", "M9 4.2V9m0 0H4.2M9 9 3 3"],
  refresh: ["M21 12a9 9 0 1 1-2.6-6.4", "M21 3v6h-6"],
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z", "M17 21v-8H7v8", "M7 3v5h8"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"],
  flask: ["M9 3h6", "M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3", "M7 15h10"],
  pen: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
  panelLeft: ["M3 3h18v18H3z", "M9 3v18"],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  pin: ["M12 17v5", "M5 3h14l-2 7 3 3v2H4v-2l3-3-2-7Z"],
  "panel-left": ["M3 4h18v16H3z", "M9 4v16"],
  "panel-right": ["M3 4h18v16H3z", "M15 4v16"],
  "panel-bottom": ["M3 4h18v16H3z", "M3 15h18"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.05A1.7 1.7 0 0 0 10.1 3.05V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.05a1.7 1.7 0 0 0 1.55 1.05H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"],
  home: ["m3 10 9-7 9 7", "M5 9v11h14V9", "M10 20v-6h4v6"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 16v-4", "M12 8h.01"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"],
  git: ["M6 3v12", "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 9a9 9 0 0 1-9 9"],
  circleDot: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  // A graph node with its selection ring: the ring is stroked (currentColor),
  // the core filled with --icon-fill (default currentColor, e.g. a type colour).
  node: ["M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z", { d: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", fill: true }],
  qr: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h2v2h-2z", "M18 18h2v2h-2z", "M14 18h2v2h-2z", "M18 14h2v2h-2z"],
  smartphone: ["M7 3h10v18H7z", "M11 18h2"],
  arrowUpRight: ["M7 17 17 7", "M7 7h10v10"],
};

export function icon(name, cls = "") {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `icon ${cls}`.trim());
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const paths = PATHS[name] || PATHS.info;
  for (const item of paths) {
    const p = document.createElementNS(NS, "path");
    // A path may be { d, fill: true }: filled instead of stroked.
    p.setAttribute("d", typeof item === "string" ? item : item.d);
    if (typeof item === "object" && item.fill) p.setAttribute("class", "icon-fill");
    svg.appendChild(p);
  }
  return svg;
}

export function hasIcon(name) { return Boolean(PATHS[name]); }

const STATUS_ICONS = Object.freeze({
  inbox: "inbox", open: "circle", active: "play", review: "eye",
  blocked: "ban", done: "check", abandoned: "x", archived: "archive",
});
const CANVAS_PATHS = new Map();

export function statusIconName(status) {
  return Object.hasOwn(STATUS_ICONS, status) ? STATUS_ICONS[status] : "info";
}

export function statusIconInk(background) {
  const hex = String(background).replace(/^#/, "");
  const full = /^[\da-f]{3}$/i.test(hex) ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(full)) return "#111827";
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return luminance > 0.179 ? "#111827" : "#ffffff";
}

export function drawStatusIcon(ctx, status, x, y, radius, background) {
  const name = statusIconName(status);
  // Reuse the SVG icon geometry; cache paths across force-layout animation frames.
  if (!CANVAS_PATHS.has(name)) CANVAS_PATHS.set(name, PATHS[name].map((d) => new Path2D(d)));
  const size = radius * 1.32;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = statusIconInk(background);
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of CANVAS_PATHS.get(name)) ctx.stroke(path);
  ctx.restore();
}
