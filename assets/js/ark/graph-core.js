// Copied unchanged from ARK Studio ark_studio/web/js/graph-core.js (commit f8df3be).
// ARK Studio, GNU AGPL-3.0, Copyright (c) 2026 Raymon Yip. See site/assets/js/ark/LICENSE.
// Re-copy instead of editing.
import { drawStatusIcon } from "./icons.js";

// Public, data-free primitives shared by the Force map and entry background.
export const TYPE_COLORS = {
  idea: "#f59e0b", question: "#38bdf8", claim: "#a78bfa", evidence: "#34d399",
  story: "#fb7185", related_work: "#2dd4bf", topic: "#6366f1", method: "#fb923c", experiment: "#c084fc",
  run: "#94a3b8", task: "#60a5fa", milestone: "#818cf8", artifact: "#22d3ee",
  resource: "#4ade80", agent: "#facc15", host: "#a3a3a3", production: "#e879f9",
  outreach: "#f87171", decision: "#fcd34d", source: "#7dd3fc", note: "#cbd5e1",
};
export function typeColor(type) { return TYPE_COLORS[type] || "#94a3b8"; }

export const GRAPH_DEFAULTS = {
  repulsion: 3286.0639999999985,
  distance: 0,
  gravity: 0.011506123058542407,
  damping: 0.3,
};

export function focusNeighborhood(edges, seeds, visibleRelations) {
  if (!seeds.size) return null;
  const neighbors = new Set(seeds);
  for (const edge of edges) {
    if (!visibleRelations.has(edge.relation)) continue;
    if (seeds.has(edge.source)) neighbors.add(edge.target);
    if (seeds.has(edge.target)) neighbors.add(edge.source);
  }
  return neighbors;
}

export function applyExactRepulsion(nodes, strength) {
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < 0.000001) {
      const angle = (i * 31 + j) * 2.399963;
      dx = -Math.cos(angle); dy = -Math.sin(angle); d2 = 1;
    }
    const factor = strength / (Math.max(64, d2) * Math.sqrt(d2));
    const x = dx * factor, y = dy * factor;
    a.vx += x; a.vy += y; b.vx -= x; b.vy -= y;
  }
}

export function stepForce(nodes, edges, byId, cfg, visibleRelations, dragged = null, repel = applyExactRepulsion) {
  repel(nodes, cfg.repulsion);
  for (const a of nodes) { a.vx -= a.x * cfg.gravity; a.vy -= a.y * cfg.gravity; }
  for (const edge of edges) {
    if (visibleRelations && !visibleRelations.has(edge.relation)) continue;
    const a = byId.get(edge.source), b = byId.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const f = (d - cfg.distance) * 0.02;
    a.vx += dx / d * f; a.vy += dy / d * f;
    b.vx -= dx / d * f; b.vy -= dy / d * f;
  }
  for (const node of nodes) {
    if (node === dragged) { node.vx = node.vy = 0; continue; }
    node.vx = Math.max(-30, Math.min(30, node.vx * (1 - cfg.damping)));
    node.vy = Math.max(-30, Math.min(30, node.vy * (1 - cfg.damping)));
    node.x += node.vx; node.y += node.vy;
  }
}

// When the Force simulation stops: once the nodes have settled, i.e. the
// motion per tick in screen pixels stays below `mean` on average and below
// `max` for every node, for `ticks` consecutive ticks.  Below `coolFrom`
// alpha the velocities are cooled with alpha so every graph does settle;
// `tickCap` ticks or alpha under `alphaFloor` stop a graph that never does.
export const FORCE_SETTLE = { mean: 0.1, max: 0.5, ticks: 20, coolFrom: 0.02, alphaFloor: 1e-4, tickCap: 3000 };

/**
 * One tick of the stop rule.  `state` = { ticks, quiet } (mutated);
 * `motion` = { mean, max } displacement this tick in world units; `zoom`
 * screen px per world unit; `held` (a node is being dragged) never settles.
 * Returns "run", "settled" or "cap".
 */
export function forceSettleStep(state, motion, zoom, alpha, held = false, rule = FORCE_SETTLE) {
  state.ticks = (state.ticks || 0) + 1;
  const still = !held && motion.mean * zoom < rule.mean && motion.max * zoom < rule.max;
  state.quiet = still ? (state.quiet || 0) + 1 : 0;
  if (state.quiet >= rule.ticks) return "settled";
  if (!held && (state.ticks >= rule.tickCap || alpha < rule.alphaFloor)) return "cap";
  return "run";
}

// The Home header's decorative graph: at most `limit` nodes (the best
// connected; ties keep server order) and the links among them.  Every node of
// a large project would run a full force layout behind the header for
// seconds, on every visit and project switch.
export const BACKDROP_NODE_LIMIT = 300;

export function backdropSample(nodes = [], edges = [], limit = BACKDROP_NODE_LIMIT) {
  if (nodes.length <= limit) return { nodes, edges };
  const keep = nodes.map((node, index) => ({ node, index }))
    .sort((a, b) => (Number(b.node.degree) || 0) - (Number(a.node.degree) || 0) || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.node);
  const ids = new Set(keep.map((node) => node.id));
  const end = (value) => (value && typeof value === "object" ? value.id : value);
  return { nodes: keep, edges: edges.filter((edge) => ids.has(end(edge.source)) && ids.has(end(edge.target))) };
}

export function forceNodeRadius(node, zoom = 1, compact = false) {
  const base = node.radius || (compact ? 5.5 : 7) + Math.sqrt(node.degree || 0) * 2.1;
  return Math.max(3.5, Math.min(28, base * Math.min(zoom, 1.4)));
}

export function drawForceNode(ctx, node, x, y, radius, color, background) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = background; ctx.lineWidth = 1.4; ctx.stroke();
  drawStatusIcon(ctx, node.status, x, y, radius, color);
  if (node.status === "blocked" || node.status === "done") {
    const blocked = node.status === "blocked";
    ctx.beginPath(); ctx.arc(x, y, radius + (blocked ? 3 : 1.5), 0, Math.PI * 2);
    ctx.strokeStyle = blocked ? "rgba(239,68,68,.85)" : "rgba(20,184,166,.55)";
    ctx.lineWidth = blocked ? 1.5 : 1; ctx.stroke();
  }
  if (node.for_me) {
    ctx.beginPath(); ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();
  }
}

// Line-end settings live in arrows.js; the renderer imports them from here.
export {
  ARROW_HEADS, ARROW_PLACEMENTS, ARROW_SIZE_RANGE, ARROW_SIZE_PRESETS, UNDIRECTED_RELATIONS,
  relationIsDirected, defaultArrowSettings, normalizeArrowSettings, resolveArrowStyle, arrowResolver,
} from "./arrows.js";

// Arrowhead length in screen px: grows with the stroke, follows zoom gently,
// and stays inside a legible band at any zoom.  `scale` is the user's size.
export function arrowSize(lineWidth, zoom = 1, scale = 1) {
  const z = Math.max(0.75, Math.min(1.3, zoom || 1));
  return Math.max(6, Math.min(14, (5 + 2.5 * lineWidth) * z)) * (scale || 1);
}

// How each head is painted: "fill" in the edge colour, "stroke" as an open
// line, "hollow" filled with the background and outlined in the edge colour.
export const ARROW_PAINT = {
  triangle: "fill", stealth: "fill", diamond_filled: "fill", circle: "fill",
  open: "stroke", bar: "stroke", diamond: "hollow",
};

// Distance behind the tip at which the edge line should stop so it does not
// show through or past the head.
export function arrowInset(head, size) {
  switch (head) {
    case "triangle": return size * 0.7;
    case "stealth": return size * 0.6;
    case "diamond": case "diamond_filled": return size * 1.2;
    case "circle": return size * 0.76;
    default: return 0;
  }
}

// Append one arrowhead to `path` (Path2D or a 2D context).  The tip sits at
// (x, y), touching the node; (ux, uy) is the unit direction of travel into
// the tip.  Every head stays within `size * 1.2` behind the tip.
export function addArrowhead(path, x, y, ux, uy, size, head = "triangle") {
  const nx = -uy, ny = ux;
  const back = (d, side) => [x - ux * d + nx * side, y - uy * d + ny * side];
  switch (head) {
    case "open": {
      const h = size * 0.5;
      path.moveTo(...back(size, h));
      path.lineTo(x, y);
      path.lineTo(...back(size, -h));
      return;
    }
    case "stealth": {
      const h = size * 0.5;
      path.moveTo(x, y);
      path.lineTo(...back(size, h));
      path.lineTo(...back(size * 0.6, 0));
      path.lineTo(...back(size, -h));
      path.closePath();
      return;
    }
    case "diamond": case "diamond_filled": {
      const h = size * 0.36, l = size * 1.2;
      path.moveTo(x, y);
      path.lineTo(...back(l / 2, h));
      path.lineTo(...back(l, 0));
      path.lineTo(...back(l / 2, -h));
      path.closePath();
      return;
    }
    case "circle": {
      const r = size * 0.38, [cx, cy] = back(r, 0);
      path.moveTo(cx + r, cy);
      path.arc(cx, cy, r, 0, Math.PI * 2);
      path.closePath();
      return;
    }
    case "bar": {
      const h = size * 0.55;
      path.moveTo(...back(0, h));
      path.lineTo(...back(0, -h));
      return;
    }
    default: {
      const half = size * 0.48;
      path.moveTo(x, y);
      path.lineTo(...back(size, half));
      path.lineTo(...back(size, -half));
      path.closePath();
    }
  }
}

// Paint one batched path of heads (see ARROW_PAINT).  `path` may be the
// context itself when the head was traced directly into it.
export function paintArrowheads(ctx, path, head, color, background, lineWidth = 1.5) {
  const mode = ARROW_PAINT[head] || "fill";
  const direct = path === ctx;
  if (mode === "fill") {
    ctx.fillStyle = color;
    if (direct) ctx.fill(); else ctx.fill(path);
    return;
  }
  ctx.save();
  if (mode === "hollow") {
    ctx.fillStyle = background;
    if (direct) ctx.fill(); else ctx.fill(path);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash?.([]);
  if (direct) ctx.stroke(); else ctx.stroke(path);
  ctx.restore();
}
