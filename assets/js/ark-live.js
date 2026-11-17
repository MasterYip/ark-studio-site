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
  production: ["Production", "产出"],
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
// The research map grows on ARK's Force renderer while two agents move between
// nodes, tasks progress on the side and a result arrives in "Needs you".
const hero = document.getElementById("mock");
if (hero) {
  const host = hero.querySelector(".mock-map-canvas");
  const needsHost = hero.querySelector(".mock-needs");
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
  const tasks = [...hero.querySelectorAll(".ms-task")];
  const setTask = (i, state, pct) => {
    tasks[i].setAttribute("data-state", state);
    if (pct != null) tasks[i].querySelector(".mt-bar i").style.width = pct + "%";
    hero.querySelector("#mock-active").textContent = hero.querySelectorAll('.ms-task[data-state="active"]').length;
  };
  const gpu = (id, on) => hero.querySelector("#" + id).classList.toggle("ours", on);
  const renderNeeds = (state) => {
    needsHost.replaceChildren(needsPanel([{ uid: "E-0001", title: L("3 seeds, no spikes with warm-up", "3 个种子，预热后无尖峰"),
      excerpt: L("500-step warm-up: no step above 1.5x the running mean in any seed.", "500 步预热：所有种子都没有超过滑动均值 1.5 倍的步。"), age: L("just now", "刚刚"), state }]));
  };
  let needsState = "";
  refreshers.add(() => { renderNeeds(needsState); fc.nodes.forEach((n) => { n.title = nodeOf(n.id).title; }); });
  renderNeeds("");

  function reset() {
    fc.set([], []); fc.view = null;
    for (const a of Object.values(agents)) { a.on = false; a.placed = false; a.to = null; }
    tasks.forEach((_, i) => setTask(i, "queued", 0));
    gpu("g0", false); gpu("g1", false);
    hero.classList.remove("needs-on"); needsState = ""; renderNeeds("");
  }
  const grow = (id) => { if (!fc.byId.has(id)) fc.add(nodeOf(id), linkFor(id)); };
  const agentTo = (name, id) => { agents[name].on = true; agents[name].to = id; };
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
    [7300, () => { hero.classList.add("needs-on"); setTask(2, "active", 20); }],
    [8900, () => { needsState = "pressing"; renderNeeds(needsState); }],
    [9200, () => { needsState = "accepted"; renderNeeds(needsState); setTask(0, "done", 100); grow("D-0001"); fc.byId.get("E-0001").status = "done"; }],
    [9900, () => { grow("E-0002"); agentTo("A2", "E-0002"); setTask(1, "active", 100); setTask(2, "active", 70); }],
    [10800, () => { hero.classList.remove("needs-on"); setTask(1, "review", 100); gpu("g1", false); }],
    [12600, () => hero.classList.add("fade")],
    [13200, () => { hero.classList.remove("fade"); reset(); }],
  ];
  const LOOP = 13400;
  let timers = [], running = false;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const cycle = () => { clear(); reset(); STEPS.forEach(([t, fn]) => timers.push(setTimeout(fn, t))); timers.push(setTimeout(cycle, LOOP)); };
  function composed() {
    clear(); reset();
    SEQ.forEach(grow);
    fc.nodes.forEach((n) => { n.born = null; }); fc.edges.forEach((e) => { e.born = null; });
    fc.settle(260); fc.fit(true);
    agentTo("A1", "E-0001"); agentTo("A2", "X-0002");
    setTask(0, "review", 100); setTask(1, "active", 70); setTask(2, "active", 30); gpu("g1", true);
    hero.classList.add("needs-on");
    fc.draw();
  }
  let visible = true;
  const update = () => {
    const go = visible && !document.hidden && !reduceMotion();
    if (go && !running) { running = true; hero.classList.remove("static"); cycle(); fc.start(); }
    else if (!go && running) { running = false; clear(); fc.stop(); composed(); }
  };
  if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; update(); }, { threshold: 0.1 }).observe(hero);
  document.addEventListener("visibilitychange", update);
  composed();
  if (reduceMotion()) hero.classList.add("static");
  update();
}
