// Copied unchanged from ARK Studio ark_studio/web/js/arrows.js (commit f8df3be).
// ARK Studio, GNU AGPL-3.0, Copyright (c) 2026 Raymon Yip. See site/assets/js/ark/LICENSE.
// Re-copy instead of editing.
// Visio-style line ends for graph edges: the settings model and its
// resolution.  Pure data, shared by the renderer, Settings and the personal
// override layer; mirrors arkstudio/settings.py (normalize_arrows).
//
//   { style: { head, placement, size },          project-wide default
//     relations: { <relation>: partial style },  per-relation overrides
//     mind_tree: false }                         decorate Mind tree branches
//
// Resolution for one relation: built-in default < style < relations[rel].
// A head of "none" or a placement of "none" means no arrowhead.
//
// relations[rel].reverse (display only) draws and lays out that relation as
// if it pointed target -> source.  Without an explicit value the relations
// in REVERSED_BY_DEFAULT are reversed.  Stored links never change.

export const ARROW_HEADS = ["none", "triangle", "open", "stealth", "diamond", "diamond_filled", "circle", "bar"];
export const ARROW_PLACEMENTS = ["target", "source", "both", "none"];
export const ARROW_SIZE_RANGE = [0.5, 2.5];
export const ARROW_SIZE_PRESETS = { small: 0.75, medium: 1, large: 1.5 };
const STYLE_KEYS = ["head", "placement", "size"];

// The two relations whose reverse reads like the forward label
// (arkstudio/tags.py RELATIONS) carry no direction by default.
export const UNDIRECTED_RELATIONS = new Set(["relates_to", "unset"]);
export function relationIsDirected(relation) { return !UNDIRECTED_RELATIONS.has(relation || "unset"); }

// Relations whose stored direction reads against the flow of work:
// "A derived from B" and "A depends on B" both flow from B to A.
export const REVERSED_BY_DEFAULT = new Set(["derived_from", "depends_on"]);

export const ARROW_DEFAULT_STYLE = Object.freeze({ head: "triangle", placement: "target", size: 1 });

export function defaultArrowSettings() {
  return {
    style: { ...ARROW_DEFAULT_STYLE },
    relations: Object.fromEntries([...UNDIRECTED_RELATIONS].map((rel) => [rel, { placement: "none" }])),
    mind_tree: false,
  };
}

function cleanStyle(value, partial, relation = false) {
  const out = partial ? {} : { ...ARROW_DEFAULT_STYLE };
  if (!value || typeof value !== "object") return out;
  if (ARROW_HEADS.includes(value.head)) out.head = value.head;
  if (ARROW_PLACEMENTS.includes(value.placement)) out.placement = value.placement;
  const size = typeof value.size === "boolean" || value.size === null || value.size === "" ? NaN : Number(value.size);
  if (Number.isFinite(size) && size >= ARROW_SIZE_RANGE[0] && size <= ARROW_SIZE_RANGE[1]) out.size = size;
  if (relation && typeof value.reverse === "boolean") out.reverse = value.reverse;
  return out;
}

/** Lenient read: invalid parts fall back to the defaults. */
export function normalizeArrowSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const defaults = defaultArrowSettings();
  let relations = defaults.relations;
  if (source.relations && typeof source.relations === "object") {
    relations = {};
    for (const [rel, item] of Object.entries(source.relations)) {
      const style = cleanStyle(item, true, true);
      if (Object.keys(style).length) relations[rel] = style;
    }
  }
  return { style: cleanStyle(source.style, false), relations, mind_tree: source.mind_tree === true };
}

/** A personal override needs a complete default style, else it is ignored. */
export function normalizePersonalArrows(value) {
  if (!value || typeof value !== "object" || !value.style || typeof value.style !== "object") return null;
  const style = cleanStyle(value.style, true);
  if (STYLE_KEYS.some((key) => !(key in style))) return null;
  return normalizeArrowSettings({ ...value, style });
}

/** The effective style for one relation, or null when it has no arrowhead. */
export function resolveArrowStyle(settings, relation) {
  const normalized = settings?.style ? settings : normalizeArrowSettings(settings);
  const style = { ...ARROW_DEFAULT_STYLE, ...normalized.style, ...(normalized.relations?.[relation] || {}) };
  if (style.head === "none" || style.placement === "none") return null;
  return {
    head: style.head,
    start: style.placement === "source" || style.placement === "both",
    end: style.placement === "target" || style.placement === "both",
    size: style.size,
  };
}

/** Whether a relation is shown reversed (display only) by these settings. */
export function relationReversed(settings, relation) {
  const normalized = settings?.style ? settings : normalizeArrowSettings(settings);
  const value = normalized.relations?.[relation]?.reverse;
  return typeof value === "boolean" ? value : REVERSED_BY_DEFAULT.has(relation);
}

/**
 * Display direction for one relation: a per-graph quick toggle
 * (`overrides[relation]`, from the link filter) wins over the settings.
 */
export function displayReversed(settings, relation, overrides = null) {
  const quick = overrides?.[relation];
  return typeof quick === "boolean" ? quick : relationReversed(settings, relation);
}

const RESOLVERS = new WeakMap();
/** Memoized `relation -> style|null` for one settings object (per frame use). */
export function arrowResolver(settings) {
  const key = settings && typeof settings === "object" ? settings : defaultArrowSettings();
  let resolver = RESOLVERS.get(key);
  if (!resolver) {
    const normalized = normalizeArrowSettings(key);
    const cache = new Map();
    resolver = (relation) => {
      if (!cache.has(relation)) cache.set(relation, resolveArrowStyle(normalized, relation));
      return cache.get(relation);
    };
    resolver.mindTree = normalized.mind_tree;
    const reversed = new Map();
    resolver.reversed = (relation) => {
      if (!reversed.has(relation)) reversed.set(relation, relationReversed(normalized, relation));
      return reversed.get(relation);
    };
    RESOLVERS.set(key, resolver);
  }
  return resolver;
}
