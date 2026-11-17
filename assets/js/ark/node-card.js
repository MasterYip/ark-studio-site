// Copied unchanged from ARK Studio ark_studio/web/js/node-card.js (commit f8df3be).
// ARK Studio, GNU AGPL-3.0, Copyright (c) 2026 Raymon Yip. See site/assets/js/ark/LICENSE.
// Re-copy instead of editing.
// Card sizing shared by the Mind map and the node graph ("node" layout).
//
// Both layouts draw the same card: a coloured bar, a wrapped title, a footer
// with the status dot, markers and "UID · type", and either an image strip
// (up to four thumbnails) or one pinned "main" image on a chosen side.  Only
// the base size differs: node cards are a little taller so the footer never
// crowds a one-line title, and have a wider minimum so ports stay apart.
//
// Pure (no DOM): the width estimate uses character units instead of canvas
// measurement so layout, tests and workers agree.

export const CARD_KINDS = {
  mind: { baseH: 38, minW: 126, autoMaxW: 270, maxW: 620, maxLines: 6 },
  node: { baseH: 48, minW: 150, autoMaxW: 280, maxW: 620, maxLines: 6 },
};
// Stored width limits (node layout store, topic members).  Mirrors
// arkstudio/store.py MIN_CARD_W / MAX_CARD_W.
export const CARD_WIDTH_RANGE = [140, 640];
export const CARD_LINE_H = 15;
export const THUMB = 44;
const MAX_IMAGES = 4;
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|avif)(?:[?#]|$)/i;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function isCardImage(item) {
  return Boolean(item && (item.is_image || IMAGE_RE.test(item.url || "") || /^data:image\//i.test(item.url || "")));
}

/** Width units of a string: CJK ~12.5, everything else ~7 (12 px font). */
export function textUnits(text) {
  let units = 0;
  for (const ch of String(text || "")) units += /[⺀-￿]/.test(ch) ? 12.5 : 7;
  return units;
}

/** Lines a title wraps to inside `usable` px (explicit newlines kept). */
export function titleLines(title, usable, maxLines) {
  const lines = String(title || "").split("\n").reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(textUnits(line) / Math.max(24, usable))), 0);
  return clamp(lines || 1, 1, maxLines);
}

/** A stored width, clamped to the shared range; null when unset/invalid. */
export function cleanCardWidth(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(clamp(number, ...CARD_WIDTH_RANGE) * 10) / 10;
}

/**
 * Size one card.
 * @param {object} n  node ({ title, media, pinnedImage })
 * @param {{ kind?: "mind"|"node", showImages?: boolean, customW?: number|null }} options
 *   customW: the user's card width (resize handle), images included.
 * @returns {{ w, h, titleW, imageW, contentH, lines, image, images, pinned }}
 */
export function cardMetrics(n, { kind = "mind", showImages = true, customW = null } = {}) {
  const spec = CARD_KINDS[kind] || CARD_KINDS.mind;
  const autoW = clamp(34 + textUnits(n.title), spec.minW, spec.autoMaxW);
  const allImages = (n.media || []).filter(isCardImage).slice(0, MAX_IMAGES);
  const pinnedState = n.pinnedImage || null;
  const pinnedItem = pinnedState ? allImages.find((item) => String(item.id) === String(pinnedState.mediaId)) : null;
  if (pinnedItem) {
    const side = ["left", "right", "top", "bottom"].includes(pinnedState.side) ? pinnedState.side : "right";
    const w = clamp(Number(pinnedState.w) || 240, 80, 620);
    const aspect = clamp(Number(pinnedState.aspect) || 1, 0.2, 5);
    const h = clamp(Number(pinnedState.h) || w / aspect, 60, 620);
    const horizontal = side === "left" || side === "right";
    const titleW = autoW;
    const lines = titleLines(n.title, (horizontal ? titleW : Math.max(titleW, w)) - 18, 8);
    const contentH = spec.baseH + (lines - 1) * CARD_LINE_H;
    const totalW = horizontal ? titleW + w + 8 : Math.max(titleW, w);
    return {
      titleW: horizontal ? titleW : totalW, imageW: horizontal ? w : 0,
      contentH, h: horizontal ? Math.max(contentH, h) : contentH + h + 8, w: totalW, lines,
      image: pinnedItem, images: [pinnedItem], pinned: { item: pinnedItem, side, w, h, aspect },
    };
  }
  const images = showImages ? allImages : [];
  const imageW = images.length ? images.length * (THUMB + 4) + 8 : 0;
  const titleW = customW ? clamp(customW - imageW, spec.minW, spec.maxW) : autoW;
  const lines = titleLines(n.title, titleW - 18, spec.maxLines);
  const contentH = Math.max(spec.baseH + (lines - 1) * CARD_LINE_H, images.length ? THUMB + 12 : 0);
  return {
    titleW, imageW, contentH, h: contentH, w: titleW + imageW, lines,
    image: images[0] || null, images, pinned: null,
  };
}

/** Copy card metrics onto a node (the fields the renderers read). */
export function applyCardMetrics(n, metrics) {
  n.titleW = metrics.titleW;
  n.imageW = metrics.imageW;
  n.w = metrics.w;
  n.contentH = metrics.contentH;
  n.h = metrics.h;
  n.mediaH = 0;
  n.imageMedia = metrics.image;
  n.imageMediaList = metrics.images;
  n.pinnedMeta = metrics.pinned;
  return n;
}
