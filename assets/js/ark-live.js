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
  constructor(host, { labels = true, minLabelDegree = 0, overlay = null, fitPad = 40, insetRight = null } = {}) {
    this.host = host;
    this.canvas = h("canvas", { "aria-hidden": "true" });
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.nodes = []; this.edges = []; this.byId = new Map();
    this.labels = labels; this.minLabelDegree = minLabelDegree; this.overlay = overlay; this.fitPad = fitPad; this.insetRight = insetRight;
    this.view = null; this.running = false; this.visible = false; this.idle = 0;
    this.cfg = { ...GRAPH_DEFAULTS, distance: 46 };
    this.pal = palette(host);
    new ResizeObserver(() => this.resize()).observe(host);
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
    nodes.forEach((n, i) => { if (!n.x && !n.y) { const a = i * 2.399963; const r = 18 * Math.sqrt(i + 1); n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; } });
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
    for (const n of this.nodes) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const pad = this.fitPad, right = this.insetRight ? this.insetRight(this.w) : 0, W = this.w - right;
    const z = Math.min(1.5, (W - pad * 2) / Math.max(120, x1 - x0), (this.h - pad * 2) / Math.max(120, y1 - y0));
    const target = { z, x: W / 2 - ((x0 + x1) / 2) * z, y: this.h / 2 - ((y0 + y1) / 2) * z };
    if (!this.view || immediate) this.view = target;
    else for (const k of ["z", "x", "y"]) this.view[k] += (target[k] - this.view[k]) * 0.08;
  }
  screen(n) { return { x: n.x * this.view.z + this.view.x, y: n.y * this.view.z + this.view.y }; }
  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      if (this.idle < 600) { stepForce(this.nodes, this.edges, this.byId, this.cfg, null); this.idle++; }
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
    ctx.lineWidth = 1.2;
    for (const e of this.edges) {
      const a = this.byId.get(e.source), b = this.byId.get(e.target);
      if (!a || !b) continue;
      const p = this.screen(a), q = this.screen(b);
      const k = grow(e.born);
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const rb = forceNodeRadius(b, z, true) + 2;
      const ex = p.x + dx * k - ux * (k === 1 ? rb : 0), ey = p.y + dy * k - uy * (k === 1 ? rb : 0);
      ctx.strokeStyle = alpha(pal.sub, e.relation === "part_of" ? 0.42 : 0.3);
      ctx.setLineDash(e.relation === "part_of" ? [] : [4, 4]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
      if (k === 1 && len > 30) addArrowhead(heads, ex, ey, ux, uy, arrowSize(1.2, z), "triangle");
    }
    ctx.setLineDash([]);
    paintArrowheads(ctx, heads, "triangle", alpha(pal.sub, 0.55), pal.bg);
    ctx.font = "600 11px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const n of this.nodes) {
      const s = this.screen(n), k = grow(n.born);
      const r = forceNodeRadius(n, z, true) * (0.4 + 0.6 * k);
      ctx.globalAlpha = k;
      drawForceNode(ctx, n, s.x, s.y, r, typeColor(n.type), pal.bg);
      if (this.labels && (n.degree || 0) >= this.minLabelDegree) {
        const max = zh() ? 12 : 24, text = n.title.length > max ? n.title.slice(0, max - 1) + "…" : n.title;
        ctx.lineWidth = 3; ctx.strokeStyle = alpha(pal.bg, 0.85); ctx.lineJoin = "round";
        ctx.strokeText(text, s.x, s.y + r + 3);
        ctx.fillStyle = pal.ink; ctx.fillText(text, s.x, s.y + r + 3);
      }
      ctx.globalAlpha = 1;
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
// A carousel of small fictional projects. Each scene lays its map out in
// columns (question → claims → work → results), so the structure reads at a
// glance; nodes use ARK's node painter (drawForceNode, typeColor). Agents move
// between nodes, tasks go queued → active → review → done and a result arrives
// in ARK's Needs-you row. Scenes cross-fade; the dots switch them; hover or
// focus pauses; reduced motion shows a settled frame per scene.
const SCENES = [
  {
    key: "ml", name: ["Training study", "训练研究"], project: ["Warm-up study", "预热研究"],
    cols: [["Question", "问题"], ["Claims", "论断"], ["Experiments", "实验"], ["Results", "结果"]],
    nodes: [
      ["Q", "question", 0, 1.5, "Does warm-up stop loss spikes?", "预热能消除损失尖峰吗？"],
      ["C1", "claim", 1, 0.8, "Warm-up removes early spikes", "预热消除早期尖峰"],
      ["C2", "claim", 1, 2.2, "Final loss is unchanged", "最终损失不变"],
      ["X1", "experiment", 2, 0.8, "Warm-up sweep", "预热扫描"],
      ["X2", "experiment", 2, 2.2, "Baseline, 3 seeds", "基线，3 个种子"],
      ["R1", "evidence", 3, 0.8, "No spikes in 3 seeds", "3 个种子均无尖峰"],
      ["R2", "evidence", 3, 2.2, "Loss within 0.02", "损失差在 0.02 内"],
    ],
    edges: [["Q", "C1"], ["Q", "C2"], ["C1", "X1"], ["C2", "X2"], ["X1", "R1"], ["X2", "R2"]],
    agents: [["A1", "#a78bfa"], ["A2", "#f472b6"]],
    tasks: [["T-0011", "Run warm-up sweep", "运行预热扫描", "A1", "X1", "R1"], ["T-0013", "Rerun baseline", "重跑基线", "A2", "X2", "R2"], ["T-0012", "Plot loss curves", "绘制损失曲线", "A1", null, null]],
    res: ["gpu-server-1", ["4 GPUs", "4 块 GPU"], ["GPU 0", "GPU 1", "GPU 2", "GPU 3"]],
    needs: ["R-0001", "No spikes in 3 seeds", "3 个种子均无尖峰", "500-step warm-up: no step above 1.5x the running mean.", "500 步预热：没有超过滑动均值 1.5 倍的步。"],
  },
  {
    key: "robot", name: ["Robotics", "机器人"], project: ["Sim-to-real walking", "仿真到实机行走"],
    cols: [["Question", "问题"], ["Claims", "论断"], ["Experiments", "实验"], ["Results", "结果"]],
    nodes: [
      ["Q", "question", 0, 1.5, "Does the sim policy walk on hardware?", "仿真策略能在实机上行走吗？"],
      ["C1", "claim", 1, 0.8, "Randomized dynamics close the gap", "动力学随机化缩小差距"],
      ["C2", "claim", 1, 2.2, "Control loop stays under 20 ms", "控制回路低于 20 ms"],
      ["X1", "experiment", 2, 0.8, "Train in sim, 4k envs", "仿真训练，4k 环境"],
      ["X2", "experiment", 2, 2.2, "Trial on humanoid-01", "humanoid-01 实机试验"],
      ["R1", "evidence", 3, 0.8, "Walks 50 m, 2 falls", "行走 50 米，摔倒 2 次"],
      ["R2", "evidence", 3, 2.2, "Loop latency 14 ms", "回路延迟 14 ms"],
    ],
    edges: [["Q", "C1"], ["Q", "C2"], ["C1", "X1"], ["C2", "X2"], ["X1", "R1"], ["X2", "R2"]],
    agents: [["A1", "#a78bfa"], ["A2", "#f472b6"]],
    tasks: [["T-0021", "Train policy in sim", "仿真训练策略", "A1", "X1", "R1"], ["T-0022", "Deploy to humanoid-01", "部署到 humanoid-01", "A2", "X2", "R2"], ["T-0023", "Record trial video", "录制试验视频", "A2", null, null]],
    res: ["humanoid-01", ["robot · lab", "机器人 · 实验室"], ["robot", "GPU 0", "GPU 1", "camera"]],
    needs: ["R-0021", "Hardware trial: walks 50 m", "实机试验：行走 50 米", "Two falls on the turn. Video and joint logs attached.", "转弯处摔倒两次，已附视频和关节日志。"],
  },
  {
    key: "paper", name: ["Paper writing", "论文写作"], project: ["Workshop paper", "研讨会论文"],
    cols: [["Question", "问题"], ["Claims", "论断"], ["Related work", "相关工作"], ["Sections", "章节"]],
    nodes: [
      ["Q", "question", 0, 1.5, "What should the paper claim?", "论文要主张什么？"],
      ["C1", "claim", 1, 0.8, "Warm-up removes early spikes", "预热消除早期尖峰"],
      ["C2", "claim", 1, 2.2, "It costs one extra setting", "只多一个超参数"],
      ["W1", "related_work", 2, 0.8, "Goyal et al. 2017", "Goyal 等 2017"],
      ["W2", "related_work", 2, 2.2, "Liu et al. 2020", "Liu 等 2020"],
      ["S1", "production", 3, 0.8, "Introduction", "引言"],
      ["S2", "production", 3, 2.2, "Method and results", "方法与结果"],
    ],
    edges: [["Q", "C1"], ["Q", "C2"], ["C1", "W1"], ["C2", "W2"], ["W1", "S1"], ["W2", "S2"]],
    agents: [["WR", "#22d3ee"], ["RV", "#f59e0b"]],
    tasks: [["T-0031", "Summarise related work", "整理相关工作", "WR", "W1", "S1"], ["T-0032", "Check citations", "核对引用", "RV", "W2", "S2"], ["T-0033", "Draft introduction", "撰写引言", "WR", null, null]],
    res: ["paper repo", ["main.tex", "main.tex"], ["intro", "method", "results", "refs"]],
    needs: ["S-0001", "Introduction draft, 2 pages", "引言初稿，2 页", "Gap, method, result in three paragraphs. 14 citations checked.", "三段写清缺口、方法和结果，已核对 14 条引用。"],
  },
  {
    key: "code", name: ["Agent team", "智能体团队"], project: ["Release 2.1", "2.1 版本"],
    cols: [["Goal", "目标"], ["Features", "功能"], ["Tasks", "任务"], ["Reviews", "审阅"]],
    nodes: [
      ["G", "milestone", 0, 1.5, "Ship release 2.1", "发布 2.1 版本"],
      ["F1", "idea", 1, 0.8, "Topic canvas", "主题画布"],
      ["F2", "idea", 1, 2.2, "Project export", "项目导出"],
      ["T1", "task", 2, 0.8, "Canvas layout", "画布布局"],
      ["T2", "task", 2, 2.2, "Export dialog", "导出对话框"],
      ["V1", "evidence", 3, 0.8, "PR #212 checks pass", "PR #212 检查通过"],
      ["V2", "evidence", 3, 2.2, "PR #214 checks pass", "PR #214 检查通过"],
    ],
    edges: [["G", "F1"], ["G", "F2"], ["F1", "T1"], ["F2", "T2"], ["T1", "V1"], ["T2", "V2"]],
    agents: [["CX", "#60a5fa"], ["CL", "#f97316"]],
    tasks: [["T-0051", "Canvas layout", "画布布局", "CX", "T1", "V1"], ["T-0052", "Export dialog", "导出对话框", "CL", "T2", "V2"], ["T-0053", "Release notes", "发布说明", "CL", null, null]],
    res: ["ci-runner", ["4 jobs", "4 个作业"], ["lint", "unit", "e2e", "build"]],
    needs: ["V-0212", "PR #212: canvas layout", "PR #212：画布布局", "All 46 checks pass. Screenshots of both themes attached.", "46 项检查全部通过，已附浅色和深色截图。"],
  },
];

class SceneMap {
  constructor(host) {
    this.host = host;
    this.canvas = h("canvas", { "aria-hidden": "true" });
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.scene = null; this.shown = new Map(); this.links = new Map(); this.agents = {}; this.done = new Set();
    this.pal = palette(host);
    new ResizeObserver(() => this.resize()).observe(host);
    refreshers.add(() => { this.pal = palette(host); this.draw(); });
    this.resize();
  }
  resize() {
    const r = this.host.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
    this.draw();
  }
  set(scene) { this.scene = scene; this.shown.clear(); this.links.clear(); this.agents = {}; this.done.clear(); this.draw(); }
  // Screen position of a node: columns spread across the width, rows in the
  // band above the Needs-you card.
  pos(node) {
    const cols = this.scene.cols.length, colW0 = this.w / cols, padX = Math.min(90, colW0 / 2);
    const top = 50, bottom = this.h * (this.w > 640 ? 0.45 : 0.5);
    const colW = (this.w - padX * 2) / (cols - 1);
    const rowH = (this.h - top - bottom) / 3;
    return { x: padX + node[2] * colW, y: top + node[3] * rowH, colW: Math.min(colW, padX * 2) };
  }
  show(id) { this.shown.set(id, performance.now()); }
  link(a, b) { this.links.set(a + ">" + b, performance.now()); }
  agentTo(name, id) {
    const a = this.agents[name] || (this.agents[name] = { x: null, y: null });
    a.to = id;
  }
  draw(now = performance.now(), settled = false) {
    const { ctx, pal, scene } = this;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!scene) return;
    const grow = (t) => (settled || t == null ? 1 : Math.min(1, (now - t) / 420));
    const byId = new Map(scene.nodes.map((n) => [n[0], n]));
    // Column headings.
    ctx.font = "700 10px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = alpha(pal.sub, 0.8);
    scene.cols.forEach((c, i) => {
      const p = this.pos([null, null, i, 0]);
      ctx.fillText(L(...c).toUpperCase(), p.x, 16);
    });
    // Links: smooth left-to-right curves that draw in.
    ctx.lineWidth = 1.4;
    for (const [key, t] of this.links) {
      const [a, b] = key.split(">"), pa = this.pos(byId.get(a)), pb = this.pos(byId.get(b)), k = grow(t);
      const mx = (pa.x + pb.x) / 2;
      ctx.strokeStyle = alpha(pal.sub, 0.45);
      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps * k; i++) {
        const u = i / steps, v = 1 - u;
        const x = v * v * v * pa.x + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * pb.x;
        const y = v * v * v * pa.y + 3 * v * v * u * pa.y + 3 * v * u * u * pb.y + u * u * u * pb.y;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Nodes with wrapped labels that stay inside their column.
    for (const [id, t] of this.shown) {
      const n = byId.get(id), p = this.pos(n), k = grow(t);
      const status = this.done.has(id) ? "done" : n[1] === "question" || n[1] === "milestone" ? "active" : "open";
      ctx.globalAlpha = k;
      drawForceNode(ctx, { status }, p.x, p.y, 11 * (0.5 + 0.5 * k), typeColor(n[1]), pal.bg);
      ctx.font = "600 11.5px system-ui, 'Segoe UI', 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrap(ctx, L(n[4], n[5]), Math.min(150, p.colW - 10), 2);
      lines.forEach((line, i) => {
        ctx.lineWidth = 3; ctx.strokeStyle = alpha(pal.bg, 0.9); ctx.lineJoin = "round";
        ctx.strokeText(line, p.x, p.y + 16 + i * 14);
        ctx.fillStyle = pal.ink; ctx.fillText(line, p.x, p.y + 16 + i * 14);
      });
      ctx.globalAlpha = 1;
    }
    // Agent badges glide to their node.
    const colors = Object.fromEntries(scene.agents);
    for (const [name, a] of Object.entries(this.agents)) {
      if (!a.to || !this.shown.has(a.to)) continue;
      const p = this.pos(byId.get(a.to)), tx = p.x + 13, ty = p.y - 13;
      if (a.x == null || settled) { a.x = tx; a.y = ty; }
      a.x += (tx - a.x) * 0.1; a.y += (ty - a.y) * 0.1;
      ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fillStyle = colors[name]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = pal.bg; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "700 8.5px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(name, a.x, a.y + 0.5);
    }
  }
}

const hero = document.getElementById("mock");
if (hero) {
  const map = new SceneMap(hero.querySelector(".mock-map-canvas"));
  const needsHost = hero.querySelector(".mock-needs");
  const list = hero.querySelector(".ms-list");
  const nav = document.querySelector(".scene-nav");
  let index = 0, scene = SCENES[0], timers = [], frame = 0, running = false, paused = false, visible = true;
  const st = (en, cn) => h("i", { class: "s-" + en.toLowerCase() }, L(en, cn));
  function renderSide() {
    hero.querySelector(".mock-proj-name").textContent = L(...scene.project);
    hero.querySelector(".mock-live-text").textContent = L(`${scene.agents.length} agents running`, `${scene.agents.length} 个智能体运行中`);
    hero.querySelector(".mock-legend").replaceChildren(...[...new Set(scene.nodes.map((n) => n[1]))]
      .map((type) => h("span", { style: `--c:${typeColor(type)}` }, L(...TYPES[type] || [type, type]))));
    const colors = Object.fromEntries(scene.agents);
    list.replaceChildren(...scene.tasks.map(([uid, en, cn, ag]) => h("div", { class: "ms-task", "data-state": "queued" },
      h("div", { class: "mt-row" }, h("span", { class: "mt-uid" }, uid),
        h("span", { class: "mt-st" }, st("Queued", "排队"), st("Active", "进行中"), st("Review", "待审阅"), st("Done", "已完成"))),
      h("div", { class: "mt-title" }, L(en, cn)),
      h("div", { class: "mt-foot" }, h("span", { class: "mt-ag", style: `background:${colors[ag]}` }, ag), h("span", { class: "mt-bar" }, h("i"))))));
    hero.querySelector(".ms-res-name").textContent = scene.res[0];
    hero.querySelector(".ms-res-kind").textContent = L(...scene.res[1]);
    hero.querySelector(".ms-gpus").replaceChildren(...scene.res[2].map((label) => h("i", { title: label })));
    renderNeeds("");
  }
  function renderNeeds(state) {
    const [uid, en, cn, xen, xcn] = scene.needs;
    needsHost.replaceChildren(needsPanel([{ uid, title: L(en, cn), excerpt: L(xen, xcn), age: L("just now", "刚刚"), state }]));
  }
  function setTask(i, state, pct) {
    const t = list.children[i];
    if (!t) return;
    t.setAttribute("data-state", state);
    if (pct != null) t.querySelector(".mt-bar i").style.width = pct + "%";
    hero.querySelector("#mock-active").textContent = list.querySelectorAll('.ms-task[data-state="active"]').length;
  }
  const cell = (i, on) => hero.querySelectorAll(".ms-gpus i")[i]?.classList.toggle("ours", on);
  function renderNav() {
    nav.replaceChildren(...SCENES.map((s, i) => h("button", { type: "button", class: "scene-dot", "aria-pressed": String(i === index),
      "aria-label": L(...s.name) }, h("i"), h("span", null, L(...s.name)))));
    [...nav.children].forEach((b, i) => b.addEventListener("click", () => go(i, true)));
  }
  // The story of one scene, as [ms, action] steps.
  function steps() {
    const [t1, t2] = scene.tasks, [a1, a2] = scene.agents.map((a) => a[0]);
    const S = [];
    const at = (ms, fn) => S.push([ms, fn]);
    at(150, () => map.show(scene.nodes[0][0]));
    at(700, () => { map.show(scene.nodes[1][0]); map.link(scene.nodes[0][0], scene.nodes[1][0]); map.agentTo(a1, scene.nodes[1][0]); });
    at(1100, () => { map.show(scene.nodes[2][0]); map.link(scene.nodes[0][0], scene.nodes[2][0]); map.agentTo(a2, scene.nodes[2][0]); });
    at(1800, () => { map.show(t1[4]); map.link(scene.nodes[1][0], t1[4]); map.agentTo(a1, t1[4]); setTask(0, "active", 15); cell(0, true); });
    at(2300, () => { map.show(t2[4]); map.link(scene.nodes[2][0], t2[4]); map.agentTo(a2, t2[4]); setTask(1, "active", 10); cell(1, true); });
    at(3300, () => { setTask(0, "active", 70); setTask(1, "active", 45); });
    at(4600, () => { setTask(0, "review", 100); map.show(t1[5]); map.link(t1[4], t1[5]); map.agentTo(a1, t1[5]); cell(0, false); });
    at(5100, () => { hero.classList.add("needs-on"); setTask(2, "active", 20); });
    at(6500, () => renderNeeds("pressing"));
    at(6800, () => { renderNeeds("accepted"); setTask(0, "done", 100); map.done.add(t1[5]); });
    at(7400, () => { setTask(1, "active", 100); setTask(2, "active", 60); });
    at(8200, () => { hero.classList.remove("needs-on"); setTask(1, "review", 100); map.show(t2[5]); map.link(t2[4], t2[5]); map.agentTo(a2, t2[5]); cell(1, false); });
    at(10200, () => go(index + 1));
    return S;
  }
  function settle() {
    for (const [ms, fn] of steps()) if (ms < 10200 && ms !== 6500) fn();
    hero.classList.add("needs-on");
    renderNeeds("");
    map.draw(performance.now(), true);
  }
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  function loop() { map.draw(); frame = requestAnimationFrame(loop); }
  function play() {
    clear();
    hero.classList.remove("needs-on");
    for (const [ms, fn] of steps()) timers.push(setTimeout(fn, ms));
  }
  function go(i, manual = false) {
    index = (i + SCENES.length) % SCENES.length;
    const switchTo = () => {
      scene = SCENES[index]; map.set(scene); renderSide(); renderNav();
      if (reduceMotion() || paused || !running) settle(); else play();
      hero.classList.remove("switching");
    };
    clear();
    if (reduceMotion() || manual && !running) { switchTo(); return; }
    hero.classList.add("switching");
    timers.push(setTimeout(switchTo, 450));
  }
  function update() {
    const go_ = visible && !document.hidden && !reduceMotion() && !paused;
    if (go_ && !running) { running = true; hero.classList.remove("static"); map.set(scene); renderSide(); play(); loop(); }
    else if (!go_ && running) { running = false; clear(); cancelAnimationFrame(frame); map.set(scene); renderSide(); settle(); }
  }
  const wrapEl = hero.closest(".mock-wrap");
  wrapEl.addEventListener("mouseenter", () => { paused = true; update(); });
  wrapEl.addEventListener("mouseleave", () => { paused = false; update(); });
  wrapEl.addEventListener("focusin", () => { paused = true; update(); });
  wrapEl.addEventListener("focusout", (e) => { if (!wrapEl.contains(e.relatedTarget)) { paused = false; update(); } });
  refreshers.add(() => { renderSide(); renderNav(); if (!running) settle(); });
  if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; update(); }, { threshold: 0.1 }).observe(hero);
  document.addEventListener("visibilitychange", update);
  map.set(scene); renderSide(); renderNav(); settle();
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
