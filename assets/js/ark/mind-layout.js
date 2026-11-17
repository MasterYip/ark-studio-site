// Copied unchanged from ARK Studio ark_studio/web/js/mind-layout.js (commit f8df3be).
// ARK Studio, MIT License, Copyright (c) 2026 Raymon Yip. See site/assets/js/ark/LICENSE.
// Re-copy instead of editing.
// Mind map layout: hierarchy, tidy left-to-right trees and the orphan area.
//
// Pure (no DOM): card sizes come from node-card.js, so layout, drawing and
// tests agree on every card's real width and height (wrapped title, media,
// width overrides).
//
// Folding (XMind-like): a folded branch takes only its own card's space, so
// the layout is compact for what is visible.  The orphan area starts right
// of the fully expanded forest, so unfolding never runs into it.  Keeping
// other trees and orphans in place while one tree reflows, and anchoring the
// folded card, is the view's job (GraphView._reflowMindTrees).
import { cardMetrics, applyCardMetrics, CARD_KINDS } from "./node-card.js";

export const SIBLING_GAP = 10;
export const LEVEL_GAP = 46;
export const TREE_GAP = 28;
export const ORPHAN_GAP_X = 24;
export const ORPHAN_GAP_Y = 12;
export const ORPHAN_OFFSET = 140;

export function mindHierarchy(nodes, edges, primaryRelation = "part_of", parents = null) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map();
  const children = new Map(nodes.map((n) => [n.id, []]));
  const cycleEdges = [];
  const extraParentEdges = [];
  if (parents) {
    for (const node of nodes) {
      const parent = parents.get(node.id);
      if (parent === undefined || parent === null || !byId.has(parent) || parent === node.id) continue;
      parentOf.set(node.id, parent);
      children.get(parent).push(node.id);
    }
    return { byId, parentOf, children, cycleEdges, extraParentEdges,
      roots: nodes.filter((node) => !parentOf.has(node.id)).map((node) => node.id) };
  }
  const primary = edges
    .filter((edge) => edge.relation === primaryRelation)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const edge of primary) {
    const child = byId.get(edge.source), parent = byId.get(edge.target);
    if (!child || !parent || child.id === parent.id) continue;
    if (parentOf.has(child.id)) { extraParentEdges.push(edge); continue; }
    // Reject an edge that would close a directed cycle.  It remains a normal
    // cross-link, but it cannot become a parent edge in the mind tree.
    let cursor = parent.id;
    const seen = new Set([child.id]);
    let cyclic = false;
    while (cursor) {
      if (seen.has(cursor)) { cyclic = true; break; }
      seen.add(cursor);
      cursor = parentOf.get(cursor);
    }
    if (cyclic) { cycleEdges.push(edge); continue; }
    parentOf.set(child.id, parent.id);
    children.get(parent.id).push(child.id);
  }
  return { byId, parentOf, children, cycleEdges, extraParentEdges,
    roots: nodes.filter((node) => !parentOf.has(node.id)).map((node) => node.id) };
}

const seqOf = (n) => {
  const tag = (n.tags || []).find((x) => x.startsWith("seq:"));
  const value = tag ? parseFloat(tag.split(":").slice(1).join(":")) : NaN;
  return Number.isFinite(value) ? value : 9999;
};
const byOrder = (a, b) => seqOf(a) - seqOf(b) || String(a.title).localeCompare(String(b.title));
// Orphans: grouped by type, then status, then title.
const byOrphan = (a, b) => String(a.type || "").localeCompare(String(b.type || ""))
  || String(a.status || "").localeCompare(String(b.status || ""))
  || String(a.title || "").localeCompare(String(b.title || ""));

/**
 * Lay out every node (collapsed descendants too, under their folded card)
 * and return `{ roots, orphan, hidden, treeOf }`.
 * @param {object} options { align, primaryRelation, parents, collapsed: Set, showImages }
 */
export function mindLayout(nodes, edges, options = {}) {
  const { align = "left", primaryRelation = "part_of", parents = null, collapsed = new Set(), showImages = true } = options;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const { parentOf, children: childIds } = mindHierarchy(nodes, edges, primaryRelation, parents);
  const children = new Map([...childIds].map(([id, ids]) =>
    [id, ids.map((childId) => byId.get(childId)).filter(Boolean)]));
  for (const group of children.values()) group.sort(byOrder);
  const baseH = CARD_KINDS.mind.baseH;
  for (const n of nodes) {
    applyCardMetrics(n, cardMetrics(n, { kind: "mind", showImages, customW: n.customW }));
    n.mindOrphan = false;
  }
  const w = (n) => n.w || 160;
  const h = (n) => n.h || baseH;

  // Subtree heights; `folded` cards count as leaves.
  const heightFn = (folded) => {
    const heights = new Map();
    const fn = (node, seen = new Set()) => {
      if (heights.has(node.id)) return heights.get(node.id);
      if (seen.has(node.id)) return h(node);
      seen.add(node.id);
      let total = 0;
      if (!folded.has(node.id)) for (const child of children.get(node.id) || []) total += fn(child, seen) + SIBLING_GAP;
      const value = Math.max(h(node), total ? total - SIBLING_GAP : h(node));
      heights.set(node.id, value);
      return value;
    };
    return fn;
  };
  const subtreeHeight = heightFn(new Set([...collapsed].filter((id) => byId.has(id))));
  const placed = new Set();
  const treeOf = new Map();
  const place = (node, depth, y, parent, root) => {
    if (placed.has(node.id)) return;
    placed.add(node.id);
    treeOf.set(node.id, root.id);
    if (!parent) {
      node.x = align === "left" ? w(node) / 2 : 0;
    } else {
      const siblings = children.get(parent.id) || [];
      const widest = Math.max(...siblings.map(w));
      const parentRight = parent.x + w(parent) / 2;
      node.x = parentRight + LEVEL_GAP + (align === "left" ? w(node) : widest) / 2;
    }
    node.y = y;
    node.depth = depth;
    let childTop = y - subtreeHeight(node) / 2;
    for (const child of children.get(node.id) || []) {
      const ch = subtreeHeight(child);
      place(child, depth + 1, childTop + ch / 2, node, root);
      childTop += ch + SIBLING_GAP;
    }
  };

  let roots = nodes.filter((n) => !parentOf.has(n.id)).sort(byOrder);
  if (!roots.length) roots = nodes.slice().sort(byOrder);
  // Trees with children form the main left-to-right forest; leaf roots are
  // packed into the orphan area.
  let mainRoots = roots.filter((root) => (children.get(root.id) || []).length > 0);
  let orphanRoots = roots.filter((root) => !(children.get(root.id) || []).length);
  if (!mainRoots.length) { mainRoots = roots; orphanRoots = []; }
  let top = 0;
  for (const root of mainRoots) {
    if (placed.has(root.id)) continue;
    const height = subtreeHeight(root);
    place(root, 0, top + height / 2, null, root);
    top += height + TREE_GAP;
  }
  // Cycles or malformed hierarchies still get an editable root.
  const orphanSet = new Set(orphanRoots);
  for (const node of nodes) {
    if (placed.has(node.id) || orphanSet.has(node)) continue;
    const height = subtreeHeight(node);
    place(node, 0, top + height / 2, null, node);
    top += height + TREE_GAP;
  }
  const forestHeight = Math.max(0, top - TREE_GAP);
  // The orphan area starts right of the fully expanded forest (cards inside
  // folded branches included), so unfolding a branch never runs into it.
  let maxRight = 0;
  for (const node of nodes) if (placed.has(node.id)) maxRight = Math.max(maxRight, node.x + w(node) / 2);

  // Orphan area: columns sized to their widest card, cards stacked with a
  // fixed gap, columns filled to about the forest's height (or a square-ish
  // block when there is no forest).
  if (orphanRoots.length) {
    const sorted = orphanRoots.slice().sort(byOrphan);
    const area = sorted.reduce((sum, n) => sum + (w(n) + ORPHAN_GAP_X) * (h(n) + ORPHAN_GAP_Y), 0);
    const columnHeight = Math.max(forestHeight, Math.sqrt(area) * 0.8, ...sorted.map(h));
    const columns = [];
    let column = null;
    for (const node of sorted) {
      if (!column || (column.height + h(node) > columnHeight && column.nodes.length)) {
        column = { nodes: [], height: 0, width: 0 };
        columns.push(column);
      }
      column.nodes.push(node);
      column.height += h(node) + ORPHAN_GAP_Y;
      column.width = Math.max(column.width, w(node));
    }
    let left = (placed.size ? maxRight : 0) + (placed.size ? ORPHAN_OFFSET : 0);
    for (const col of columns) {
      let y = 0;
      for (const node of col.nodes) {
        node.x = left + (align === "left" ? w(node) / 2 : col.width / 2);
        node.y = y + h(node) / 2;
        node.depth = 0;
        node.mindOrphan = true;
        placed.add(node.id);
        y += h(node) + ORPHAN_GAP_Y;
      }
      left += col.width + ORPHAN_GAP_X;
    }
  }

  // Hide the descendants of folded branches.
  const hidden = new Set();
  const visit = (node, under) => {
    const hide = under || collapsed.has(node.id);
    for (const child of children.get(node.id) || []) {
      if (hide) hidden.add(child.id);
      visit(child, hide);
    }
  };
  for (const root of roots) visit(root, false);
  return { roots: roots.length, orphan: orphanRoots.length, hidden, treeOf };
}

/** Pairs of visible cards whose rectangles overlap (for tests/metrics). */
export function cardOverlaps(nodes, gap = 0) {
  const out = [];
  const sorted = nodes.slice().sort((a, b) => (a.x - a.w / 2) - (b.x - b.w / 2));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.x - b.w / 2 >= a.x + a.w / 2 + gap) break;
      if (Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap && Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap) out.push([a.id, b.id]);
    }
  }
  return out;
}
