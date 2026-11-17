// ARK Studio product site: language, theme, screenshot tabs and release downloads.
(function () {
  "use strict";
  var REPO = "MasterYip/ARK-Studio";
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var root = document.documentElement;

  var ZH = {
    "nav.why": "为什么选 ARK",
    "hero.lead": "让 agent 承担执行，让每个结论都有来处的科研工作台。",
    "p1.t": "在事实图谱上生长的自动化研究",
    "p1.p": "从想法到研究地图再到实现，智能体在由论断、证据和实验组成的图谱上并行工作。你始终在回路中，每个结果都由你验收，一个人也能带领一支智能体团队。",
    "p1.v.idea": "想法", "p1.v.map": "研究地图", "p1.v.impl": "实现", "p1.v.q": "问题", "p1.v.claim": "论断",
    "p1.v.evidence": "证据", "p1.v.paper": "论文", "p1.v.exp": "实验", "p1.v.task1": "运行消融实验",
    "p1.v.task2": "重跑基线", "p1.v.task3": "绘制论文图表", "p1.v.review": "✓ 已由你验收",
    "p2.t": "代码库、机器和 GPU，统一在一个上下文中",
    "p2.p": "代码仓库、运行环境、存储、工作站和 GPU 服务器只需登记一次。每个智能体都随项目上下文拿到它们，资源图显示哪些在线、谁在使用。",
    "p3.t": "一个项目，一整个团队",
    "p3.p": "多人和各自的智能体在同一个项目里并行工作，有负责人、共享看板和首页上的进度。账户、角色和项目授权决定谁能使用什么。",
    "g1": "事实图谱上的自动化研究", "g2": "代码库、机器和 GPU", "g3": "研究团队", "g4": "随处可用",
    "f.runs.t": "并行的智能体会话",
    "f.runs.p": "Claude Code、Codex、DSH 或 OpenCode，各用一个工作树。",
    "f.res.t": "资源图",
    "f.res.p": "哪些机器在线、谁在使用，一目了然。",
    "f.acc.t": "账户与角色",
    "f.acc.p": "组织角色、项目授权，个人凭据只属于自己。",
    "tab.resources": "资源",
    "cap.resources": "资源：一台工作站、ARK 服务器和两台 GPU 服务器，标出我们的任务占用的 GPU 和他人使用的 GPU。示例数据。",
    "nav.about": "关于",
    "mock.aria": "ARK Studio 动画示例：研究地图从问题生长到结果，智能体执行任务，结果送来审阅。",
    "mock.home": "首页",
    "mock.research": "研究",
    "mock.map": "地图",
    "mock.execute": "执行",
    "mock.output": "产出",
    "mock.tasks": "任务",
    "mock.active": "进行中",
    "about.eyebrow": "关于",
    "about.by": "开发者",
    "about.p": "ARK Studio 由 MasterYip 设计和开发，以 <span class=\"nowrap\">GNU AGPL-3.0</span> 许可证开源。欢迎在 GitHub 上提交问题和拉取请求。",
    "about.affil": "所属机构",
    "about.hit": "哈尔滨工业大学",
    "about.sii": "上海创智学院",
    "lic.commercial": "提供商业授权：<a href=\"mailto:raymon-yip@qq.com\">raymon-yip@qq.com</a>",
    "af.rp.aria": "RoboParty Lab 官方网站（在新标签页打开）",
    "af.rp.title": "RoboParty Lab",
    "af.hit.aria": "哈尔滨工业大学官方网站（在新标签页打开）",
    "af.hit.title": "哈尔滨工业大学",
    "af.sii.aria": "上海创智学院官方网站（在新标签页打开）",
    "af.sii.title": "上海创智学院",
    "about.rp": "RoboParty Lab",
    "dl.lic": "v2.0.0 安装包采用 MIT 许可证；自下一个版本起采用 GNU AGPL-3.0。",
    "close.title": "下一个发现，从这里开始。",
    "mock.examples": "示例",
    "f.apps.t": "桌面与移动端",
    "f.apps.p": "Windows、macOS、Ubuntu 和 Android，本地或远程皆可。",
    "nav.how": "工作方式", "nav.features": "功能", "nav.shots": "预览", "nav.download": "下载",
    "nav.selfhost": "自托管", "nav.docs": "文档", "theme.toggle": "切换浅色和深色主题",
    "hero.eyebrow": "Auto-Research Kit · 开源",
    "hero.title": "一人执舵，<br><span class=\"accent\">众智同行。</span>",
        "hero.download": "下载", "hero.github": "在 GitHub 上查看",
    "hero.note": "支持 Windows、macOS、Linux 和 Android，基于 <span class=\"nowrap\">GNU AGPL-3.0</span> 免费开源。", "hero.all": "全部下载",
    "hero.works": "可配合", "hero.http": "任意 HTTP 客户端",
    "how.eyebrow": "工作方式", "how.title": "从问题到验收，一条闭环",
    "how.lead": "智能体做繁琐的工作并如实记录，方向由你定。",
    "how.s1.t": "收集", "how.s1.p": "问题、想法和论文成为带来源的节点。",
    "how.s2.t": "计划", "how.s2.p": "智能体先把计划写进任务节点。",
    "how.s3.t": "证据", "how.s3.p": "资料连到论断上，论证的缺口一目了然。",
    "how.s4.t": "执行", "how.s4.p": "智能体在带权限、工作树和 GPU 的会话中运行。",
    "how.s5.t": "审阅与验收", "how.s5.p": "结果连同图表送来，由你验收或退回。",
    "who.you": "你", "who.agent": "智能体",
    "how.note": "<strong>为长时间运行的智能体而设计。</strong>首页提供两段启动提示词：一段配置环境，一段启动研究团队。",
    "feat.eyebrow": "功能", "feat.title": "一个工作台，全部到位",
    "feat.lead": "图、看板和时间线，都基于同一批记录。",
    "f.map.t": "研究地图", "f.map.p": "同一论证的力导向、树、径向和 Mind 视图。",
    "f.topic.t": "主题", "f.topic.p": "为每条故事线或实验保存一张精选子图。",
    "f.home.t": "首页总览", "f.home.p": "关键数字、研究流水线和等你处理的事项。",
    "f.agent.t": "智能体 API", "f.agent.p": "限定范围的令牌，智能体读取上下文、写回结果。",
    "f.setup.t": "项目环境登记", "f.setup.p": "代码仓库、运行环境和存储，只需登记一次。",
    "f.gpu.t": "GPU 队列", "f.gpu.p": "通过 SSH 发现 GPU，在限额内共享使用。",
    "f.plug.t": "插件", "f.plug.p": "添加自己的视图，在沙箱中运行。",
    "f.desk.t": "桌面应用", "f.desk.p": "支持 Windows、macOS 和 Ubuntu。用内置服务器在本机运行私有的 ARK，也能在同一窗口中打开你的 ARK 服务器，并提供托盘菜单。",
    "f.mob.t": "移动端", "f.mob.p": "响应式网页应用和两款 Android 应用。扫码配对手机，离开电脑也能审阅结果、验收工作。",
    "f.srv.t": "自托管服务器", "f.srv.p": "一个 Go 可执行文件，自带 SQLite，部署在你的 HTTPS 之后。",
    "more": "了解更多",
    "shots.eyebrow": "实时预览", "shots.title": "真实界面，在本页中运行",
    "shots.lead": "这些视图使用 ARK 自己的地图渲染器、布局代码和样式，配一个小型示例项目，不连接任何服务器。",
    "tab.home": "首页", "tab.map": "地图", "tab.mind": "Mind 布局", "tab.board": "任务看板",
    "cap.home": "首页：与上周对比的关键数字、等待你验收的结果和研究流水线。",
    "cap.map": "地图：用 ARK 自身的物理布局展示整个论证。颜色表示节点类型，图标表示状态。",
    "cap.mind": "Mind 布局：同一批节点排成大纲，从故事线到问题、论断、实验和任务。",
    "cap.board": "执行：按状态排列的任务和负责人，人和智能体都在其中。",
    "dl.eyebrow": "下载", "dl.title": "获取 ARK Studio",
    "dl.lead": "桌面应用在你的电脑上运行 ARK，并能连接你的服务器。无需 Python、无需账户，也无需模型密钥即可开始。",
    "dl.detecting": "请选择适合你系统的版本。", "dl.rec": "适合你的系统",
    "dl.win.req": "Windows 10 或 11，x64", "dl.win.setup": "安装程序", "dl.win.msi": "MSI，适合 IT 批量部署", "dl.win.zip": "便携版",
    "dl.mac.req": "macOS 10.15 或更高版本", "dl.mac.arm": "Apple 芯片", "dl.mac.intel": "Intel 芯片",
    "dl.linux.req": "Ubuntu 22.04+、Debian 12+，x64", "dl.linux.deb": "Ubuntu / Debian", "dl.linux.appimage": "其他发行版",
    "dl.and.req": "需连接 ARK 服务器", "dl.and.app": "ARK Studio 应用", "dl.and.web": "ARK Studio Web 轻量版",
    "dl.srv.t": "ark-server 服务器",
    "dl.notes": "发布说明", "dl.sums": "SHA256 校验和", "dl.all": "全部版本",
    "dl.unsigned": "安装包暂未代码签名：首次运行步骤",
    "sh.eyebrow": "自托管服务器", "sh.title": "一个可执行文件，服务整个团队",
    "sh.lead": "在工作站或 GPU 服务器上运行 <code>ark-server</code>。浏览器、桌面应用和 Android 应用都连接到它。",
    "sh.l1": "单个 Go 可执行文件，无需安装运行时", "sh.l2": "默认只监听本机回环地址；公开模式必须登录",
    "sh.l3": "账户、组织角色和按项目授权", "sh.l4": "每个安装包都附带示例配置和 systemd 用户单元",
    "sh.ops": "服务器运维指南", "sh.c1": "Linux，使用发布包", "sh.c2": "从源码构建（Go 1.27+）", "copy": "复制",
    "docs.eyebrow": "文档", "docs.title": "使用指南",
    "d.install.t": "安装", "d.install.p": "各系统的下载、首次运行和数据目录",
    "d.mode.t": "智能体工作方式", "d.mode.p": "计划、进展、待审阅和决策节点",
    "d.ext.t": "外部智能体", "d.ext.p": "令牌、项目上下文和媒体",
    "d.prov.t": "智能体提供方", "d.prov.p": "Claude Code、Codex、DSH、OpenCode 与工作树",
    "d.desk.t": "桌面应用", "d.desk.p": "本机和你的服务器，在同一个窗口中",
    "d.mob.t": "移动端与远程访问", "d.mob.p": "Android 应用、配对、HTTPS 和隧道",
    "d.gpu.t": "GPU 服务器", "d.gpu.p": "SSH 探测、队列和资源策略",
    "d.all.t": "全部文档", "d.all.p": "使用指南、运维和开发",
    "ft.releases": "版本发布", "ft.issues": "问题反馈", "ft.changelog": "更新日志", "ft.license": "GNU AGPL-3.0 许可证",
    "ft.note": "ARK Studio 基于 <span class=\"nowrap\">GNU AGPL-3.0</span> 许可证开源。",
    // Download status lines (JS only).
    "os.windows": "检测到 Windows，已为你标出推荐的安装包。",
    "os.mac": "检测到 macOS，已为你标出推荐的安装包。",
    "os.linux": "检测到 Linux，已为你标出推荐的安装包。",
    "os.android": "检测到 Android，已为你标出推荐的安装包。",
    "os.ios": "暂无 iOS 应用。可在手机浏览器中打开你的 ARK 服务器，或选择下面的版本。",
    "btn.windows": "下载 Windows 版", "btn.mac": "下载 macOS 版", "btn.linux": "下载 Linux 版", "btn.android": "下载 Android 版",
    "copied": "已复制"
  };
  var EN_JS = {
    "os.windows": "Windows detected. The recommended build is highlighted.",
    "os.mac": "macOS detected. The recommended build is highlighted.",
    "os.linux": "Linux detected. The recommended build is highlighted.",
    "os.android": "Android detected. The recommended build is highlighted.",
    "os.ios": "There is no iOS app yet. Open your ARK server in the phone's browser, or pick a build below.",
    "btn.windows": "Download for Windows", "btn.mac": "Download for macOS", "btn.linux": "Download for Linux", "btn.android": "Download for Android",
    "copied": "Copied"
  };

  function lang() { return root.lang === "zh-CN" ? "zh" : "en"; }
  function t(key) { return lang() === "zh" ? (ZH[key] || EN_JS[key] || "") : (EN_JS[key] || ""); }

  // ---------------------------------------------------------------- language
  var english = new Map();
  function applyLang(l) {
    root.lang = l === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!english.has(el)) english.set(el, el.innerHTML);
      el.innerHTML = l === "zh" && ZH[key] ? ZH[key] : english.get(el);
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split("|").forEach(function (pair) {
        var parts = pair.split(":");
        var store = "i18nEn" + parts[0].replace(/[^a-z]/gi, "");
        if (!el.dataset[store]) el.dataset[store] = el.getAttribute(parts[0]) || "";
        el.setAttribute(parts[0], l === "zh" && ZH[parts[1]] ? ZH[parts[1]] : el.dataset[store]);
      });
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === l));
    });
    document.title = l === "zh" ? "ARK Studio · 人与智能体共用的研究工作台" : "ARK Studio · Research workbench for people and agents";
    renderOs();
  }
  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = b.getAttribute("data-lang");
      try { localStorage.setItem("ark-site.lang", l); } catch (e) { /* storage unavailable */ }
      applyLang(l);
    });
  });

  // ------------------------------------------------------------------ theme
  var media = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function storedTheme() { try { return localStorage.getItem("ark-site.theme"); } catch (e) { return null; } }
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    // Choosing the system's own theme returns to following the system.
    var system = media && media.matches ? "dark" : "light";
    try {
      if (next === system) localStorage.removeItem("ark-site.theme");
      else localStorage.setItem("ark-site.theme", next);
    } catch (e) { /* storage unavailable */ }
  });
  if (media && media.addEventListener) {
    media.addEventListener("change", function (e) {
      if (!storedTheme()) root.setAttribute("data-theme", e.matches ? "dark" : "light");
    });
  }

  // ------------------------------------------------------- screenshot tabs
  var tabs = document.querySelectorAll("[role=tab][data-shot]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-shot");
      tabs.forEach(function (b) { b.setAttribute("aria-selected", String(b === tab)); });
      document.querySelectorAll(".shot[data-shot]").forEach(function (p) {
        var on = p.getAttribute("data-shot") === id;
        p.classList.toggle("on", on);
        p.hidden = !on;
        if (on) document.dispatchEvent(new CustomEvent("ark-live-shown", { detail: p }));
      });
    });
  });

  // ------------------------------------------------------------------ copy
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var pre = document.getElementById(b.getAttribute("data-copy"));
      var text = Array.prototype.filter.call(pre.textContent.split("\n"), function (line) { return line.trim().charAt(0) !== "#"; })
        .map(function (line) { return line.replace(/\s+#.*$/, ""); }).join("\n");
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () {
        var old = b.textContent; b.textContent = t("copied");
        setTimeout(function () { b.textContent = old; }, 1400);
      });
    });
  });

  // ------------------------------------------------------- OS detection
  function detectOs() {
    var ua = navigator.userAgent || "";
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) return "ios";
    if (/win/i.test(platform) || /windows/i.test(ua)) return "windows";
    if (/mac/i.test(platform) || /mac os x/i.test(ua)) return "mac";
    if (/linux|x11|cros/i.test(platform + " " + ua)) return "linux";
    return "";
  }
  var os = detectOs();
  var macArch = "arm";
  var MAIN = { windows: "win-setup", mac: "mac-arm", linux: "linux-deb", android: "android" };

  function renderOs() {
    var line = document.getElementById("os-line");
    if (os && line) line.textContent = t("os." + os);
    var label = document.getElementById("hero-download-label");
    var hero = document.getElementById("hero-download");
    if (MAIN[os] && label && hero) {
      label.textContent = t("btn." + os);
      var key = os === "mac" && macArch === "intel" ? "mac-intel" : MAIN[os];
      var link = document.querySelector('a[data-asset="' + key + '"]');
      hero.href = link && link.dataset.resolved ? link.href : "#download";
    }
  }
  if (os) {
    var card = document.querySelector('.dl[data-os="' + os + '"]');
    if (card) card.classList.add("recommended");
  }
  // Chromium on macOS can report the CPU architecture.
  if (os === "mac" && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(["architecture"]).then(function (v) {
      if (v.architecture === "x86") {
        macArch = "intel";
        var arm = document.querySelector('a[data-asset="mac-arm"]'), intel = document.querySelector('a[data-asset="mac-intel"]');
        if (arm && intel) { arm.classList.remove("main"); intel.classList.add("main"); intel.parentNode.parentNode.prepend(intel.parentNode); }
        renderOs();
      }
    }).catch(function () { /* keep the default */ });
  }

  // ------------------------------------------------- release asset links
  // Asset names carry the version, so the links are resolved from the latest
  // release. Without the API (offline, rate limit) they stay on the release page.
  var PATTERNS = {
    "win-setup": /_x64-setup\.exe$/i,
    "win-msi": /_x64_[a-z-]+\.msi$/i,
    "win-portable": /_x64-portable\.zip$/i,
    "mac-arm": /^ARK[ .]Studio_.*_aarch64\.dmg$/i,
    "mac-intel": /^ARK[ .]Studio_.*_x64\.dmg$/i,
    "linux-deb": /^ARK[ .]Studio_.*_amd64\.deb$/i,
    "linux-appimage": /_amd64\.AppImage$/i,
    "android": /-android\.apk$/i,
    "android-web": /-android-web\.apk$/i,
    "srv-linux-amd64": /^ark-server-.*-linux-amd64\.tar\.gz$/i,
    "srv-linux-arm64": /^ark-server-.*-linux-arm64\.tar\.gz$/i,
    "srv-deb-amd64": /^ark-server_.*_amd64\.deb$/i,
    "srv-deb-arm64": /^ark-server_.*_arm64\.deb$/i,
    "srv-darwin-arm64": /^ark-server-.*-darwin-arm64\.tar\.gz$/i,
    "srv-darwin-amd64": /^ark-server-.*-darwin-amd64\.tar\.gz$/i,
    "srv-windows-amd64": /^ark-server-.*-windows-amd64\.zip$/i,
    "sums": /^SHA256SUMS\.txt$/i
  };
  function size(bytes) {
    if (!bytes) return "";
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
  }
  function apply(release) {
    if (!release || !Array.isArray(release.assets)) return;
    var ver = document.getElementById("release-version");
    if (ver && release.tag_name) { ver.textContent = release.tag_name; ver.hidden = false; }
    // The licence note covers v2.0.0 and earlier (MIT); a newer latest release is AGPL-3.0.
    var lic = document.getElementById("dl-lic"), m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(release.tag_name || "");
    if (lic && m && (+m[1] > 2 || (+m[1] === 2 && (+m[2] > 0 || +m[3] > 0)))) lic.hidden = true;
    Object.keys(PATTERNS).forEach(function (key) {
      var asset = release.assets.find(function (a) { return PATTERNS[key].test(a.name); });
      document.querySelectorAll('a[data-asset="' + key + '"]').forEach(function (link) {
        if (!asset) return;
        link.href = asset.browser_download_url;
        link.dataset.resolved = "1";
        link.title = asset.name;
        var meta = link.querySelector(".label + .meta");
        if (meta) meta.textContent = size(asset.size);
      });
    });
    renderOs();
  }
  var CACHE = "ark-site.release";
  function cached() {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE) || "null");
      return c && Date.now() - c.at < 3600e3 ? c.release : null;
    } catch (e) { return null; }
  }
  var hit = cached();
  if (hit) apply(hit);
  else if (window.fetch) {
    fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.assets) return;
        var slim = { tag_name: data.tag_name, assets: data.assets.map(function (a) {
          return { name: a.name, size: a.size, browser_download_url: a.browser_download_url };
        }) };
        try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), release: slim })); } catch (e) { /* storage unavailable */ }
        apply(slim);
      })
      .catch(function () { /* links stay on the release page */ });
  }

  applyLang(lang());
})();
