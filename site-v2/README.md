# Being Seen — site-v2

A new, independent build. The old site is untouched; this project shares the
repository but not the code, the layout, or the writing.

The shell is a full-screen WebGL stage with a scroll-driven story on top of it:

- **Vite + React 19 + TypeScript** — the build output is static `dist/`
- **React Three Fiber / Three.js** — one fixed canvas behind the whole document
- **Framer Motion** — scroll progress, viewport reveals, reduced-motion handling
- **Supabase JS** — installed now, wired up in the guestbook pass

## Status — skeleton 0.1

This pass establishes the shell only:

- fixed full-viewport R3F canvas (starfield + lens body + orbit particles)
- `useScroll` → camera dolly, lens scale, hairline progress
- Framer Motion chapter reveals and hero fade
- responsive, frameless editorial layout (no cards, no panels)
- graceful fallback when WebGL is unavailable
- `prefers-reduced-motion` honoured by both CSS and the scene

The science copy, charts, and guestbook are deliberately **not** written yet.
The four chapters in `src/content.ts` are placeholders.

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

### Skeleton verification (this pass)

- install resolved 120 packages with no peer warnings
- `tsc --noEmit` clean
- `vite build` clean: initial chunk **118.9 kB gzip**, lazy 3D chunk **243.5 kB gzip**
- headless Chrome: 1 canvas on the hero, no console errors, no horizontal
  overflow at 390 px, all four chapters reveal on scroll
- production `vite preview` re-checked through the same pass

Versions: React 19.3.1 · React Three Fiber 9.8.2 · three 0.186.1 ·
framer-motion 14.5.0 · Vite 8.3.5 · Node 24.21.0

## Deploy

Create a **new** Vercel project (leave the old site's project alone):

1. Import the same GitHub repository.
2. Set **Root Directory** to `site-v2`.
3. Vercel detects Vite; build `pnpm build`, output `dist`.
4. Add the Supabase variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`) when the guestbook pass lands.

`vercel.json` in this folder pins the build command and output directory, so
the dashboard only needs the root directory.

## Layout

```
site-v2/
  index.html
  src/
    App.tsx              scroll track, chapters, hero, outro
    content.ts           placeholder chapter copy
    styles.css           frameless editorial layout
    components/
      Stage.tsx          fixed Canvas + WebGL fallback
      Nav.tsx            wordmark, chapter anchors, progress hairline
      ProgressRail.tsx   right-edge scroll indicator
    scene/
      Scene.tsx          fog, lights, composition
      Starfield.tsx      distant star shell
      LensCore.tsx       body, rings, orbital particles
      dotTexture.ts      soft round point sprite, generated at runtime
      CameraRig.tsx      scroll-driven camera
    lib/
      useWebGL.ts        capability probe
  run.sh                 local runner (macOS signing workaround)
  vercel.json            Vite build + dist output
```

## Why a separate workspace

`site-v2/pnpm-workspace.yaml` makes this folder its own pnpm root. Its
dependencies install into `site-v2/node_modules` and cannot leak into the old
site's install at the repository root.
