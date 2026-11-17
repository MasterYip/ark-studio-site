# ARK Studio product site

The product introduction and download page for ARK Studio. Plain HTML, CSS and
JavaScript: no build step, no external fonts, scripts or trackers.

```text
site/
  index.html               the page (English text inline, affiliation logos inline SVG)
  assets/css/site.css      site layout; light and dark palettes from ark_studio/web/css/app.css
  assets/css/ark-ui.css    ARK component rules extracted from app.css, scoped under .ark-ui
  assets/js/site.js        中文 strings, language and theme switch, tabs, OS detection,
                           release download links
  assets/js/ark-live.js    live previews: hero animation, Home, Map, Mind, Board, Resources
  assets/js/ark/           ARK frontend modules copied unchanged (graph-core, icons, arrows,
                           node-card, mind-layout) with their license (GNU AGPL-3.0)
  assets/img/              brand lockups and icons; shots/home-light.webp is only the
                           social preview image
  tools/extract_ark_css.py regenerates ark-ui.css from app.css
  deploy/github-pages.yml  disabled GitHub Pages workflow template
  .nojekyll                serve the folder as is on GitHub Pages
```

## Preview

```sh
python -m http.server 8000 --directory site --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. `?lang=zh` or `?lang=en` forces the language;
otherwise the browser language decides, and the switch in the top bar is
remembered. The theme follows the system until the toggle is used.

## Downloads

Asset names carry the version, so `site.js` asks the GitHub API for
`repos/MasterYip/ARK-Studio/releases/latest` and points each button at the
matching asset (patterns in `PATTERNS`). The answer is cached for an hour per
tab. Without the API (offline, rate limit) every link opens the latest release
page, which always works. When release asset names change, update `PATTERNS`.

The visitor's system (Windows, macOS, Linux, Android) highlights its card and
labels the main button. On Chromium-based browsers macOS Intel is detected;
other macOS browsers get Apple silicon first.

## Live previews

The hero, the pillar visuals and the preview tabs are built in the page, not
screenshots. `ark-live.js` renders a small sample project worded after ARK's public
PredActor demo (titles in English, as in the demo) with ARK's own code:

* Hero: five scenes in one window, like segments of a short film, each
  with its own composition: the research map growing on ARK's Force
  renderer with agents, tasks, the GPU strip and an accept in Needs you;
  import from InfoHub (both graphs run ARK's force layout; the topic hub is
  dragged across with its items trailing on springs, the items join the ARK
  simulation, link up and are picked up by an agent);
  agents in parallel (Codex, Claude Code, DSH and OpenCode sessions with
  streaming logs, their presence on a small map); the review queue (select,
  bulk accept, send back with a note); and resources with the GPU queue
  (members, code and data, machines, GPU servers, jobs queued, running and
  done). The tour advances on its own; the switcher picks a scene; keyboard
  focus in the switcher, a hidden tab or scrolling away pauses it. Hovering
  shows ARK's hover states (node ring and neighbourhood, card and row hover)
  without changing the story.
* Map tab: ARK's Force physics and node painter (`ark/graph-core.js`,
  `stepForce`, `drawForceNode`, arrowheads) on a canvas.
* Feature thumbnails: small SVGs built from the same pieces (node glyphs in
  ARK's type colours, node cards, task bars, agent badges, GPU meters).
* Mind: ARK's Mind layout and card sizing (`ark/mind-layout.js`,
  `ark/node-card.js`); cards are painted the way `graph.js` paints them.
* Home and Board: ARK's own rendered markup for the public PredActor demo
  project, captured from a running ark-server by `tools/snapshot_ark_views.py`
  into `assets/js/ark/views-snapshot.js` (EN and 中文; loaded only when the
  preview comes into view), laid out at the app's desktop width and scaled to
  fit. `ark-ui.css` is extracted from the same checkout's `app.css` with the
  snapshot's classes: `python site/tools/extract_ark_css.py <app.css>
  site/assets/css/ark-ui.css <commit> site/assets/js/ark/views-snapshot.js`.
* Resources: the device cards rebuilt in DOM (ARK draws them on a canvas in a
  view that needs a server); hosts, jobs and usage are made up.

Nothing connects to a server. Components start when scrolled into view, the
hero pauses off screen, and `prefers-reduced-motion` shows a settled frame.
The page needs HTTP (ES modules), not `file://`.

To update after ARK changes, copy the five modules again from
`ark_studio/web/js/` (keep the three-line header) and rerun
`tools/extract_ark_css.py`. The full `GraphView` is not used: it imports the
API client and app state (48 files).

## Affiliation logos

`assets/img/logos/` holds the four logos, each used only as a mask so the page
fills them with one neutral colour:

* RoboParty Lab (`roboparty.svg`), SII (`sii.svg`, its bitmap emblem
  re-encoded at a smaller size) and SFTR (`sftr.svg`): the public logo set of
  the author's profile site.
* HIT (`hit.svg`): no official vector of this lockup was found on Wikimedia
  Commons or on hit.edu.cn. It is a potrace trace (potracer 0.0.4, alpha
  threshold 110, turdsize 6, alphamax 1.0) of the official bitmap
  <https://www.hit.edu.cn/_upload/site/00/ee/238/logo.png> (2914 x 678), the
  same image as the profile site's `hit-white.png`.

Links: RoboParty Lab <https://lab.roboparty.com/>, HIT
<https://www.hit.edu.cn/>, SII <https://www.sii.edu.cn/>. SFTR has no link: no
verifiable official page was found.

## Publishing

Not published. Pick one:

1. **Organization site, `https://ark-studio.github.io/`**: create the GitHub
   organization `ark-studio` and a public repository `ark-studio.github.io`,
   copy the contents of `site/` to its root, copy `deploy/github-pages.yml` to
   `.github/workflows/` with `SITE_DIR: .`, set Settings > Pages > Source to
   "GitHub Actions" and run the workflow with `publish`.
2. **Project site** (live now at `https://masteryip.github.io/ark-studio-site/`
   from the repository `MasterYip/ark-studio-site`, or at
   `https://masteryip.github.io/ARK-Studio/`): the page uses
   relative paths, so it works under a sub-path. The public export
   (`scripts/release/publish_public.py`) does not include `site/` today: add
   `"site"` to `ROOT_DIRS`, copy the workflow to `.github/workflows/`
   (`SITE_DIR: site`) and enable Pages with "GitHub Actions".
3. **Custom domain**: either of the above plus a `CNAME` file in the published
   folder and the DNS record from the GitHub Pages documentation.

Before publishing, audit the folder:

```sh
python scripts/release/publish_public.py --audit site
```

## License

ARK Studio is licensed under the GNU AGPL-3.0 from the release after v2.0.0
(v2.0.0 and earlier are MIT). Commercial licences: raymon-yip@qq.com.

Within `site/`, the ARK modules in `assets/js/ark/` and the rules extracted
into `assets/css/ark-ui.css` come from ARK Studio and are under the GNU
AGPL-3.0 (`assets/js/ark/LICENSE`). The site's own files (`index.html`,
`assets/css/site.css`, `assets/js/site.js`, `assets/js/ark-live.js`,
`tools/`) keep the MIT License they were written under.

