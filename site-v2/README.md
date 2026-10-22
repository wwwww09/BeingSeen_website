# Being Seen — site-v2

A new, independent build. The old site is untouched; this project shares the
repository but not the code, the layout, or the writing.

The shell is a full-screen WebGL stage with a scroll-driven story on top of it:

- **Vite + React 19 + TypeScript** — the build output is static `dist/`
- **React Router** — Home / The Science (three child pages) / Message Board
- **React Three Fiber / Three.js** — one fixed canvas behind the whole document
- **Framer Motion** — scroll progress, viewport reveals, reduced-motion handling
- **Supabase JS** — installed now, wired up in the guestbook pass

## Status — hierarchy skeleton (0.3)

The site now has the intended three-level hierarchy:

```
/                         Home
/science                  The Science (index)
/science/supernovae       01 Lensing & Supernovae
/science/fast-radio-bursts 02 Lensing & Fast Radio Bursts
/science/gravitational-waves 03 Gravitational Wave Lensing
/message-board            Message Board
```

The top navigation has exactly three items: **Home · The Science · Message
Board**. "The Science" stays active on all three child pages; a secondary
navigation (Overview / 01 / 02 / 03) appears only inside that branch.

Still in place from the previous pass:

- a fixed full-viewport black hole: event horizon, photon ring, tilted
  accretion disk, and a starfield
- a **continuous lens path** measured from the sections the current route
  renders — it glides between sides, with no threshold switch
- `useScroll` → camera dolly; a slow free camera orbit
- Framer Motion reveals, hairline progress, reduced-motion handling
- WebGL fallback that leaves every page readable

What is deliberately still a frame:

- the three science pages carry the brief's question titles and key paragraphs,
  plus a labelled chart frame; the charts and their numbers are the next pass
- the Message Board has its page frame: a reserved **star field** area (no
  canvas yet), a disabled story form, and an empty stories area. No Supabase
  wiring and no star map yet.

## Figure prototype (current pass, unlisted)

`/figure-preview` is an unlisted route for judging the human figure before the
five-act homepage is built on top of it.

- A dense **GPU point cloud**: about 62,000 particles. Thirteen bone segments
  plus a spherical head; the vertex shader rebuilds a tube around each bone
  every frame, so JS only uploads the 13 bone endpoints.
- No solid body mesh. The human silhouette comes from the density of the
  points, and the points fill the volume, not just a surface shell.
- Additive points with bloom (`@react-three/postprocessing`), lavender / ivory
  / ember palette. The reference is a TouchDesigner FBX-to-particles effect.
- Frontal run: the figure faces +z, lifts one knee toward the camera and
  counter-swings the arms. A small 3/4 offset keeps the depth legible.
- The shot: run at the screen (0–0.45), camera pulls back (0.45–0.72), the
  figure sits (0.55–1), and the black hole grows in the chest (0.72–1).
- No face. That is the slightly eerie part.
- Controls: sequence slider, Run / Sit, Play sequence, Stop. Query helpers:
  `?t=0.6`, `?demo=1`.
- This is a gate, not the finished homepage. The five acts (Hero + Intrinsic /
  Temporal / Extrinsic / Unseen) are the next pass, and the top-level labels
  will become **Being unseen / the science / Being seen** in that pass. The
  Science and Being seen pages are deliberately untouched here.

No audio yet. When the music file arrives it can always be muted: the player
will have a persistent mute toggle, and it will not autoplay before a user
gesture.

## Routes and hierarchy

| Route | Level | Content |
|---|---|---|
| `/` | Home | hero + links into the two top-level sections |
| `/science` | The Science | index of the three chapters |
| `/science/supernovae` | child | 01 Lensing & Supernovae |
| `/science/fast-radio-bursts` | child | 02 Lensing & Fast Radio Bursts |
| `/science/gravitational-waves` | child | 03 Gravitational Wave Lensing |
| `/message-board` | top level | Being Seen (frame only) |

`vercel.json` contains an SPA rewrite so those URLs work on a direct visit,
not only after client-side navigation.

## FRB science — open decision

The brief's FRB conclusion (two clean candidates) does not survive checking
against the CHIME catalogue: the two flagged pairs differ in DM by 75.8 and
739.5 pc cm⁻³, not 0.0 and 5.2, and lensing does not change dispersion measure.
The chapter skeleton therefore keeps the question and the search description
but **states no candidate count**. How to present the discrepancy (corrected
null result, both versions side by side, or a further check) is an open decision
and is being discussed, not silently decided.

Two related notes for the chart passes: the SNe claim will use the countable
0/5 → 2/5 comparison rather than an "order of magnitude" multiplier, which
cannot be computed from zero; the GW chart will use `m_obs = m_true·√μ`.

## Run

```bash
cd site-v2
pnpm install
pnpm dev        # http://localhost:3100
pnpm build      # typecheck + static build to dist/
pnpm preview    # serve dist/
```

On macOS the native `rolldown` binding can fail with a Team ID mismatch
(`mapping process and mapped file (non-platform) have different Team IDs`).
`run.sh` creates an entitlement-signed copy of Node and puts it first on
`PATH`, which is the same workaround the old site uses:

```bash
./run.sh dev
./run.sh build
./run.sh typecheck
```

If `node` / `pnpm` are not on `PATH`:

```bash
NODE_BIN=/path/to/node PNPM_BIN=/path/to/pnpm.mjs ./run.sh install
```

### Verification (this pass)

- install resolved 124 packages with no peer warnings
- `tsc --noEmit` clean
- `vite build` clean: initial chunk stays small; the figure route and the
  postprocessing are lazy-loaded
- headless Chrome: all six routes load directly, one canvas each, no console
  errors, no horizontal overflow at 390 px
- `/figure-preview`: canvas renders, sequence slider and demo run, no console
  errors at 1440 and 390 px; run and sit frames captured
- top nav and science sub-nav show the correct active item on every route
- the lens path is rebuilt per route; a mid-glide frame confirms it is
  continuous rather than a side switch
- WebGL-disabled and reduced-motion checks pass
- production `vite preview` re-checked through the same pass

Versions: React 19.3.1 · React Three Fiber 9.8.2 · three 0.186.1 ·
framer-motion 14.5.0 · react-router-dom 7.18.4 · Vite 8.3.5 ·
@react-three/postprocessing 3.2.2 · postprocessing 6.39.5 · Node 24.21.0

## Deploy

The `being-seen-website-z59h` Vercel project already points at this folder:

1. Root Directory: `site-v2`
2. Build: `pnpm build`, output: `dist`
3. SPA rewrite: `vercel.json` sends unknown paths to `index.html`, so a direct
   visit to `/science/supernovae` works, not only in-app navigation.
4. Add the Supabase variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`) when the message board pass lands.

The old site's project and URL are separate and untouched.

## Layout

```
site-v2/
  index.html
  vercel.json            Vite build + SPA rewrite
  src/
    App.tsx              router: /, /science/*, /message-board
    content.ts           hierarchy, brief copy, chapter scaffolding
    styles.css           frameless editorial layout
    components/
      SiteShell.tsx      fixed nav + shared stage + scroll track
      Nav.tsx            Home / The Science / Message Board
      ScienceNav.tsx     secondary nav inside The Science
      Stage.tsx          fixed Canvas + WebGL fallback
      ProgressRail.tsx   right-edge scroll indicator
    figure/
      pose.ts             frontal run + seated slump, 13 bone segments
      HumanFigure.tsx     ~62k GPU points + chest void
      FigureScene.tsx     camera pullback, dust, bloom
    pages/
      FigurePreviewPage.tsx  unlisted /figure-preview controls
      HomePage.tsx
      ScienceLayout.tsx  science sub-nav + outlet
      ScienceOverview.tsx
      ScienceChapterPage.tsx
      MessageBoardPage.tsx
    scene/
      Scene.tsx          fog, composition
      Starfield.tsx      distant star shell
      LensCore.tsx       event horizon, photon ring, accretion disk
      CameraRig.tsx      scroll dolly + slow orbit
      diskTexture.ts     runtime accretion-disk sprite
      dotTexture.ts      runtime round particle sprite
    lib/
      lensPath.ts        continuous lens path from measured sections
      scrollContext.ts   page scroll progress
      useWebGL.ts        capability probe
  run.sh                 local runner (macOS signing workaround)
```

## Why a separate workspace

`site-v2/pnpm-workspace.yaml` makes this folder its own pnpm root. Its
dependencies install into `site-v2/node_modules` and cannot leak into the old
site's install at the repository root.
