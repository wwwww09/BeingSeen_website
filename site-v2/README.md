# Being Seen — site-v2

A new, independent build. The old site is untouched; this project shares the
repository but not the code, the layout, or the writing.

The Home page is now a complete, scroll-driven five-act film. A small,
faceless human made of star points runs at the camera, reaches for it, folds
into himself, becomes a blue magnetar, is swallowed by a crowd, and finally
dissolves into a globular cluster. The Science and Being seen sections are
still their previous structural frames; their rebuild is the next pass.

- **Vite + React 19 + TypeScript** — the build output is static `dist/`
- **React Three Fiber / Three.js** — one fixed canvas for the film
- **Framer Motion** — scroll progress, fixed text fades, act rail
- **Supabase JS** — installed, to be wired up in the message-board pass

## Status — Home film (0.4)

The film is built end to end and driven by scroll:

- Hero: the figure runs toward the camera in darkness.
- Act 1 / The Intrinsic: he reaches, then folds and sits; a stellar black hole forms at chest height with a photon ring, a tilted accretion disk and a lensing halo.
- Act 2 / The Temporal: the black hole spins into a blue magnetar with a cracked wireframe, dipole field rings and polar beams; it fires a brief FRB flash.
- Act 3 / The Extrinsic: he stands; a crowd of glowing silhouettes rises behind him and swallows his light.
- Act 4 / The Unseen: the crowd loses its human outlines and becomes a globular cluster of 14,000 stars; he fades into it.
- CTA: the quiet cluster field and the link into **the science**.

The top navigation is now **Being unseen · the science · Being seen**. The Home
film has its own fixed navigation and progress rail and lives outside
`SiteShell`; the Science and Being seen routes still use the previous shell
and black-hole stage until their rebuild.

## Home film structure

| Scroll | Stage | Visual | Copy |
|---|---|---|---|
| 0.00–0.13 | Hero | figure in the dark, running at the lens | badge, hook, "Invisibility takes three forms:" |
| 0.13–0.34 | 01 / The Intrinsic | reaches, folds, sits; stellar black hole forms | "Sometimes, the deepest parts of us remain unseen..." / "Here, in the cosmos, stellar black holes emit no light either..." |
| 0.34–0.56 | 02 / The Temporal | magnetar: blue star, field rings, polar beams, FRB flash | "Fast Radio Bursts (FRBs) last only milliseconds..." / "Sometimes, we are only visible for a brief moment..." |
| 0.57–0.78 | 03 / The Extrinsic | stands; crowd appears; camera pulls wide | "Sometimes, we are shining, but the distance or the noise..." / "Out in the universe, light gets absorbed..." |
| 0.78–0.90 | 04 / The Unseen | crowd becomes a 14,000-point globular cluster; figure fades | "We are made of stardust, yet we share the same blindness as the cosmos." |
| 0.91–1.00 | CTA | cluster + star field | "Interested in the theory behind? click" / **Explore the Science** |

All body copy is the updated brief's text, verbatim. The only added text is the
film title **Being unseen**, the act labels, the scroll cue, and the rail label.
The film is scroll-driven, not autoplaying: scroll from the top to the bottom
to run all five stages.

### Figure

- The figure is the original small, faceless star figure: a 13-bone skeleton
  plus a spherical head, sampled into about 70,000 star points. There is no
  face and no eyes; the body is read from the density of the stars.
- Star sprites have a core, four-point flares and a soft halo; the points
  twinkle and drift, with inner-volume, outer-halo and small cluster layers.
- The film states are authored from run → reach → sit → stand; the figure fades
  out as the crowd becomes stars. The same component powers `/figure-preview`.
- There is no hollow chest and no realistic human model. The cosmic objects are
  separate from the figure.

### The cosmic objects

- **Stellar black hole** (Act 1): event horizon, thin photon ring, tilted
  accretion disk generated from the old runtime disk texture, and a faint
  lensing halo at chest height.
- **Magnetar** (Act 2): a blue neutron star, a cracked crust, curved dipole field
  lines, polar hot spots and beamed emission, and a short FRB glow. The screen flash is
  deliberately brief and not a solid sphere.
- **Globular cluster** (Act 4): 14,000 stars in a King-like concentration with
  a bright core and halo; it replaces the crowd's outlines.

### Crowd and stars

- 1,600 soft human silhouettes in an instanced additive field behind the
  figure. The camera pulls back until they lose their outlines.
- The same crowd positions become a point cloud as the silhouettes fade; a
  6,500-point star sea and the 14,000-point globular cluster take over.

### Audio

No audio yet. When the music arrives it will have a persistent mute toggle and
will not autoplay before a user gesture.

## Shot preview — side run to front (unlisted)

`/shot-preview` is a single camera test, not the finished film:

- `0.00`: camera at the figure's side (+x); the figure is running in profile.
- `0.50`: 45-degree three-quarter view; the camera has dollied partway in.
- `1.00`: camera in front (+z), radius reduced from 6.2 to 4.2; the figure is front-on.

The figure keeps its run and a small +z travel; the camera tracks that travel
while it orbits, so the change is only the viewpoint. The shot is 8.5 seconds
and can be scrubbed, so a wrong frame can be named by its value.

The Home film is deliberately **not** changed yet. Once this shot is approved,
it replaces the Hero camera in `HomePage`/`HumanFigure`; the rest of the film
stays as it is.

## Figure preview (unlisted)

`/figure-preview` is kept as a test bench for the faceless star figure that
now drives the film. It still has the sequence slider, Run / Sit, Play sequence
and Stop; query helpers are `?t=0.6` and `?demo=1`.

## Routes and hierarchy

| Route | Level | Content |
|---|---|---|
| `/` | Being unseen | the complete five-act film |
| `/science` | the science | previous frame: index of the three chapters (rebuild next) |
| `/science/supernovae` | child | 01 Lensing & Supernovae (frame) |
| `/science/fast-radio-bursts` | child | 02 Lensing & Fast Radio Bursts (frame) |
| `/science/gravitational-waves` | child | 03 Gravitational Wave Lensing (frame) |
| `/message-board` | Being seen | previous frame: the star-map board (next pass) |
| `/shot-preview` | unlisted | side run → camera in → front (camera test) |

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

- `tsc --noEmit` clean
- `vite build` clean: the initial Home text/nav is **135.7 kB gzip**; the film
  scene (3.9 kB gzip), shared 3D chunk (242.1 kB gzip) and figure code
  (25.5 kB gzip) load lazily after the WebGL probe. No external model is shipped.
- headless Chrome at 1440×900: the Home film checked at ten scroll positions
  from Hero to CTA; one canvas; no console errors; no horizontal overflow.
- the CTA is fully visible at 390×844; the mobile film checked at six positions;
  no horizontal overflow, no clipped text.
- the fixed text blocks are readable over the crowd and the flash; the CTA link
  is keyboard-focusable.
- `/figure-preview`: canvas renders, sequence slider/demo run, no errors at
  1440 and 390.
- `/science` and `/message-board` still load through the old shell with their
  nav active states; one canvas each.
- WebGL-disabled Home falls back to a static deep-space gradient; all copy and
  the CTA remain readable.
- direct visits to the film, the science chapter and the figure preview were
  checked against production `vite preview`.

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
      SiteShell.tsx      shell for the science / Being seen frames
      Nav.tsx            Being unseen / the science / Being seen
      ScienceNav.tsx     secondary nav inside the science
      Stage.tsx          old black-hole stage for those frames
      ProgressRail.tsx   right-edge scroll indicator
    shot/
      shotMotion.ts       side→front camera + figure travel constants
      ShotCamera.tsx      the orbit/dolly
      ShotScene.tsx       figure + star field for the shot
    film/
      FilmScene.tsx      fixed Canvas, bloom, star sea, crowd, figure
      FilmCamera.tsx     one continuous five-act camera move
      CrowdField.tsx     1,600 silhouettes -> point stars
      StarSea.tsx        6,500-point surrounding star field
      StarCluster.tsx    14,000-point globular cluster
      CosmicCore.tsx     stellar black hole + magnetar
    figure/
      pose.ts             run / reach / sit / stand target joints
      HumanFigure.tsx     faceless 13-bone star figure, preview + film
      FigureScene.tsx     preview camera, dust, bloom
    pages/
      FigurePreviewPage.tsx  unlisted /figure-preview test bench
      HomePage.tsx       five-act film, fixed text, CTA
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
