// Live previews of ARK Studio built from ARK's own frontend: the Force map uses
// ARK's physics and node painter (ark/graph-core.js), the Mind map ARK's layout
// and card sizing (ark/mind-layout.js, ark/node-card.js), icons come from
// ark/icons.js, and the Home and Board pieces use ARK's markup with its CSS
// (assets/css/ark-ui.css). Data is a fixed, fictional demo project; nothing
// here talks to a server. Components start when scrolled into view, pause off
// screen and show a settled frame under prefers-reduced-motion.
import { typeColor, stepForce, GRAPH_DEFAULTS, forceNodeRadius, drawForceNode, addArrowhead, paintArrowheads, arrowSize } from "./ark/graph-core.js";
import { icon, drawStatusIcon } from "./ark/icons.js";
import { mindLayout } from "./ark/mind-layout.js";

const root = document.documentElement;
const zh = () => root.lang === "zh-CN";
const L = (en, cn) => (zh() ? cn : en);
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const STATUS_COLORS = { inbox: "#94a3b8", open: "#60a5fa", active: "#22c55e", review: "#f59e0b", blocked: "#ef4444", done: "#14b8a6" };
const statusColor = (s) => STATUS_COLORS[s] || "#94a3b8";

// ------------------------------------------------------------ demo project
// A fictional study: does learning-rate warm-up remove early loss spikes?
const TYPES = {
  story: ["Story", "故事线"], question: ["Question", "问题"], claim: ["Claim", "论断"], evidence: ["Evidence", "证据"],
  related_work: ["Related work", "相关工作"], experiment: ["Experiment", "实验"], method: ["Method", "方法"],
  task: ["Task", "任务"], artifact: ["Artifact", "产物"], decision: ["Decision", "决策"], idea: ["Idea", "想法"],
  production: ["Production", "产出"], milestone: ["Milestone", "里程碑"],
};
// id, type, status, parent (part_of), English, Chinese
const DEMO = [
  ["S-0001", "story", "active", null, "Warm-up and early loss spikes", "预热与早期损失尖峰"],
  ["Q-0001", "question", "active", "S-0001", "Does warm-up remove early loss spikes?", "预热能否消除早期损失尖峰？"],
  ["Q-0002", "question", "open", "S-0001", "Does it change the final loss?", "它会改变最终损失吗？"],
  ["M-0001", "method", "done", "S-0001", "60M decoder, AdamW, 5k steps", "60M 解码器，AdamW，5k 步"],
  ["C-0001", "claim", "review", "Q-0001", "Warm-up removes early spikes", "预热消除早期尖峰"],
  ["C-0002", "claim", "active", "Q-0002", "Final loss is unchanged", "最终损失不变"],
  ["C-0003", "claim", "open", "Q-0001", "Spikes come from early Adam variance", "尖峰来自 Adam 早期方差"],
  ["E-0001", "evidence", "done", "C-0001", "3 seeds, no spikes with warm-up", "3 个种子，预热后无尖峰"],
  ["E-0002", "evidence", "review", "C-0002", "Loss within 0.02 at 5k steps", "5k 步时损失差在 0.02 内"],
  ["R-0001", "related_work", "done", "C-0001", "Goyal et al. 2017", "Goyal 等 2017"],
  ["R-0002", "related_work", "done", "C-0003", "Liu et al. 2020, RAdam", "Liu 等 2020，RAdam"],
  ["R-0003", "related_work", "open", "C-0002", "Vaswani et al. 2017", "Vaswani 等 2017"],
  ["X-0001", "experiment", "done", "C-0001", "Warm-up sweep: 0, 250, 500 steps", "预热扫描：0、250、500 步"],
  ["X-0002", "experiment", "active", "C-0002", "Baseline, 3 seeds", "基线，3 个种子"],
  ["X-0003", "experiment", "open", "C-0002", "Learning-rate sweep", "学习率扫描"],
  ["X-0004", "experiment", "inbox", "C-0003", "Second-moment probe", "二阶矩探测"],
  ["T-0011", "task", "done", "X-0001", "Run warm-up sweep", "运行预热扫描"],
  ["T-0012", "task", "review", "X-0001", "Plot loss curves", "绘制损失曲线"],
  ["T-0013", "task", "active", "X-0002", "Rerun baseline", "重跑基线"],
  ["T-0014", "task", "open", "X-0003", "Write sweep config", "编写扫描配置"],
  ["T-0015", "task", "blocked", "X-0004", "Log Adam second moment", "记录 Adam 二阶矩"],
  ["A-0001", "artifact", "done", "T-0012", "loss-curves.png", "loss-curves.png"],
  ["A-0002", "artifact", "done", "T-0011", "results.csv", "results.csv"],
  ["D-0001", "decision", "done", "C-0001", "Default to 500-step warm-up", "默认使用 500 步预热"],
  ["I-0001", "idea", "inbox", "S-0001", "Warm-up for batch size too?", "批大小也做预热？"],
  ["P-0001", "production", "active", "S-0001", "Workshop paper draft", "研讨会论文初稿"],
];
const CROSS = [["E-0001", "X-0001"], ["A-0001", "E-0001"], ["D-0001", "X-0001"], ["R-0001", "X-0001"], ["E-0002", "X-0002"], ["P-0001", "C-0001"]];

function demoGraph() {
  const nodes = DEMO.map(([id, type, status, parent, en, cn]) => ({ id, type, status, parent, title: L(en, cn), x: 0, y: 0, vx: 0, vy: 0 }));
  const edges = [];
  for (const n of nodes) if (n.parent) edges.push({ source: n.id, target: n.parent, relation: "part_of" });
  for (const [a, b] of CROSS) edges.push({ source: a, target: b, relation: "supports" });
  for (const n of nodes) n.degree = edges.filter((e) => e.source === n.id || e.target === n.id).length;
  return { nodes, edges };
}

// ------------------------------------------------------------------ helpers
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.setAttribute("style", v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
function palette(el) {
  const css = getComputedStyle(el);
  const get = (n, f) => (css.getPropertyValue(n) || "").trim() || f;
  return { ink: get("--ink", "#e8eef6"), sub: get("--sub", "#93a2b6"), line: get("--line", "#273243"), bg: get("--bg", "#0f141c"),
    accent: get("--accent", "#3b82f6"), card: get("--card", "#1d2532"), violet: get("--violet", "#a78bfa"), green: get("--green", "#34d399") };
}
function alpha(color, a) {
  const m = /^#([\da-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function roundRect(ctx, x, y, w, hgt, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
  ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, width, max) {
  const words = zh() ? [...text] : text.split(" ");
  const sep = zh() ? "" : " ";
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + sep + w : w;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/.?$/, "…"); }
  return lines;
}
// Run `start` when the element first comes into view; `visible(bool)` after.
function whenVisible(el, start, visible) {
  let started = false;
  const go = (on) => {
    if (on && !started) { started = true; start(); }
    if (started && visible) visible(on);
  };
  if (!("IntersectionObserver" in window)) { go(true); return; }
  new IntersectionObserver((entries) => go(entries[0].isIntersecting), { rootMargin: "120px" }).observe(el);
}
const refreshers = new Set();
new MutationObserver(() => refreshers.forEach((fn) => fn())).observe(root, { attributes: true, attributeFilter: ["lang", "data-theme"] });

// ------------------------------------------------------------ Force canvas
// ARK's Force map: stepForce with GRAPH_DEFAULTS, drawForceNode, arrowheads.
class ForceCanvas {
  constructor(host, { labels = true, minLabelDegree = 0, overlay = null, fitPad = 40, insetRight = null, colorOf = null, labelOf = null, edgeStyle = null, radiusOf = null, padTop = 0, fitFilter = null, arrows = true, jiggle = 0, labelCollide = false, labelColorOf = null, padBottom = 0 } = {}) {
    this.host = host;
    this.canvas = h("canvas", { "aria-hidden": "true" });
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.nodes = []; this.edges = []; this.byId = new Map();
    this.labels = labels; this.minLabelDegree = minLabelDegree; this.overlay = overlay; this.fitPad = fitPad; this.insetRight = insetRight;
    this.colorOf = colorOf || ((n) => typeColor(n.type));
    this.labelOf = labelOf; this.edgeStyle = edgeStyle; this.radiusOf = radiusOf; this.padTop = padTop; this.fitFilter = fitFilter;
    this.arrows = arrows; this.jiggle = jiggle; this.labelCollide = labelCollide; this.labelColorOf = labelColorOf; this.padBottom = padBottom;
    this.view = null; this.running = false; this.visible = false; this.idle = 0;
    this.cfg = { ...GRAPH_DEFAULTS, distance: 46 };
    this.pal = palette(host);
    new ResizeObserver(() => this.resize()).observe(host);
    // Hover as on ARK's map: ring on the node, its neighbourhood highlighted.
    this.hover = null;
    host.addEventListener("pointermove", (ev) => {
      if (!this.view) return;
      const r = host.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      let best = null, bd = 14;
      for (const n of this.nodes) { const s = this.screen(n), d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = n; } }
      if (best !== this.hover) { this.hover = best; host.style.cursor = best ? "pointer" : ""; if (!this.running) this.draw(); }
    });
    host.addEventListener("pointerleave", () => { if (this.hover) { this.hover = null; host.style.cursor = ""; if (!this.running) this.draw(); } });
    refreshers.add(() => { this.pal = palette(host); this.draw(); });
    this.resize();
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const changed = Math.abs(r.width - (this.w || 0)) > 1 || Math.abs(r.height - (this.h || 0)) > 1;
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    if (changed) this.view = null;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
    this.dpr = dpr;
    this.draw();
  }
  set(nodes, edges) {
    this.nodes = nodes; this.edges = edges; this.byId = new Map(nodes.map((n) => [n.id, n]));
    nodes.forEach((n, i) => { n.vx = n.vx || 0; n.vy = n.vy || 0; if (!n.x && !n.y) { const a = i * 2.399963; const r = 18 * Math.sqrt(i + 1); n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; } });
    this.idle = 0;
  }
  add(node, edges = []) {
    const parent = edges.length ? this.byId.get(edges[0].target === node.id ? edges[0].source : edges[0].target) : null;
    const a = Math.random() * Math.PI * 2;
    node.x = (parent ? parent.x : 0) + Math.cos(a) * 24; node.y = (parent ? parent.y : 0) + Math.sin(a) * 24;
    node.vx = node.vy = 0; node.born = performance.now();
    this.nodes.push(node); this.byId.set(node.id, node);
    for (const e of edges) { e.born = performance.now(); this.edges.push(e); }
    for (const n of this.nodes) n.degree = this.edges.filter((e) => e.source === n.id || e.target === n.id).length;
    this.idle = 0;
  }
  settle(ticks = 320) { this.nodes.forEach((n) => { n.born = null; }); this.edges.forEach((e) => { e.born = null; }); for (let i = 0; i < ticks; i++) stepForce(this.nodes, this.edges, this.byId, this.cfg, null); this.view = null; }
  fit(immediate) {
    if (!this.nodes.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of (this.fitFilter ? this.nodes.filter(this.fitFilter) : this.nodes)) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const pad = this.fitPad, right = this.insetRight ? this.insetRight(this.w) : 0, W = this.w - right;
    const top = this.padTop || 0, H = this.h - top - (this.padBottom || 0);
    const z = Math.min(1.5, (W - pad * 2) / Math.max(120, x1 - x0), (H - pad * 2) / Math.max(120, y1 - y0));
    const target = { z, x: W / 2 - ((x0 + x1) / 2) * z, y: top + H / 2 - ((y0 + y1) / 2) * z };
    if (!this.view || immediate) this.view = target;
    else for (const k of ["z", "x", "y"]) this.view[k] += (target[k] - this.view[k]) * 0.08;
  }
  screen(n) { return { x: n.x * this.view.z + this.view.x, y: n.y * this.view.z + this.view.y }; }
  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      if (this.jiggle) {
        // A living graph: small random nudges keep the layout breathing.
        for (const n of this.nodes) { n.vx += (Math.random() - 0.5) * this.jiggle; n.vy += (Math.random() - 0.5) * this.jiggle; }
        stepForce(this.nodes, this.edges, this.byId, this.cfg, null);
      } else if (this.idle < 600) { stepForce(this.nodes, this.edges, this.byId, this.cfg, null); this.idle++; }
      this.fit(false);
      this.draw();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop() { this.running = false; cancelAnimationFrame(this.frame); }
  draw() {
    const { ctx, pal } = this;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.nodes.length) return;
    if (!this.view) this.fit(true);
    const now = performance.now();
    const grow = (t) => (t ? Math.min(1, (now - t) / 450) : 1);
    const z = this.view.z;
    const heads = new Path2D();
    const hv = this.hover && this.byId.get(this.hover.id) === this.hover ? this.hover : null;
    const nb = hv ? new Set([hv.id]) : null;
    if (hv) for (const e of this.edges) { if (e.source === hv.id) nb.add(e.target); if (e.target === hv.id) nb.add(e.source); }
    const rad = (n) => (this.radiusOf ? this.radiusOf(n) * Math.min(1.25, Math.max(0.7, z)) : forceNodeRadius(n, z, true));
    ctx.lineWidth = 1.2;
    for (const e of this.edges) {
      const a = this.byId.get(e.source), b = this.byId.get(e.target);
      if (!a || !b) continue;
      const p = this.screen(a), q = this.screen(b);
      const k = grow(e.born);
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const rb = rad(b) + 1.5;
      const ex = p.x + dx * k - ux * (k === 1 ? rb : 0), ey = p.y + dy * k - uy * (k === 1 ? rb : 0);
      const near = hv && (e.source === hv.id || e.target === hv.id);
      ctx.strokeStyle = near ? alpha(pal.accent, 0.85) : this.edgeStyle ? this.edgeStyle(e) : alpha(pal.sub, e.relation === "part_of" ? 0.42 : 0.3);
      ctx.globalAlpha = hv && !near ? 0.3 : 1; ctx.lineWidth = near ? 1.7 : 1.2;
      ctx.setLineDash(e.relation === "part_of" ? [] : [4, 4]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
      if (this.arrows && k === 1 && len > 30) addArrowhead(heads, ex, ey, ux, uy, arrowSize(1, z, 0.55), "triangle");
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    paintArrowheads(ctx, heads, "triangle", alpha(pal.sub, hv ? 0.25 : 0.45), pal.bg);
    ctx.font = "600 11px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const pending = [];
    for (const n of this.nodes) {
      const s = this.screen(n), k = grow(n.born);
      const r = rad(n) * (0.4 + 0.6 * k);
      const dim = nb && !nb.has(n.id) ? 0.3 : 1;
      ctx.globalAlpha = k * dim;
      drawForceNode(ctx, n, s.x, s.y, r, this.colorOf(n), pal.bg);
      if (n === hv) { ctx.beginPath(); ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke(); }
      const raw = this.labelOf ? (this.labelOf(n) || (n === hv && n.title) || null) : ((this.labels && (n.degree || 0) >= this.minLabelDegree) || n === hv ? n.title : null);
      if (raw && this.labelCollide) pending.push({ n, s, r, raw, k: k * dim });
      else if (raw) {
        const max = zh() ? 12 : 24, text = raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
        ctx.lineWidth = 3; ctx.strokeStyle = alpha(pal.bg, 0.85); ctx.lineJoin = "round";
        ctx.strokeText(text, s.x, s.y + r + 3);
        ctx.fillStyle = pal.ink; ctx.fillText(text, s.x, s.y + r + 3);
      }
      ctx.globalAlpha = 1;
    }
    if (pending.length) {
      // Labels as ARK places them: most connected first, truncated, and a
      // label that would overlap one already placed is left out.
      const pri = (q) => (q.n === hv ? 2e6 : q.n.hub ? 1e6 : nb && nb.has(q.n.id) ? 1e5 : q.n.degree || 0);
      pending.sort((a, b) => pri(b) - pri(a));
      const placed = [];
      // Node discs are obstacles too, except the label's own node.
      const discs = this.nodes.map((m) => { const q = this.screen(m), rr = (this.radiusOf ? this.radiusOf(m) : 6) + 1; return [q.x - rr, q.y - rr, q.x + rr, q.y + rr, m]; });
      for (const { n, s, r, raw, k } of pending) {
        const max = zh() ? 11 : 22, text = raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
        const w = ctx.measureText(text).width, box = [s.x - w / 2 - 3, s.y + r + 2, s.x + w / 2 + 3, s.y + r + 17];
        const hit = (b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1];
        if (placed.some(hit) || (!n.hub && n !== hv && discs.some((d) => d[4] !== n && hit(d)))) continue;
        placed.push(box);
        ctx.globalAlpha = k;
        ctx.lineWidth = 3; ctx.strokeStyle = alpha(pal.bg, 0.85); ctx.lineJoin = "round";
        ctx.strokeText(text, s.x, s.y + r + 3);
        ctx.fillStyle = this.labelColorOf ? this.labelColorOf(n, pal) : pal.ink; ctx.fillText(text, s.x, s.y + r + 3);
        ctx.globalAlpha = 1;
      }
    }
    this.overlay?.(ctx, this, now);
  }
}

// ------------------------------------------------------------- Mind canvas
// ARK's Mind layout (mindLayout + cardMetrics); cards painted as ARK paints them.
function mindCanvas(host) {
  const canvas = h("canvas", { "aria-hidden": "true" });
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  let data = null;
  function layout() {
    data = demoGraph();
    const tree = data.edges.filter((e) => e.relation === "part_of");
    mindLayout(data.nodes, tree, {});
    for (const n of data.nodes) n.depth = n.parent ? 1 : 0;
  }
  function draw() {
    const r = host.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const pal = palette(host);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of data.nodes) { x0 = Math.min(x0, n.x - n.w / 2); x1 = Math.max(x1, n.x + n.w / 2); y0 = Math.min(y0, n.y - n.h / 2); y1 = Math.max(y1, n.y + n.h / 2); }
    const z = Math.min(1.15, (W - 40) / (x1 - x0), (H - 40) / (y1 - y0));
    const ox = W / 2 - ((x0 + x1) / 2) * z, oy = H / 2 - ((y0 + y1) / 2) * z;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    ctx.strokeStyle = alpha(pal.sub, 0.32); ctx.lineWidth = 1.1;
    for (const n of data.nodes) {
      const p = byId.get(n.parent);
      if (!p) continue;
      const ax = (p.x + p.w / 2) * z + ox, ay = p.y * z + oy, bx = (n.x - n.w / 2) * z + ox, by = n.y * z + oy, mid = (ax + bx) / 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(mid, ay, mid, by, bx, by); ctx.stroke();
    }
    for (const n of data.nodes) {
      const color = typeColor(n.type);
      ctx.save();
      ctx.translate((n.x - n.w / 2) * z + ox, (n.y - n.h / 2) * z + oy);
      ctx.scale(z, z);
      roundRect(ctx, 0, 0, n.w, n.h, Math.min(8, n.h / 4));
      ctx.fillStyle = n.depth === 0 ? alpha(color, 0.16) : pal.card; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = alpha(color, 0.55); ctx.stroke();
      roundRect(ctx, 0, 0, 4, n.h, 2); ctx.fillStyle = color; ctx.fill();
      ctx.font = "600 12px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = pal.ink;
      const lines = wrap(ctx, n.title, n.titleW - 22, n.lines || 2);
      let ty = Math.max(4, (n.h - 14 - lines.length * 15) / 2);
      for (const line of lines) { ctx.fillText(line, 11, ty); ty += 15; }
      ctx.font = "9.5px ui-monospace, Consolas, monospace"; ctx.fillStyle = pal.sub; ctx.textBaseline = "middle";
      ctx.fillText(`${n.id} · ${L(...TYPES[n.type])}`, 11, n.h - 8);
      const sx = n.w - 10, sy = n.h - 8;
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fillStyle = statusColor(n.status); ctx.fill();
      drawStatusIcon(ctx, n.status, sx, sy, 5, statusColor(n.status));
      ctx.restore();
    }
  }
  layout(); draw();
  new ResizeObserver(draw).observe(host);
  refreshers.add(() => { layout(); draw(); });
}

// ------------------------------------------------- Home pieces (ARK markup)
function kpiTiles() {
  const tiles = [
    ["play", L("Active", "进行中"), 6, "+3", "up", ""],
    ["alert", L("Blocked", "受阻"), 1, "+1", "worse", "warn"],
    ["check", L("In review", "待审阅"), 3, "+2", "up", ""],
    ["tasks", L("Open", "未完成"), 14, null, "", ""],
  ];
  return h("section", { class: "stat-grid ov-pulse", "aria-label": L("Project pulse", "项目动态") },
    tiles.map(([ic, name, value, delta, cls, tone]) => h("div", { class: `stat ov-kpi ${tone}`.trim() },
      h("span", { class: "k ov-kpi-k" }, icon(ic, "sm"), name),
      h("span", { class: "v ov-kpi-v" }, String(value)),
      delta ? h("span", { class: `d ov-kpi-d ${cls}` }, h("span", null, h("b", null, delta), h("span", { class: "ov-kpi-dl" }, L(" vs last week", " 较上周"))))
        : h("span", { class: "d ov-kpi-d" }, L("not done yet", "尚未完成")))));
}
function needsRow({ uid, title, excerpt, age, state = "" }) {
  return h("article", { class: `needs-row kind-review ${state}`.trim() },
    h("span", { class: "needs-chip kind-review" }, L("Accept", "验收")),
    h("div", { class: "needs-main" },
      h("div", { class: "needs-line" }, h("span", { class: "needs-title" }, h("span", { class: "needs-uid" }, uid), " ", title), h("span", { class: "needs-age" }, age)),
      h("div", { class: "needs-excerpt" }, excerpt),
      h("div", { class: "needs-foot" }, h("div", { class: "needs-media-col" }),
        h("div", { class: "needs-actions" },
          h("span", { class: "btn sm primary live-accept" }, icon("check", "sm"), h("span", { class: "la-1" }, L("Accept", "验收")), h("span", { class: "la-2" }, L("Accepted", "已验收"))),
          h("span", { class: "btn sm ghost" }, L("Send back", "退回")),
          h("span", { class: "btn sm ghost" }, icon("message", "sm"), L("Comment", "评论"))))));
}
const NEEDS = () => [
  { uid: "T-0012", title: L("Plot loss curves", "绘制损失曲线"), excerpt: L("Curves for 0, 250 and 500 warm-up steps, 3 seeds each. No spike above 1.5x the running mean with 500 steps.", "0、250、500 步预热各 3 个种子的曲线。500 步预热下没有超过滑动均值 1.5 倍的尖峰。"), age: L("12 min ago", "12 分钟前") },
  { uid: "E-0002", title: L("Loss within 0.02 at 5k steps", "5k 步时损失差在 0.02 内"), excerpt: L("Final loss 2.08 with warm-up, 2.10 without. Supports C-0002.", "有预热 2.08，无预热 2.10，支持 C-0002。"), age: L("1 h ago", "1 小时前") },
];
function needsPanel(items = NEEDS()) {
  return h("section", { class: "panel needs-panel" },
    h("div", { class: "panel-head" }, h("h3", null, L("Needs you", "需要你处理"), h("span", { class: "needs-count" }, String(items.length))),
      h("span", { class: "needs-summary" }, h("span", { class: "needs-sum kind-review" }, h("b", null, String(items.length)), " ", L("Accept", "验收")))),
    items.map(needsRow));
}
function pipelinePanel() {
  const stages = [["bulb", L("Capture", "收集"), 1, 0, 0, 0, 2], ["route", L("Plan", "计划"), 2, 2, 0, 0, 6], ["flask", L("Evidence", "证据"), 1, 0, 1, 0, 4],
    ["play", L("Execute", "执行"), 2, 1, 1, 1, 7], ["target", L("Make", "制作"), 1, 1, 0, 0, 3], ["send", L("Share", "分享"), 0, 1, 0, 0, 2]];
  return h("section", { class: "panel ov-pipeline" },
    h("div", { class: "panel-head" }, h("h3", null, L("Research pipeline", "研究流水线"))),
    h("div", { class: "ov-stages" }, stages.map(([ic, name, done, active, review, blocked, total]) => h("div", { class: "ov-stage" },
      h("span", { class: "ov-stage-name" }, icon(ic, "sm"), name),
      h("span", { class: "ov-meter" }, [["done", done], ["active", active], ["review", review], ["blocked", blocked]]
        .filter(([, n]) => n).map(([k, n]) => h("span", { class: `seg ${k}`, style: `width:${Math.round(n / total * 100)}%` }))),
      h("span", { class: "ov-stage-n" }, h("b", null, String(done)), "/" + total)))));
}

// ----------------------------------------------------------------- Board
const AGENTS = { AA: "#facc15", QP: "#22d3ee", RL: "#f472b6", MY: "#60a5fa" };
function taskCard([uid, imp, title, due, assignee, tags]) {
  const impColor = { P0: "#ef4444", P1: "#f59e0b", P2: "#3b82f6" }[imp];
  return h("article", { class: "task-card" },
    h("div", { class: "row", style: "justify-content:space-between;gap:4px" }, h("span", { class: "uid" }, uid),
      h("span", { class: "row tight" }, h("span", { class: "importance", style: `--imp-color:${impColor}` }, imp))),
    h("div", { class: "t" }, title),
    h("div", { class: "m" }, h("span", null, icon("calendar", "sm"), " " + due),
      h("span", { class: "right" }, h("span", { class: "assignees" }, h("span", { class: "avatar", style: `--agent-color:${AGENTS[assignee]}` }, assignee)))),
    tags.length ? h("div", { class: "tags" }, tags.map((tg) => h("span", { class: "tag" }, h("span", { class: "tag-ns" }, "task"), ":", h("span", null, tg)))) : null);
}
function board(columns = ["open", "active", "review", "done"]) {
  const d = (en, cn) => L(en, cn);
  const COLS = {
    open: [L("Open", "未开始"), "#60a5fa", [["T-0014", "P1", d("Write sweep config", "编写扫描配置"), d("Dec 3", "12月3日"), "MY", ["config"]], ["T-0016", "P2", d("Collect related work", "整理相关工作"), d("Dec 8", "12月8日"), "QP", ["writing"]]]],
    active: [L("Active", "进行中"), "#22c55e", [["T-0013", "P0", d("Rerun baseline, 3 seeds", "重跑基线，3 个种子"), d("Nov 30", "11月30日"), "AA", ["experiment"]], ["T-0017", "P1", d("Draft method section", "撰写方法部分"), d("Dec 5", "12月5日"), "RL", ["writing"]]]],
    review: [L("Review", "待审阅"), "#f59e0b", [["T-0012", "P1", d("Plot loss curves", "绘制损失曲线"), d("Nov 28", "11月28日"), "QP", ["figure"]]]],
    blocked: [L("Blocked", "受阻"), "#ef4444", [["T-0015", "P1", d("Log Adam second moment", "记录 Adam 二阶矩"), d("Nov 26", "11月26日"), "AA", ["experiment"]]]],
    done: [L("Done", "已完成"), "#14b8a6", [["T-0011", "P0", d("Run warm-up sweep", "运行预热扫描"), d("Nov 24", "11月24日"), "AA", ["experiment"]]]],
  };
  return h("div", { class: "board" }, columns.map((key) => {
    const [name, color, cards] = COLS[key];
    return h("div", { class: "board-col", "data-status": key },
      h("div", { class: "board-head" }, h("span", { class: "dot", style: `background:${color}` }), h("span", { class: "t" }, name), h("span", { class: "n" }, String(cards.length))),
      h("div", { class: "board-body" }, cards.map(taskCard)));
  }));
}

// ------------------------------------------------------------- Resources
// The Resources graph's cards, rebuilt in DOM (ARK draws them on a canvas
// inside a view that needs a server). Hosts, jobs and usage are made up.
function resources() {
  const gpu = (name, util, mem, total, job, ours) => h("div", { class: `rs-gpu${ours ? " ours" : ""}` },
    h("div", { class: "rs-gl" }, h("b", null, name), h("span", null, `${util}%`)),
    h("div", { class: "rs-bar" }, h("i", { style: `width:${util}%`, class: util >= 85 ? "hi" : util >= 60 ? "mid" : "" })),
    h("div", { class: "rs-gl sub" }, h("span", null, job ? L("Job: ", "任务：") + job : L("free", "空闲")), h("span", null, `${mem} / ${total} GiB`)));
  const card = (id, title, kind, rows, extra = "") => h("div", { class: `rs-card ${extra}`, "data-rs": id },
    h("div", { class: "rs-head" }, h("i", { class: "rs-dot" }), h("b", null, title)), h("div", { class: "rs-kind" }, kind), ...rows);
  const row = (tag, label) => h("div", { class: "rs-row" }, h("span", { class: "rs-tag" }, tag), h("span", null, label));
  const wrapEl = h("div", { class: "rs-graph" },
    (() => { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "rs-links"); svg.setAttribute("aria-hidden", "true"); return svg; })(),
    card("ws", "workstation", L("Machine · shared · online", "机器 · 共享 · 在线"), [row(L("REPO", "仓库"), "warmup-study"), row(L("ENV", "环境"), "conda: warmup")]),
    card("ark", "lab-ark", L("ARK server · online", "ARK 服务器 · 在线"), [row(L("STORAGE", "存储"), L("Project folder · 39%", "项目文件夹 · 39%")), row(L("SESSIONS", "会话"), L("3 running · 2 mine", "3 个运行中 · 2 个属于我"))]),
    card("g1", "gpu-server-1", L("GPU server · online · 2 ours, 1 busy, 1 free", "GPU 服务器 · 在线 · 我们 2、他人 1、空闲 1"), [
      gpu("GPU 0 · RTX 4090", 92, 20.5, 24, L("warm-up sweep", "预热扫描"), true),
      gpu("GPU 1 · RTX 4090", 88, 16.6, 24, L("baseline", "基线"), true),
      gpu("GPU 2 · RTX 4090", 64, 19.5, 24, L("other user", "其他用户"), false),
      gpu("GPU 3 · RTX 4090", 0, 0.3, 24, null, false)], "wide"),
    card("g2", "gpu-server-2", L("GPU server · online · 1 ours, 1 free", "GPU 服务器 · 在线 · 我们 1、空闲 1"), [
      gpu("GPU 0 · A100 80GB", 90, 50.8, 80, L("LR sweep", "学习率扫描"), true),
      gpu("GPU 1 · A100 80GB", 0, 0, 80, null, false)], "wide"));
  const links = [["ws", "ark", "ARK API"], ["ark", "g1", "SSH"], ["ark", "g2", "SSH"]];
  const drawLinks = () => {
    const svg = wrapEl.querySelector(".rs-links"), box = wrapEl.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = "";
    const NS = "http://www.w3.org/2000/svg";
    for (const [a, b, label] of links) {
      const ra = wrapEl.querySelector(`[data-rs="${a}"]`).getBoundingClientRect(), rb = wrapEl.querySelector(`[data-rs="${b}"]`).getBoundingClientRect();
      const stacked = rb.left < ra.right - 4;
      const x1 = stacked ? ra.left + ra.width / 2 - box.left : ra.right - box.left, y1 = stacked ? ra.bottom - box.top : ra.top + ra.height / 2 - box.top;
      const x2 = stacked ? rb.left + rb.width / 2 - box.left : rb.left - box.left, y2 = stacked ? rb.top - box.top : rb.top + 22 - box.top;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", stacked ? `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`);
      p.setAttribute("class", label === "SSH" ? "ssh" : "api");
      svg.append(p);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", (x1 + x2) / 2); t.setAttribute("y", (y1 + y2) / 2 - 4); t.textContent = label;
      svg.append(t);
    }
  };
  requestAnimationFrame(drawLinks);
  new ResizeObserver(drawLinks).observe(wrapEl);
  return wrapEl;
}

// ------------------------------------------------------------ mount points
function mountDom(el, build) {
  const render = () => { el.replaceChildren(build()); };
  whenVisible(el, () => { render(); refreshers.add(() => { if (el.isConnected) render(); }); });
}
document.querySelectorAll("[data-live]").forEach((el) => {
  const kind = el.getAttribute("data-live");
  if (kind === "home") mountDom(el, () => h("div", { class: "live-home" }, kpiTiles(), h("div", { class: "live-home-cols" }, needsPanel(), pipelinePanel())));
  else if (kind === "board") mountDom(el, () => board(["open", "active", "review", "blocked", "done"]));
  else if (kind === "board-team") mountDom(el, () => board(["active", "review", "done"]));
  else if (kind === "resources") mountDom(el, resources);
  else if (kind === "mind") whenVisible(el, () => mindCanvas(el));
  else if (kind === "force") {
    let fc;
    whenVisible(el, () => {
      fc = new ForceCanvas(el, { minLabelDegree: 3 });
      const g = demoGraph(); fc.set(g.nodes, g.edges);
      refreshers.add(() => { const t = new Map(demoGraph().nodes.map((n) => [n.id, n.title])); fc.nodes.forEach((n) => { n.title = t.get(n.id); }); fc.draw(); });
      if (reduceMotion()) { fc.settle(); fc.draw(); }
    }, (on) => { if (!fc || reduceMotion()) return; if (on && !el.closest("[hidden]")) fc.start(); else fc.stop(); });
    el._force = () => fc;
  }
});
// Tabs reveal hidden canvases: redraw at their real size.
document.addEventListener("ark-live-shown", (e) => {
  const f = e.detail.querySelector("[data-live=force]");
  if (f && f._force && f._force()) { const fc = f._force(); fc.resize(); fc.view = null; if (!reduceMotion()) fc.start(); }
  e.detail.querySelectorAll("canvas").forEach((c) => c.parentElement && c.parentElement.dispatchEvent(new Event("resize")));
});

// ----------------------------------------------------------------- Hero
// Four moments of the product in one window, like the segments of a short
// film: the research map growing (Force renderer), agents working in
// parallel, the review queue, and resources with the GPU queue. Each scene
// plays its own story and hands over to the next with a calm cross-fade. The
// switcher under the window picks a scene; hover or focus pauses; reduced
// motion shows a settled frame per scene; off screen nothing runs.
const hero = document.getElementById("mock");
const timersOf = () => { const list = []; return { add: (ms, fn) => list.push(setTimeout(fn, ms)), clear: () => { list.forEach(clearTimeout); list.length = 0; } }; };
const svgEl = (markup) => { const t = document.createElement("template"); t.innerHTML = markup.trim(); return t.content.firstChild; };

// ------------------------------------------------ scene 1: the research map
function mapScene(pane) {
  const host = pane.querySelector(".mock-map-canvas");
  const needsHost = pane.querySelector(".mock-needs");
  const agents = { A1: { x: 0, y: 0, to: null, color: "#a78bfa", on: false }, A2: { x: 0, y: 0, to: null, color: "#f472b6", on: false } };
  const fc = new ForceCanvas(host, { minLabelDegree: 2, fitPad: 34, insetRight: (w) => (w > 700 ? Math.min(420, w * 0.42) : 0), overlay: (ctx, view) => {
    for (const [name, a] of Object.entries(agents)) {
      if (!a.on || !a.to || !view.byId.get(a.to)) continue;
      const s = view.screen(view.byId.get(a.to));
      const tx = s.x + 13, ty = s.y - 13;
      if (!a.placed) { a.x = tx; a.y = ty; a.placed = true; }
      a.x += (tx - a.x) * 0.12; a.y += (ty - a.y) * 0.12;
      ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fillStyle = a.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = view.pal.bg; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "700 9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(name, a.x, a.y + 0.5);
    }
  } });
  const SEQ = ["S-0001", "Q-0001", "Q-0002", "C-0001", "R-0001", "C-0002", "C-0003", "X-0001", "R-0002", "X-0002", "T-0011", "T-0013", "E-0001", "A-0002", "E-0002", "D-0001"];
  const byDemo = new Map(DEMO.map((d) => [d[0], d]));
  const nodeOf = (id) => { const [, type, status, parent, en, cn] = byDemo.get(id); return { id, type, status, parent, title: L(en, cn) }; };
  const linkFor = (id) => {
    const d = byDemo.get(id), out = [];
    if (d[3]) out.push({ source: id, target: d[3], relation: "part_of" });
    for (const [a, b] of CROSS) if (a === id && fc.byId.has(b)) out.push({ source: a, target: b, relation: "supports" });
    return out;
  };
  const tasks = [...pane.querySelectorAll(".ms-task")];
  const setTask = (i, state, pct) => {
    tasks[i].setAttribute("data-state", state);
    if (pct != null) tasks[i].querySelector(".mt-bar i").style.width = pct + "%";
    pane.querySelector("#mock-active").textContent = pane.querySelectorAll('.ms-task[data-state="active"]').length;
  };
  const gpu = (id, on) => pane.querySelector("#" + id).classList.toggle("ours", on);
  let needsState = "";
  const renderNeeds = (state) => {
    needsState = state;
    needsHost.replaceChildren(needsPanel([{ uid: "E-0001", title: L("3 seeds, no spikes with warm-up", "3 个种子，预热后无尖峰"),
      excerpt: L("500-step warm-up: no step above 1.5x the running mean in any seed.", "500 步预热：所有种子都没有超过滑动均值 1.5 倍的步。"), age: L("just now", "刚刚"), state }]));
  };
  refreshers.add(() => { renderNeeds(needsState); fc.nodes.forEach((n) => { n.title = nodeOf(n.id).title; }); fc.draw(); });
  const grow = (id) => { if (!fc.byId.has(id)) fc.add(nodeOf(id), linkFor(id)); };
  const agentTo = (name, id) => { agents[name].on = true; agents[name].to = id; };
  const t = timersOf();
  function reset() {
    fc.set([], []); fc.view = null;
    for (const a of Object.values(agents)) { a.on = false; a.placed = false; a.to = null; }
    tasks.forEach((_, i) => setTask(i, "queued", 0));
    gpu("g0", false); gpu("g1", false);
    pane.classList.remove("needs-on"); renderNeeds("");
  }
  const STEPS = [
    [100, () => grow("S-0001")], [600, () => grow("Q-0001")], [900, () => { grow("Q-0002"); agentTo("A1", "Q-0001"); }],
    [1400, () => { grow("C-0001"); agentTo("A1", "C-0001"); }], [1800, () => grow("R-0001")],
    [2200, () => { grow("C-0002"); agentTo("A2", "C-0002"); }], [2600, () => grow("C-0003")],
    [3100, () => { grow("X-0001"); agentTo("A1", "X-0001"); setTask(0, "active", 10); gpu("g0", true); }],
    [3500, () => grow("R-0002")],
    [3900, () => { grow("X-0002"); agentTo("A2", "X-0002"); setTask(1, "active", 8); gpu("g1", true); }],
    [4400, () => { grow("T-0011"); setTask(0, "active", 45); }], [4900, () => { grow("T-0013"); setTask(1, "active", 30); }],
    [6000, () => { setTask(0, "active", 100); setTask(1, "active", 60); }],
    [6800, () => { grow("E-0001"); grow("A-0002"); agentTo("A1", "E-0001"); setTask(0, "review", 100); gpu("g0", false); }],
    [7300, () => { pane.classList.add("needs-on"); setTask(2, "active", 20); }],
    [8900, () => renderNeeds("pressing")],
    [9200, () => { renderNeeds("accepted"); setTask(0, "done", 100); grow("D-0001"); fc.byId.get("E-0001").status = "done"; }],
    [9900, () => { grow("E-0002"); agentTo("A2", "E-0002"); setTask(1, "active", 100); setTask(2, "active", 70); }],
    [10800, () => { pane.classList.remove("needs-on"); setTask(1, "review", 100); gpu("g1", false); }],
  ];
  return {
    length: 12600,
    play() { t.clear(); reset(); STEPS.forEach(([ms, fn]) => t.add(ms, fn)); fc.start(); },
    stop() { t.clear(); fc.stop(); },
    settle() {
      t.clear(); fc.stop(); reset();
      SEQ.forEach(grow);
      fc.nodes.forEach((n) => { n.born = null; }); fc.edges.forEach((e) => { e.born = null; });
      fc.settle(260); fc.fit(true);
      agentTo("A1", "E-0001"); agentTo("A2", "X-0002");
      setTask(0, "review", 100); setTask(1, "active", 70); setTask(2, "active", 30); gpu("g1", true);
      pane.classList.add("needs-on");
      fc.draw();
    },
    resize() { fc.resize(); fc.view = null; fc.draw(); },
  };
}

// ---------------------------------------------- scene 2: agents in parallel
const SESSIONS = [
  ["CX", "Codex", "#60a5fa", "T-0013", ["Rerun baseline", "重跑基线"], ["$ python train.py --seed 1", "step 1200   loss 2.41", "step 2400   loss 2.22", "saved ckpt-2400.pt", "progress → T-0013  60%"], "T-0013"],
  ["CL", "Claude Code", "#f97316", "T-0012", ["Plot loss curves", "绘制损失曲线"], ["read results.csv  (3 seeds)", "write plot_loss.py", "$ python plot_loss.py", "wrote loss-curves.png", "upload → T-0012  figure"], "T-0012"],
  ["DS", "DSH", "#22d3ee", "T-0016", ["Collect related work", "整理相关工作"], ["search  learning-rate warm-up", "14 papers, 6 relevant", "link R-0001 → C-0001", "link R-0002 → C-0003", "summary → T-0016"], "R-0001"],
  ["OC", "OpenCode", "#a3e635", "T-0014", ["Write sweep config", "编写扫描配置"], ["open configs/sweep.yaml", "warmup: [0, 250, 500]", "$ pytest tests/test_config.py", "4 passed in 1.2s", "commit  sweep config"], "X-0003"],
];
function agentsScene(pane) {
  pane.innerHTML = "";
  const grid = h("div", { class: "ag-grid" });
  const side = h("div", { class: "ag-side" }, h("div", { class: "ag-side-h" }), h("div", { class: "ag-mini" }));
  pane.append(grid, side);
  const presence = {};
  const fc = new ForceCanvas(side.querySelector(".ag-mini"), { labels: false, fitPad: 22, overlay: (ctx, view) => {
    for (const [name, p] of Object.entries(presence)) {
      const n = view.byId.get(p.to);
      if (!n) continue;
      const s = view.screen(n), tx = s.x + 9, ty = s.y - 9;
      if (p.x == null) { p.x = tx; p.y = ty; }
      p.x += (tx - p.x) * 0.1; p.y += (ty - p.y) * 0.1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = view.pal.bg; ctx.stroke();
      ctx.fillStyle = "#0b1017"; ctx.font = "700 7.5px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(name, p.x, p.y + 0.5);
    }
  } });
  const g = demoGraph(); fc.set(g.nodes, g.edges); fc.settle(300);
  const cards = [];
  function render() {
    side.querySelector(".ag-side-h").textContent = L("On the map", "在地图上");
    grid.replaceChildren(...SESSIONS.map(([badge, name, color, uid, title]) => {
      const card = h("div", { class: "ag-card", "data-state": "queued" },
        h("div", { class: "ag-head" }, h("span", { class: "ag-badge", style: `background:${color}` }, badge),
          h("div", { class: "ag-who" }, h("b", null, name), h("span", null, `${uid} · ${L(...title)}`)),
          h("span", { class: "ag-chip" }, h("i", { class: "c-queued" }, L("Queued", "排队")), h("i", { class: "c-active" }, L("Running", "运行中")), h("i", { class: "c-review" }, L("Review", "待审阅")))),
        h("div", { class: "ag-log" }), h("div", { class: "ag-bar" }, h("i")));
      return card;
    }));
    cards.length = 0; cards.push(...grid.children);
  }
  render();
  refreshers.add(() => { render(); if (!running) settle(); });
  const t = timersOf();
  let running = false;
  const line = (i, text) => {
    const log = cards[i].querySelector(".ag-log");
    log.append(h("div", { class: "ag-line" }, text));
    while (log.children.length > 4) log.firstChild.remove();
  };
  const state = (i, s, pct) => { cards[i].setAttribute("data-state", s); if (pct != null) cards[i].querySelector(".ag-bar i").style.width = pct + "%"; };
  const moveTo = (i, id) => { const [badge, , color] = SESSIONS[i]; presence[badge] = Object.assign(presence[badge] || { x: null }, { to: id, color }); };
  const ROUTE = { 0: ["X-0002", "T-0013", "E-0002"], 1: ["T-0012", "A-0001", "E-0001"], 2: ["R-0001", "R-0002", "R-0003"], 3: ["X-0003", "T-0014", "X-0003"] };
  function settle() {
    t.clear(); fc.stop();
    SESSIONS.forEach(([, , , , , lines], i) => {
      cards[i].querySelector(".ag-log").replaceChildren();
      lines.slice(0, 4).forEach((l) => line(i, l));
      state(i, i === 1 ? "review" : "active", [60, 100, 70, 45][i]);
      moveTo(i, ROUTE[i][1]); presence[SESSIONS[i][0]].x = null;
    });
    fc.draw();
  }
  return {
    length: 10400,
    play() {
      running = true; t.clear();
      SESSIONS.forEach(([, , , , , lines], i) => {
        cards[i].querySelector(".ag-log").replaceChildren(); state(i, "queued", 0); moveTo(i, ROUTE[i][0]);
        const start = 250 + i * 380;
        t.add(start, () => state(i, "active", 6));
        lines.forEach((l, k) => t.add(start + 500 + k * (1300 + i * 120), () => { line(i, l); state(i, "active", Math.min(100, 20 + k * 20)); if (k % 2) moveTo(i, ROUTE[i][Math.min(2, (k + 1) >> 1)]); }));
      });
      t.add(8200, () => state(1, "review", 100));
      fc.start();
    },
    stop() { running = false; t.clear(); fc.stop(); },
    settle() { running = false; settle(); },
    resize() { fc.resize(); fc.view = null; fc.draw(); },
  };
}

// ------------------------------------------------------- scene 3: review
const REVIEW = [
  ["T-0012", ["Plot loss curves", "绘制损失曲线"], ["Curves for 3 seeds; no spike above 1.5x the mean.", "3 个种子的曲线，没有超过均值 1.5 倍的尖峰。"], "line"],
  ["E-0002", ["Loss within 0.02 at 5k steps", "5k 步时损失差在 0.02 内"], ["2.08 with warm-up, 2.10 without.", "有预热 2.08，无预热 2.10。"], "bars"],
  ["A-0001", ["Figure for section 4", "第 4 节配图"], ["loss-curves.png, both themes.", "loss-curves.png，浅色和深色各一版。"], "figure"],
  ["X-0003", ["Learning-rate sweep", "学习率扫描"], ["Two of three seeds finished; one diverged.", "3 个种子完成 2 个，1 个发散。"], "diverge"],
];
const THUMB_SVG = {
  line: '<svg viewBox="0 0 64 40"><polyline points="2,30 10,8 16,28 24,10 32,26 44,25 62,27" class="rv-l1"/><polyline points="2,33 20,31 40,29 62,29" class="rv-l2"/></svg>',
  bars: '<svg viewBox="0 0 64 40"><rect x="8" y="12" width="14" height="24" class="rv-b1"/><rect x="28" y="13" width="14" height="23" class="rv-b2"/><path d="M4 36H60" class="rv-ax"/></svg>',
  figure: '<svg viewBox="0 0 64 40"><rect x="3" y="3" width="58" height="34" rx="3" class="rv-fig"/><polyline points="8,30 18,18 26,24 38,10 56,14" class="rv-l1"/></svg>',
  diverge: '<svg viewBox="0 0 64 40"><polyline points="2,30 20,26 40,24 62,22" class="rv-l2"/><polyline points="2,31 20,27 34,20 46,9 54,3" class="rv-bad"/></svg>',
};
function reviewScene(pane) {
  pane.innerHTML = "";
  const wrapEl = h("div", { class: "rv ark-ui" });
  pane.append(wrapEl);
  let rows = [], note, typed = "";
  function render() {
    const head = h("div", { class: "rv-head" },
      h("h3", null, L("Needs you", "需要你处理"), h("span", { class: "needs-count rv-count" }, "4")),
      h("label", { class: "rv-all" }, h("span", { class: "rv-box" }), L("Select all", "全选")),
      h("span", { class: "btn sm primary rv-bulk" }, icon("check", "sm"), h("span", { class: "rv-bulk-t" }, L("Accept selected", "验收所选")), h("b", { class: "rv-n" }, "")));
    rows = REVIEW.map(([uid, title, excerpt, thumb]) => h("div", { class: "rv-row", "data-state": "" },
      h("span", { class: "rv-box" }),
      h("span", { class: "rv-thumb" }, svgEl(THUMB_SVG[thumb])),
      h("div", { class: "rv-main" },
        h("div", { class: "rv-line" }, h("span", { class: "needs-chip kind-review" }, L("Accept", "验收")), h("span", { class: "needs-uid" }, uid), h("b", null, L(...title))),
        h("div", { class: "rv-ex" }, L(...excerpt)),
        h("div", { class: "rv-note" }, h("span", { class: "rv-note-t" }), h("i", { class: "rv-caret" }))),
      h("div", { class: "rv-act" },
        h("span", { class: "rv-res rv-acc" }, icon("check", "sm"), L("Accepted", "已验收")),
        h("span", { class: "rv-res rv-back" }, L("Sent back", "已退回")),
        h("span", { class: "btn sm ghost rv-sb" }, L("Send back", "退回")))));
    wrapEl.replaceChildren(head, h("div", { class: "rv-list" }, rows));
    note = rows[3].querySelector(".rv-note-t");
  }
  render();
  const t = timersOf();
  let running = false;
  const count = () => {
    const open = rows.filter((r) => !/accepted|back/.test(r.dataset.state)).length;
    const sel = rows.filter((r) => r.dataset.state === "checked").length;
    wrapEl.querySelector(".rv-count").textContent = String(open);
    wrapEl.querySelector(".rv-n").textContent = sel ? ` (${sel})` : "";
  };
  const set = (i, s) => { rows[i].dataset.state = s; count(); };
  const NOTE = () => L("Rerun the diverged seed before accepting.", "先重跑发散的种子再验收。");
  function settle() {
    t.clear(); render();
    set(0, "accepted"); set(1, "accepted"); set(2, "checked");
    rows[3].dataset.state = "noting"; note.textContent = NOTE(); count();
  }
  refreshers.add(() => { render(); count(); if (!running) settle(); });
  return {
    length: 9800,
    play() {
      running = true; t.clear(); render(); count();
      [700, 1200, 1700].forEach((ms, i) => t.add(ms, () => set(i, "checked")));
      t.add(2600, () => wrapEl.querySelector(".rv-bulk").classList.add("pressing"));
      t.add(2900, () => { wrapEl.querySelector(".rv-bulk").classList.remove("pressing"); [0, 1, 2].forEach((i) => t.add(i * 260, () => set(i, "accepted"))); });
      t.add(4300, () => rows[3].querySelector(".rv-sb").classList.add("pressing"));
      t.add(4600, () => { rows[3].querySelector(".rv-sb").classList.remove("pressing"); set(3, "noting"); typed = ""; });
      const text = NOTE();
      [...text].forEach((ch, k) => t.add(4900 + k * 55, () => { typed += ch; note.textContent = typed; }));
      t.add(4900 + text.length * 55 + 700, () => set(3, "back"));
    },
    stop() { running = false; t.clear(); },
    settle() { running = false; settle(); },
    resize() {},
  };
}

// --------------------------------------------- scene 4: resources and GPUs
const JOBS = [
  ["J-31", "AA", "#facc15", ["warm-up sweep", "预热扫描"], 0, 2],
  ["J-32", "QP", "#22d3ee", ["baseline seed 2", "基线种子 2"], 2, 1],
  ["J-33", "RL", "#f472b6", ["LR sweep", "学习率扫描"], 4, 2],
  ["J-34", "AA", "#facc15", ["second-moment probe", "二阶矩探测"], 0, 1],
  ["J-35", "MY", "#60a5fa", ["ablation, 500 steps", "消融，500 步"], 3, 1],
];
function resourcesScene(pane) {
  pane.innerHTML = "";
  const graph = h("div", { class: "rq-graph" });
  const queue = h("div", { class: "rq-queue" });
  pane.append(graph, queue);
  const cells = Array.from({ length: 6 }, () => null);
  let jobs = [];
  function render() {
    const col = (title, items) => h("div", { class: "rq-col" }, h("div", { class: "rq-col-h" }, title), ...items);
    const item = (key, ic, label, sub) => h("div", { class: "rq-item", "data-k": key }, icon(ic, "sm"), h("div", null, h("b", null, label), sub ? h("span", null, sub) : null));
    const gpus = (key, label, from, n) => h("div", { class: "rq-item rq-gpu", "data-k": key }, icon("cpu", "sm"),
      h("div", null, h("b", null, label), h("span", { class: "rq-cells" }, Array.from({ length: n }, (_, k) => h("i", { "data-cell": String(from + k) })))));
    graph.replaceChildren(
      svgEl('<svg class="rq-links" aria-hidden="true"></svg>'),
      col(L("Members", "成员"), [item("m1", "user", "MY", L("owner", "负责人")), item("m2", "user", "RL", L("member", "成员")), item("m3", "user", "AA · QP", L("agents", "智能体"))]),
      col(L("Code and data", "代码与数据"), [item("c1", "git", "warmup-study", L("repository", "仓库")), item("c2", "database", "c4-subset", L("dataset", "数据集")), item("c3", "layers", "conda: warmup", L("environment", "环境"))]),
      col(L("Machines", "机器"), [item("d1", "monitor", "workstation", L("online", "在线")), item("d2", "database", "lab-ark", L("ARK server", "ARK 服务器"))]),
      col(L("GPU servers", "GPU 服务器"), [gpus("g1", "gpu-server-1", 0, 4), gpus("g2", "gpu-server-2", 4, 2)]));
    queue.replaceChildren(h("div", { class: "rq-q-h" }, h("span", null, L("GPU queue", "GPU 队列")), h("span", { class: "rq-q-n" })),
      h("div", { class: "rq-list" }, JOBS.map(([id, who, color, title]) => h("div", { class: "rq-job", "data-state": "queued", "data-id": id },
        h("span", { class: "mt-ag", style: `background:${color}` }, who),
        h("div", { class: "rq-job-m" }, h("b", null, L(...title)), h("span", null, id)),
        h("span", { class: "rq-st" }, h("i", { class: "s-q" }, L("Queued", "排队")), h("i", { class: "s-r" }, L("Running", "运行中")), h("i", { class: "s-d" }, L("Done", "完成")))))));
    jobs = [...queue.querySelectorAll(".rq-job")];
    paintCells(); requestAnimationFrame(links);
  }
  function links() {
    const svg = graph.querySelector(".rq-links"), box = graph.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`); svg.innerHTML = "";
    const pairs = [["m1", "c1"], ["m2", "c1"], ["m3", "c2"], ["c1", "d1"], ["c2", "d2"], ["c3", "d1"], ["d2", "g1"], ["d2", "g2"], ["c3", "g1"]];
    for (const [a, b] of pairs) {
      const ra = graph.querySelector(`[data-k="${a}"]`).getBoundingClientRect(), rb = graph.querySelector(`[data-k="${b}"]`).getBoundingClientRect();
      const x1 = ra.right - box.left, y1 = ra.top + ra.height / 2 - box.top, x2 = rb.left - box.left, y2 = rb.top + rb.height / 2 - box.top, mx = (x1 + x2) / 2;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`);
      svg.append(p);
    }
  }
  new ResizeObserver(links).observe(graph);
  function paintCells() {
    graph.querySelectorAll("[data-cell]").forEach((c) => {
      const owner = cells[+c.dataset.cell];
      c.style.background = owner ? owner : "";
      c.classList.toggle("on", !!owner);
    });
    const running = jobs.filter((j) => j.dataset.state === "running").length, queued = jobs.filter((j) => j.dataset.state === "queued").length;
    const n = queue.querySelector(".rq-q-n");
    if (n) n.textContent = L(`${running} running · ${queued} queued`, `${running} 个运行 · ${queued} 个排队`);
  }
  const jobState = (i, s) => {
    const [, , color, , from, n] = JOBS[i];
    jobs[i].dataset.state = s;
    for (let k = 0; k < n; k++) cells[from + k] = s === "running" ? color : null;
    paintCells();
  };
  const t = timersOf();
  let running = false;
  function settle() {
    t.clear(); cells.fill(null); render();
    jobState(0, "done"); jobState(1, "running"); jobState(2, "running"); jobState(3, "running"); jobState(4, "queued");
  }
  refreshers.add(() => { render(); if (!running) settle(); });
  render();
  return {
    length: 9800,
    play() {
      running = true; t.clear(); cells.fill(null); render();
      t.add(500, () => jobState(0, "running")); t.add(1100, () => jobState(1, "running")); t.add(1700, () => jobState(2, "running"));
      t.add(3800, () => jobState(0, "done")); t.add(4300, () => jobState(3, "running"));
      t.add(6000, () => jobState(1, "done")); t.add(6500, () => jobState(4, "running"));
      t.add(8200, () => jobState(2, "done"));
    },
    stop() { running = false; t.clear(); },
    settle() { running = false; settle(); },
    resize() { links(); },
  };
}

// ------------------------------------------- scene: import from InfoHub
// As on Research › Ideas: InfoHub's read-only graph on the left, the editable
// ARK graph on the right, both running ARK's force layout. The topic hub is
// grabbed and dragged across; its items trail on spring links; on drop they
// join the ARK simulation, spread out among the existing nodes, then link up
// and an agent picks them up. Topics are fictional.
const IH_HUB = ["Tactile sensing", "触觉感知"];
const IH_KIDS = [
  ["Tactile pretraining datasets", "触觉预训练数据集"], ["Slip detection in grasping", "抓取中的滑移检测"], ["Sim tactile rendering", "仿真触觉渲染"],
  ["Gel sensor wear", "凝胶传感器磨损"], ["Contact force estimation", "接触力估计"], ["Texture classification", "纹理分类"],
  ["Tactile-visual fusion", "触觉与视觉融合"], ["Calibration drift", "标定漂移"], ["In-hand pose tracking", "手内位姿跟踪"],
  ["Tactile policy learning", "触觉策略学习"], ["Low-cost sensor skins", "低成本电子皮肤"], ["Shear field imaging", "剪切场成像"],
];
// Other InfoHub topics (background): hub title and leaf count.
const IH_BG = [
  [["Locomotion", "足式运动"], 7], [["Benchmarks", "评测基准"], 6], [["Datasets", "数据集"], 8],
  [["Sim-to-real", "仿真到实机"], 6], [["Reading group", "读书会"], 5], [["Hardware notes", "硬件笔记"], 6],
];
const ARK_BASE = [
  ["q1", "question", "Does touch make grasping more reliable?", "触觉能让抓取更可靠吗？"],
  ["c1", "claim", "Slip is detectable before it happens", "滑移可以在发生前被检测"],
  ["x1", "experiment", "Grasp trials with gel sensors", "凝胶传感器抓取试验"],
  ["s1", "source", "Paper feed", "论文订阅"],
  ["c2", "claim", "Vision alone misses contact events", "仅靠视觉会漏掉接触事件"],
];
function infohubScene(pane) {
  pane.innerHTML = "";
  const panel = (cls) => h("div", { class: `ih-panel ${cls}` },
    h("div", { class: "ih-ph" }, h("div", null, h("b", { class: "ih-title" }), h("span", { class: "ih-sub" })), h("span", { class: "ih-count" })),
    h("div", { class: "ih-tools" }), h("div", { class: "ih-canvas" }),
    h("div", { class: "ih-legend" }), h("div", { class: "ih-stats" }));
  const left = panel("ih-left"), right = panel("ih-right");
  const over = h("canvas", { class: "ih-over", "aria-hidden": "true" });
  const toast = h("div", { class: "ih-toast" });
  pane.append(left, right, over, toast);
  const octx = over.getContext("2d");
  const IDEA = typeColor("idea"), BLUE = "#3b82f6";
  const pal = () => palette(pane);
  let agentTo = null, grabbed = false;
  const agent = { x: null, y: null };
  const ih = new ForceCanvas(left.querySelector(".ih-canvas"), { fitPad: 26, padTop: 30, padBottom: 24, arrows: false, jiggle: 0.05, labelCollide: true,
    fitFilter: (n) => n.cluster || n.bgHub,
    colorOf: (n) => (n.cluster ? (grabbed ? alpha(BLUE, 0.35) : BLUE) : alpha(pal().sub, n.bgHub ? 0.6 : 0.4)),
    edgeStyle: (e) => (e.cluster ? alpha(BLUE, grabbed ? 0.25 : 0.55) : alpha(pal().sub, 0.2)),
    radiusOf: (n) => (n.hub ? 11 : n.bgHub ? 6.5 : n.cluster ? 6 : 3.6),
    labelOf: (n) => (n.cluster || n.bgHub ? n.title : null),
    labelColorOf: (n, p) => (n.cluster && !grabbed ? p.ink : alpha(p.sub, 0.8)) });
  const ark = new ForceCanvas(right.querySelector(".ih-canvas"), { fitPad: 26, padTop: 36, padBottom: 26, labelCollide: true, jiggle: 0.03,
    colorOf: (n) => (n.base ? alpha(typeColor(n.type), 0.55) : typeColor(n.type)),
    radiusOf: (n) => (n.hub ? 11 : n.base ? 6.5 : 6),
    labelOf: (n) => n.title,
    labelColorOf: (n, p) => (n.base ? alpha(p.sub, 0.75) : p.ink),
    overlay: (ctx, view) => {
      if (!agentTo || !view.byId.get(agentTo)) return;
      const s = view.screen(view.byId.get(agentTo)), tx = s.x + 14, ty = s.y - 14;
      if (agent.x == null) { agent.x = tx; agent.y = ty; }
      agent.x += (tx - agent.x) * 0.1; agent.y += (ty - agent.y) * 0.1;
      ctx.beginPath(); ctx.arc(agent.x, agent.y, 10, 0, Math.PI * 2); ctx.fillStyle = "#a78bfa"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = view.pal.bg; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "700 9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("A1", agent.x, agent.y + 0.5);
    } });
  ark.cfg = { ...ark.cfg, distance: 52 };
  const tools = (readOnly) => h("div", { class: "ih-tb" },
    readOnly ? h("span", { class: "ih-tb-ro" }, L("READ ONLY", "只读")) : h("span", { class: "ih-tb-mode" }, h("i", null, L("Read", "阅读")), h("i", { class: "on" }, L("Edit", "编辑"))),
    h("span", { class: "ih-tb-sel" }, "Force", icon("chevron", "sm")), icon("link", "sm"), icon("search", "sm"), icon("fit", "sm"), icon("maximize", "sm"));
  function counts() {
    const ihN = ih.nodes.length, ihE = ih.edges.length;
    left.querySelector(".ih-count").textContent = String(ihN);
    left.querySelector(".ih-stats").textContent = L(`${ihN} nodes · ${ihE} links`, `${ihN} 个节点 · ${ihE} 条连接`);
    left.querySelector(".ih-legend").replaceChildren(h("span", { style: `--c:${IDEA}` }, L("Idea", "想法") + " " + ihN));
    const ideas = ark.nodes.filter((n) => n.type === "idea").length;
    right.querySelector(".ih-count").textContent = String(ark.nodes.length);
    right.querySelector(".ih-stats").textContent = L(`${ark.nodes.length} nodes · ${ark.edges.length} links`, `${ark.nodes.length} 个节点 · ${ark.edges.length} 条连接`);
    right.querySelector(".ih-legend").replaceChildren(
      ...(ideas ? [h("span", { style: `--c:${IDEA}` }, L("Idea", "想法") + " " + ideas)] : []),
      h("span", { style: `--c:${typeColor("question")}` }, L("Question", "问题") + " 1"), h("span", { style: `--c:${typeColor("claim")}` }, L("Claim", "论断") + " 2"));
  }
  function build() {
    grabbed = false; agentTo = null; agent.x = null; drag = null;
    left.querySelector(".ih-title").textContent = L("InfoHub graph", "InfoHub 图谱");
    left.querySelector(".ih-sub").textContent = L("Read-only source · drag or copy into ARK", "只读来源 · 拖动或复制到 ARK");
    right.querySelector(".ih-title").textContent = L("ARK graph", "ARK 图谱");
    right.querySelector(".ih-sub").textContent = L("The editable project graph · drop here", "可编辑的项目图谱 · 拖放到这里");
    left.querySelector(".ih-tools").replaceChildren(tools(true));
    right.querySelector(".ih-tools").replaceChildren(tools(false));
    const nodes = [], edges = [];
    IH_BG.forEach(([title, n], g) => {
      const hub = "bh" + g;
      nodes.push({ id: hub, type: "idea", status: "open", title: L(...title), bgHub: true });
      for (let i = 0; i < n; i++) { nodes.push({ id: `${hub}-${i}`, type: "idea", status: "open", title: "" }); edges.push({ source: `${hub}-${i}`, target: hub, relation: "part_of" }); }
      if (g) edges.push({ source: hub, target: "bh" + (g - 1 + (g % 2)), relation: "relates_to" });
    });
    nodes.push({ id: "ih-hub", type: "idea", status: "active", title: L(...IH_HUB), cluster: true, hub: true });
    IH_KIDS.forEach((k, i) => { nodes.push({ id: "ih" + i, type: "idea", status: "open", title: L(...k), cluster: true }); edges.push({ source: "ih" + i, target: "ih-hub", relation: "part_of", cluster: true }); });
    edges.push({ source: "ih-hub", target: "bh2", relation: "relates_to" });
    ih.set(nodes, edges); ih.settle(420);
    ark.set(ARK_BASE.map(([id, type, en, cn]) => ({ id, type, status: "open", title: L(en, cn), base: true })),
      [["c1", "q1"], ["x1", "c1"], ["c2", "q1"], ["s1", "c2"]].map(([a, b]) => ({ source: a, target: b, relation: "part_of" })));
    ark.settle(300);
    over.style.display = "none"; toast.classList.remove("on");
    toast.textContent = L(`Pasted ${IH_KIDS.length + 1} orphan nodes`, `已粘贴 ${IH_KIDS.length + 1} 个孤立节点`);
    counts(); ih.draw(); ark.draw();
  }
  // ---- the drag: the hub follows the pointer, items trail on springs.
  let drag = null, frame = 0;
  function sizeOver() {
    const r = pane.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    over.width = Math.round(r.width * dpr); over.height = Math.round(r.height * dpr);
    over.style.width = r.width + "px"; over.style.height = r.height + "px";
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  }
  const paneXY = (fc, el, n) => { const s = fc.screen(n), r = el.getBoundingClientRect(), p = pane.getBoundingClientRect(); return { x: s.x + r.left - p.left, y: s.y + r.top - p.top }; };
  function grab() {
    const p = sizeOver(), el = left.querySelector(".ih-canvas");
    const items = ["ih-hub", ...IH_KIDS.map((_, i) => "ih" + i)].map((id) => {
      const n = ih.byId.get(id), q = paneXY(ih, el, n);
      return { id, title: n.title, hub: !!n.hub, x: q.x, y: q.y, vx: 0, vy: 0 };
    });
    const rr = right.querySelector(".ih-canvas").getBoundingClientRect();
    const from = { x: items[0].x, y: items[0].y }, to = { x: rr.left - p.left + rr.width * 0.72, y: rr.top - p.top + rr.height * 0.66 };
    drag = { items, from, to, t0: performance.now(), dur: 2100 };
    grabbed = true;
    // The source graph feels the pull: nearby nodes are nudged toward the pointer.
    const hub = ih.byId.get("ih-hub");
    for (const n of ih.nodes) if (!n.cluster) { const dx = hub.x - n.x, dy = hub.y - n.y, d = Math.hypot(dx, dy) || 1; if (d < 160) { n.vx += dx / d * 1.6; n.vy += dy / d * 1.6; } }
    over.style.display = "block";
    cancelAnimationFrame(frame); frame = requestAnimationFrame(stepDrag);
  }
  function stepDrag(now) {
    if (!drag) return;
    const u = Math.min(1, (now - drag.t0) / drag.dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const hub = drag.items[0];
    hub.x = drag.from.x + (drag.to.x - drag.from.x) * e;
    hub.y = drag.from.y + (drag.to.y - drag.from.y) * e - Math.sin(e * Math.PI) * 36;
    const kids = drag.items.slice(1);
    for (const a of kids) {
      const dx = hub.x - a.x, dy = hub.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 44) * 0.018;
      a.vx += dx / d * f; a.vy += dy / d * f;
      for (const b of kids) if (b !== a) { const ex = a.x - b.x, ey = a.y - b.y, d2 = Math.max(80, ex * ex + ey * ey); a.vx += ex / d2 * 9; a.vy += ey / d2 * 9; }
    }
    for (const a of kids) { a.vx *= 0.86; a.vy *= 0.86; a.x += a.vx; a.y += a.vy; }
    const p = pal(), r = over.getBoundingClientRect();
    octx.clearRect(0, 0, r.width, r.height);
    octx.strokeStyle = alpha(BLUE, 0.55); octx.lineWidth = 1.2;
    for (const a of kids) { octx.beginPath(); octx.moveTo(hub.x, hub.y); octx.lineTo(a.x, a.y); octx.stroke(); }
    for (const a of kids) drawForceNode(octx, { status: "open" }, a.x, a.y, 6, BLUE, p.bg);
    drawForceNode(octx, { status: "active" }, hub.x, hub.y, 11, BLUE, p.bg);
    octx.font = "600 11px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif"; octx.textAlign = "center"; octx.textBaseline = "top";
    octx.lineWidth = 3; octx.strokeStyle = alpha(p.bg, 0.85); octx.strokeText(hub.title, hub.x, hub.y + 14); octx.fillStyle = p.ink; octx.fillText(hub.title, hub.x, hub.y + 14);
    // Pointer on the hub.
    octx.save(); octx.translate(hub.x + 5, hub.y + 4); octx.beginPath();
    octx.moveTo(0, 0); octx.lineTo(0, 15); octx.lineTo(4, 11); octx.lineTo(7.5, 18); octx.lineTo(10, 17); octx.lineTo(6.5, 10); octx.lineTo(12, 10); octx.closePath();
    octx.fillStyle = p.ink; octx.strokeStyle = p.bg; octx.lineWidth = 1.2; octx.fill(); octx.stroke(); octx.restore();
    if (u < 1 || now - drag.t0 < drag.dur + 350) frame = requestAnimationFrame(stepDrag);
  }
  function drop(animated) {
    const el = right.querySelector(".ih-canvas"), rr = el.getBoundingClientRect(), p = pane.getBoundingClientRect(), v = ark.view;
    const toWorld = (q) => ({ x: (q.x - (rr.left - p.left) - v.x) / v.z, y: (q.y - (rr.top - p.top) - v.y) / v.z });
    const items = drag ? drag.items : null;
    const add = (id, title, hub, i) => {
      const n = { id, type: "idea", status: "inbox", title, hub };
      ark.add(n, []);
      if (items) { const w = toWorld(items[i]); n.x = w.x; n.y = w.y; }
      else { const a = i / IH_KIDS.length * Math.PI * 2; n.x = 160 + Math.cos(a) * 30; n.y = 120 + Math.sin(a) * 30; }
      n.vx = (Math.random() - 0.5) * 3; n.vy = (Math.random() - 0.5) * 3;
    };
    add("ark-hub", L(...IH_HUB), true, 0);
    IH_KIDS.forEach((k, i) => add("ak" + i, L(...k), false, i + 1));
    drag = null; cancelAnimationFrame(frame); over.style.display = "none"; grabbed = false;
    ark.idle = 0; counts();
  }
  const linkUp = (animated) => {
    const born = animated ? performance.now() : null;
    IH_KIDS.forEach((_, i) => ark.edges.push({ source: "ak" + i, target: "ark-hub", relation: "part_of", born }));
    for (const n of ark.nodes) n.degree = ark.edges.filter((e) => e.source === n.id || e.target === n.id).length;
    ark.idle = 0; counts();
  };
  const linkProject = (animated) => { ark.edges.push({ source: "ark-hub", target: "q1", relation: "relates_to", born: animated ? performance.now() : null }); ark.idle = 0; counts(); };
  const t = timersOf();
  let running = false;
  build();
  refreshers.add(() => { build(); if (!running) settle(); });
  function settle() {
    t.clear(); ih.stop(); ark.stop(); build();
    drop(false); linkUp(false); linkProject(false);
    ark.settle(360); ark.fit(true);
    agentTo = "ark-hub"; counts();
    ih.draw(); ark.draw();
  }
  return {
    length: 12000,
    play() {
      running = true; t.clear(); build(); ih.start(); ark.start();
      t.add(1200, grab);
      t.add(1200 + 2400, () => drop(true));
      t.add(4000, () => toast.classList.add("on"));
      t.add(5300, () => linkUp(true));
      t.add(6800, () => { toast.classList.remove("on"); linkProject(true); });
      t.add(7800, () => { agentTo = "ark-hub"; });
      t.add(9600, () => { agentTo = "ak1"; });
    },
    stop() { running = false; t.clear(); ih.stop(); ark.stop(); cancelAnimationFrame(frame); },
    settle() { running = false; settle(); },
    resize() { ih.resize(); ih.view = null; ark.resize(); ark.view = null; ih.draw(); ark.draw(); },
  };
}

// ---------------------------------------------------------- the player
if (hero) {
  const SCENES = [
    { key: "map", tab: "map", name: ["Research map", "研究地图"], build: mapScene },
    { key: "infohub", tab: "research", name: ["Import from InfoHub", "想法导入"], build: infohubScene },
    { key: "agents", tab: "execute", name: ["Agents in parallel", "智能体并行"], build: agentsScene },
    { key: "review", tab: "home", name: ["Review", "审阅"], build: reviewScene },
    { key: "resources", tab: "execute", name: ["Resources and GPUs", "资源与算力"], build: resourcesScene },
  ];
  const panes = [...hero.querySelectorAll(".scene-pane")];
  const nav = document.querySelector(".scene-nav");
  const built = [];
  const sceneAt = (i) => built[i] || (built[i] = SCENES[i].build(panes[i]));
  let index = 0, running = false, paused = false, visible = true;
  const t = timersOf();
  function renderNav() {
    nav.replaceChildren(...SCENES.map((s, i) => h("button", { type: "button", class: "scene-dot", "aria-pressed": String(i === index) }, h("i"), h("span", null, L(...s.name)))));
    [...nav.children].forEach((b, i) => b.addEventListener("click", () => show(i, true)));
  }
  function tabs() {
    hero.querySelectorAll(".mock-tab").forEach((tab) => tab.classList.toggle("on", tab.dataset.tab === SCENES[index].tab));
  }
  function startCurrent() {
    t.clear();
    const s = sceneAt(index);
    if (running) { s.play(); t.add(s.length, () => show(index + 1)); } else s.settle();
  }
  function show(i, manual = false) {
    const prev = index;
    index = (i + SCENES.length) % SCENES.length;
    if (built[prev] && prev !== index) built[prev].stop();
    panes.forEach((p, k) => p.classList.toggle("on", k === index));
    sceneAt(index).resize();
    renderNav(); tabs();
    startCurrent();
    if (manual && !running) sceneAt(index).settle();
  }
  function update() {
    const go = visible && !document.hidden && !reduceMotion() && !paused;
    if (go && !running) { running = true; hero.classList.remove("static"); startCurrent(); }
    else if (!go && running) { running = false; t.clear(); sceneAt(index).stop(); sceneAt(index).settle(); }
  }
  // Hover never pauses; keyboard focus in the switcher does.
  nav.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) { paused = true; update(); } });
  nav.addEventListener("focusout", (e) => { if (!nav.contains(e.relatedTarget)) { paused = false; update(); } });
  refreshers.add(renderNav);
  if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; update(); }, { threshold: 0.1 }).observe(hero);
  document.addEventListener("visibilitychange", update);
  show(0);
  if (reduceMotion()) hero.classList.add("static");
  update();
}

// ------------------------------------------------------- feature thumbnails
// Small vector pictures built from ARK's own pieces: node glyphs in ARK's type
// colours, node cards with a type bar, task bars, agent badges, GPU meters.
const TC = (t) => typeColor(t);
const node = (x, y, type, r = 7) => `<circle cx="${x}" cy="${y}" r="${r + 3}" class="t-halo" style="fill:${TC(type)}"/><circle cx="${x}" cy="${y}" r="${r}" style="fill:${TC(type)}"/>`;
const line = (x1, y1, x2, y2, dash = false) => `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" class="t-edge${dash ? " dash" : ""}"/>`;
const card = (x, y, w, type, lines = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${14 + lines * 8}" rx="5" class="t-card"/><rect x="${x}" y="${y}" width="3.5" height="${14 + lines * 8}" rx="1.5" style="fill:${TC(type)}"/>` +
  Array.from({ length: lines }, (_, i) => `<rect x="${x + 9}" y="${y + 7 + i * 8}" width="${(w - 22) * (i ? 0.6 : 1)}" height="4" rx="2" class="t-text"/>`).join("");
const badge = (x, y, text, color) => `<circle cx="${x}" cy="${y}" r="9" style="fill:${color}"/><text x="${x}" y="${y + 3}" class="t-badge">${text}</text>`;
const bar = (x, y, w, pct, cls = "t-fill") => `<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" class="t-track"/><rect x="${x}" y="${y}" width="${w * pct}" height="5" rx="2.5" class="${cls}"/>`;
const chip = (x, y, text) => `<rect x="${x}" y="${y - 8}" width="${text.length * 5.6 + 10}" height="13" rx="3" class="t-chip"/><text x="${x + 5}" y="${y + 1.5}" class="t-mono">${text}</text>`;
const THUMBS = {
  map: () => line(40, 60, 92, 34) + line(40, 60, 92, 86) + line(92, 34, 148, 26) + line(92, 34, 148, 58) + line(92, 86, 148, 92) + line(148, 26, 200, 40) + line(148, 58, 200, 40, true) +
    node(40, 60, "question", 8) + node(92, 34, "claim") + node(92, 86, "claim") + node(148, 26, "experiment") + node(148, 58, "related_work", 6) + node(148, 92, "experiment") + node(200, 40, "evidence"),
  topic: () => card(24, 18, 92, "story", 1) + line(116, 29, 132, 29) + card(132, 14, 84, "claim") + line(116, 29, 132, 57) + card(132, 46, 84, "experiment") + line(116, 29, 132, 89) + card(132, 78, 84, "evidence"),
  api: () => `<rect x="22" y="16" width="148" height="88" rx="8" class="t-term"/>` +
    [["GET", "/context", 40], ["POST", "/units", 62], ["POST", "/media", 84]].map(([m, pth, y]) => `<text x="34" y="${y}" class="t-mono t-acc">${m}</text><text x="70" y="${y}" class="t-mono t-term-ink">${pth}</text>`).join("") +
    badge(196, 40, "A1", "#a78bfa") + `<path d="M186 46 L172 54" class="t-edge"/>` + card(178, 62, 46, "task"),
  sessions: () => [["CX", "#60a5fa", 0.85, 26], ["CL", "#f97316", 0.55, 60], ["DS", "#22d3ee", 0.3, 94]].map(([n, c, p, y]) =>
    badge(36, y, n, c) + `<rect x="54" y="${y - 6}" width="70" height="4" rx="2" class="t-text"/>` + bar(54, y + 2, 160, p)).join(""),
  setup: () => [["REPO", 28], ["ENV", 60], ["DATA", 92]].map(([t, y]) => chip(26, y, t) + `<rect x="78" y="${y - 3}" width="${t === "ENV" ? 96 : 128}" height="5" rx="2.5" class="t-text"/><circle cx="214" cy="${y - 0.5}" r="4" class="t-ok"/>`).join(""),
  gpu: () => [[0.92, "t-ours"], [0.88, "t-ours"], [0.64, "t-other"], [0.04, "t-fill"]].map(([p, c], i) =>
    `<text x="26" y="${30 + i * 22}" class="t-mono">GPU ${i}</text>` + bar(64, 25 + i * 22, 150, p, c)).join(""),
  resources: () => line(76, 60, 120, 34) + line(76, 60, 120, 86) +
    `<rect x="18" y="42" width="58" height="36" rx="6" class="t-card"/><rect x="120" y="16" width="100" height="36" rx="6" class="t-card"/><rect x="120" y="68" width="100" height="36" rx="6" class="t-card"/>` +
    `<circle cx="28" cy="52" r="3.5" class="t-ok"/><circle cx="130" cy="26" r="3.5" class="t-ok"/><circle cx="130" cy="78" r="3.5" class="t-ok"/>` +
    `<rect x="36" y="49" width="32" height="5" rx="2.5" class="t-text"/>` + bar(130, 37, 80, 0.9, "t-ours") + bar(130, 89, 80, 0.45, "t-fill"),
  home: () => [["24", "t-acc", 18], ["2", "t-warn", 90], ["7", "t-acc", 162]].map(([v, c, x]) =>
    `<rect x="${x}" y="16" width="62" height="44" rx="7" class="t-card"/><rect x="${x + 8}" y="25" width="30" height="4" rx="2" class="t-text"/><text x="${x + 8}" y="51" class="t-num ${c}">${v}</text>`).join("") +
    [[0.5, 0.2, 0.1], [0.3, 0.3, 0.2]].map(([a, b, c], i) => `<rect x="18" y="${74 + i * 16}" width="206" height="6" rx="3" class="t-track"/><rect x="18" y="${74 + i * 16}" width="${206 * a}" height="6" rx="3" class="t-done"/><rect x="${18 + 206 * a}" y="${74 + i * 16}" width="${206 * b}" height="6" class="t-fill"/><rect x="${18 + 206 * (a + b)}" y="${74 + i * 16}" width="${206 * c}" height="6" class="t-rev"/>`).join(""),
  access: () => [["MY", "#60a5fa", "owner", 28], ["RL", "#f472b6", "member", 60], ["A1", "#a78bfa", "agent", 92]].map(([n, c, r, y]) =>
    badge(36, y, n, c) + `<rect x="54" y="${y - 3}" width="64" height="5" rx="2.5" class="t-text"/>` + chip(150, y, r)).join(""),
  server: () => `<rect x="22" y="18" width="196" height="84" rx="8" class="t-term"/><text x="34" y="42" class="t-mono t-term-ink">$ ark-server serve</text>` +
    `<circle cx="38" cy="64" r="4" class="t-ok"/><text x="48" y="67" class="t-mono t-term-ink">https · sign-in</text><circle cx="38" cy="86" r="4" class="t-ok"/><text x="48" y="89" class="t-mono t-term-ink">sqlite · systemd</text>`,
  apps: () => `<rect x="22" y="18" width="128" height="80" rx="7" class="t-card"/><rect x="22" y="18" width="128" height="12" rx="6" class="t-track"/>` +
    line(46, 70, 76, 52) + line(76, 52, 110, 70) + node(46, 70, "question", 5) + node(76, 52, "claim", 5) + node(110, 70, "evidence", 5) +
    `<rect x="166" y="14" width="52" height="92" rx="9" class="t-card"/>` + node(184, 46, "claim", 4) + node(202, 62, "evidence", 4) + line(184, 46, 202, 62) + `<rect x="176" y="80" width="32" height="10" rx="3" class="t-fill"/>`,
  plugins: () => [[22, 16], [122, 16], [22, 64]].map(([x, y]) => `<rect x="${x}" y="${y}" width="94" height="40" rx="6" class="t-card"/><rect x="${x + 10}" y="${y + 11}" width="46" height="5" rx="2.5" class="t-text"/><rect x="${x + 10}" y="${y + 22}" width="66" height="4" rx="2" class="t-track"/>`).join("") +
    `<rect x="122" y="64" width="94" height="40" rx="6" class="t-dashed"/><path d="M169 76 v16 M161 84 h16" class="t-plus"/>`,
};
document.querySelectorAll(".fthumb[data-thumb]").forEach((el) => {
  const draw = THUMBS[el.getAttribute("data-thumb")];
  if (draw) el.innerHTML = `<svg viewBox="0 0 240 120" preserveAspectRatio="xMidYMid meet">${draw()}</svg>`;
});
