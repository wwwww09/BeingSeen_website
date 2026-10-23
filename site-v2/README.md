# Being Seen — site-v2

A new, independent build. The old site is untouched; this project shares the
repository but not the code, the layout, or the writing.

The Home page is now a **single-points, five-stage film**. There is exactly one
`THREE.Points` object on the Canvas: no glTF, no meshes, no separate black-hole,
magnetar or crowd objects. Each stage is a target position array and scroll
interpolates the live `position` attribute between them.

- **Vite + React 19 + TypeScript** — static `dist/`
- **React Three Fiber / Three.js** — one fixed `<Canvas>` and one points cloud
- **Custom GLSL ShaderMaterial** — colour, opacity, point size, flash, twinkle
- **Framer Motion** — `useScroll`, a spring-smoothed progress, fixed text fades,
  the five-act rail
- **Supabase JS** — installed, to be wired up in the message-board pass

## Status — Home film (0.5)

- **0.00–0.20 / The Intrinsic** — 16,000 dim grey particles form the faceless
  human silhouette, then fold into a compact ball. Camera: centred, a small
  zoom in.
- **0.20–0.40 / The Collapse** — the ball becomes a dark void with a faint
  orange accretion ring and a bright photon ring. The core particles are
  genuinely black/alpha-0. Camera: slow orbit.
- **0.40–0.60 / The Flash** — the core ignites; the cloud rearranges into a
  blue-white magnetar with two polar beams and a short FRB flash. The camera
  shakes at the flash, then pulls back; the magnetar dims to dark grey.
- **0.60–0.80 / The Extrinsic** — the magnetar returns to the human silhouette
  while 24,000 glowing crowd particles rush in from far outside the frame. The
  human light is drowned; the camera zooms out fast.
- **0.80–1.00 / The Universe** — the whole cloud distributes into a cold,
  2D-like star map. Camera stops. The final quote and the science link hold.

The top navigation is **Being unseen · the science · Being seen**. The Home
film has its own fixed nav, progress rail and text; Science and Being seen still
use the previous shell until their rebuild.

## Home film structure

| Scroll | Stage | Particle action | Copy |
|---|---|---|---|
| 0.00–0.20 | 01 / The Intrinsic | dim stardust human → compact sphere; camera centred, slight zoom in | “Sometimes, the deepest parts of us remain unseen, no matter how hard we try to show them.” |
| 0.20–0.40 | 02 / The Collapse | implosion → absolute black core + extremely flat rotating accretion/photon disk; camera orbits | “Here, stellar black holes emit no light either. They exist, but they are completely dark.” |
| 0.40–0.60 | 03 / The Flash | ring → blue magnetar + two polar beams; flash; camera shake, pull back | “Fast Radio Bursts (FRBs) last only milliseconds. If our telescopes blink, we miss them forever.” |
| 0.60–0.80 | 04 / The Extrinsic | magnetar → standing human; crowd rushes in at 0.70 with GW ripples; human drowned; camera zooms out | “Sometimes, we are shining, but the distance or the noise of the environment makes us fade into the background.” |
| 0.80–1.00 + 100vh tail | 05 / The Universe | human held and shrinking with the dolly-out until 0.95, then all particles drift into the pale-blue / gold / white star map; pinned 100vh hold | “We are made of stardust, yet we share the same blindness as the cosmos.” |

All body copy is the brief’s text, verbatim. Extra text is limited to the stage
labels, the scroll cue, the rail label and the final science link. The film is
scroll-driven, never autoplaying.

### The single points cloud

- **40,000 particles total**: 16,000 human particles and 24,000 crowd/star
  particles.
- Seven target arrays — `run`, `ball`, `stand`, `hole`, `magnetar`, `crowd`, `star` —
  built once in `src/particle/targets.ts`. Scroll interpolates the live
  `Float32Array` position attribute between them. No per-stage object is ever
  mounted or unmounted.
- The human is a **3D stardust cloud**, not a 2D mask and not a visible rig:
  soft ellipsoid/capsule volumes are sampled and then displaced with
  low-frequency value noise. There is no pixel cut-out, no bounding box, no
  face, no eyes and no model. The run is a forward-leaning spray with one
  reaching hand; the stage-1 end is a tight dense sphere; the stage-4 return is
  an upright stand with a subtle head sway.
- Human roles: **ring**, **core**, **beam**. At the black hole stage the core
  particles are alpha-0, which is what creates the pitch-black centre; at the
  magnetar stage the same particles ignite; at stage 4 all roles return to the
  human; at stage 5 they become stars.
- The crowd only exists as the 24,000 role-3 particles. They wait far outside
  the frame, then move in at 0.70–0.80. Their alpha is separate from the human,
  so the human can genuinely be drowned.
- The shader computes colour/opacity/size from five stage weights plus
  `uFlash`, `uWarm`, `uTime` and `uPixelRatio`; the photon ring is a local
  shader boost near radius 0.99. Stage 1 uses pale-gold stardust; the accretion disk grades from deep orange
  at the outer edge to bright yellow at the inner edge; the magnetar flash is
  electric cyan/blue-white; Stage 5 mixes pale-blue, faint-gold and pure-white
  stars. `AdditiveBlending`, `depthWrite:false`,
  `depthTest:false` on the single object; the text sits above it at z-index 2
  with `pointer-events:none`.
- `src/particle/ParticleCamera.tsx` owns the five moves: zoom out, orbit,
  shake + pull-back, rapid dolly out, stop. Stage 5 is unchanged.

### Text and accessibility

The HTML text is a fixed overlay above the canvas; the canvas is `z-index:0`,
the text `z-index:2`, the nav/rail above that. Only the final science link
re-enables pointer events. A screen-reader `h1` names the film; the visible
stage labels are the act titles.

### Audio

No audio yet. When music arrives it will have a persistent mute toggle and will
not autoplay before a user gesture.

## Shot preview — side run to front (unlisted)

`/shot-preview` remains a separate camera test, not the Home film:

- `0.00`: camera on the figure’s side (+x); the figure runs in profile.
- `0.50`: 45° three-quarter; the camera has dollied partway in.
- `1.00`: camera in front (+z), radius 6.2 → 4.2; the figure is front-on.

The Home film now uses the single-points particle system described above. The
shot preview is kept as an isolated test bench for a possible future Hero shot;
it is not wired into the five-stage film.

## Figure preview (unlisted)

`/figure-preview` is kept as a test bench for the faceless 13-bone star figure
used by the previews. It still has the sequence slider, Run / Sit, Play sequence
and Stop; query helpers are `?t=0.6` and `?demo=1`.

## Routes and hierarchy

| Route | Level | Content |
|---|---|---|
| `/` | Being unseen | the five-stage single-point film |
| `/science` | the science | previous frame: index of the three chapters (rebuild next) |
| `/science/supernovae` | child | 01 Lensing & Supernovae (frame) |
| `/science/fast-radio-bursts` | child | 02 Lensing & Fast Radio Bursts (frame) |
| `/science/gravitational-waves` | child | 03 Gravitational Wave Lensing (frame) |
| `/message-board` | Being seen | previous frame: the star-map board (next pass) |
| `/figure-preview` | unlisted | the faceless figure test bench |
| `/shot-preview` | unlisted | side run → camera in → front (camera test) |

## Local development

```bash
cd site-v2
NODE_BIN=/Users/eva/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node \
PNPM_BIN=/Users/eva/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.mjs \
./run.sh dev
```

- dev: http://localhost:3100
- build: `./run.sh build`
- typecheck: `./run.sh typecheck`

## Verification

- `tsc --noEmit` clean.
- `vite build` clean; static `dist/`.
- Headless Chrome at 1440×900 and 390×844: one canvas, no console errors, no
  horizontal overflow; the five stages rendered; the final quote and science
  link fully visible.
- The film uses one `<points>` only; the old separate-object film files were
  removed.

## Layout

```
site-v2/
  index.html
  vercel.json            Vite build + SPA rewrite
  src/
    App.tsx              router: /, /science/*, /message-board, previews
    content.ts           hierarchy, brief copy, chapter scaffolding
    styles.css           frameless editorial layout
    components/
      SiteShell.tsx      shell for the science / Being seen frames
      Nav.tsx            Being unseen / the science / Being seen
      ScienceNav.tsx     secondary nav inside the science
      Stage.tsx          old black-hole stage for those frames
      ProgressRail.tsx   right-edge scroll indicator
    particle/
      humanCloud.ts      noisy 3D ellipsoid/capsule human clouds (run/ball/stand)
      targets.ts         run/ball/stand/hole/magnetar/crowd/star target arrays
      ParticleCloud.tsx  the one THREE.Points + shader + morph
      ParticleCamera.tsx five-stage camera move
      ParticleScene.tsx  the fixed Canvas, bloom, background
    shot/
      shotMotion.ts      side→front camera + figure travel constants
      ShotCamera.tsx     the orbit/dolly
      ShotScene.tsx      figure + star field for the shot
    film/
      StarSea.tsx        star field used by the shot test
    figure/
      pose.ts            run / reach / sit / stand target joints
      HumanFigure.tsx    faceless 13-bone star figure, preview + shot
      FigureScene.tsx    preview camera, dust, bloom
    pages/
      FigurePreviewPage.tsx  unlisted /figure-preview test bench
      ShotPreviewPage.tsx    unlisted /shot-preview test bench
      HomePage.tsx           five-stage film, fixed text, science link
      ScienceLayout.tsx
      ScienceOverview.tsx
      ScienceChapterPage.tsx
      MessageBoardPage.tsx
    scene/
      Scene.tsx          fog, composition
      Starfield.tsx      distant star shell
```

## Deploy

The `being-seen-website-z59h` Vercel project points at `site-v2`:

- Root Directory: `site-v2`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Node: 20.x or 22.x
- SPA rewrite in `site-v2/vercel.json`

The old clean URL `being-seen-website.vercel.app` is a separate Next.js
project; the current site is `being-seen-website-z59h.vercel.app`.
