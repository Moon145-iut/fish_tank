# Guppy Gang — your friends, but fish

A cozy, single-owner 3D aquarium built with **vanilla JavaScript, Three.js, and Vite**. Make cartoon fish for your real-life friends, watch their personalities unfold, and decide who gets a snack.

There are no accounts, invitations, multiplayer, chat, remote databases, notifications, self-fish, or external assets. All fish are created and fed manually by the aquarium owner. The built app works without internet when served locally.

## Run

Use Node.js **20.19+ or 22.12+** (tested with Node 24.10).

```sh
npm install
npm run dev
```

Open the local address Vite prints, normally **http://localhost:5173**.

```sh
npm test
npm run build
npm run preview
```

The production build is in `dist/`. Serve that directory with any static HTTP server. Opening `index.html` directly with `file://` is not supported. The old `index-cdn.html` now redirects to the local app; no CDN connection is used.

## Playing

- A fresh tank starts with **Rafi**, an orange dramatic pufferfish; **Sami**, a blue chaotic guppy; and **Nila**, a sleepy purple angelfish.
- Click/tap a 3D fish or select it in **Your Fish**. The profile shows hunger, health, happiness, permanent growth, and its complete retained meal/excuse history.
- **Needs Attention** lists fish with hunger of at least 65, most hungry first. Hover, keyboard-focus, or tap a card to access Feed and Don’t Feed. Phone actions are always visible.
- **Feed** drops three physical food pellets. Only the chosen fish approaches and bites them. A completed meal awards stats once, produces a thank-you bubble and particles, and smoothly grows the fish.
- **Don’t Feed** requires a 3–160-character written excuse. Cancel and Escape do nothing to stats. Submitted excuses persist as plain text, lower happiness, and cause a short sulking reaction.
- **Add a Friend** supports a name, three species, eight primary colors, custom accent color, five personalities, and an optional tagline. The illustrated preview reflects the choices.
- Edit or remove a fish in its profile. Deleting during a feed cancels its pellets and never awards the interrupted meal.
- Mouse-drag gently to orbit, scroll to zoom, or use **Reset camera**. Phone swipes preserve page scrolling; tap fish to select them.
- **Night mode** changes lighting and water atmosphere and survives reloads.
- **Settings → Reset Demo Aquarium** requires confirmation and recreates the three starter fish.

The tank supports **12 fish**. An intentionally empty aquarium stays empty after reload.

## Exact game rules

Hunger means how hungry a fish is: **0 = full, 100 = very hungry**.

| Rule | Value |
| --- | --- |
| Hunger gain | 5 per real elapsed hour |
| Offline progress cap | 24 hours per simulation update |
| Hungry alert | 65 or higher |
| Feed availability | Hunger 10 or higher |
| Completed meal | −35 hunger, +12 happiness, +4 health, +15 XP |
| Valid refusal | −8 happiness; hunger and XP unchanged |
| Health minimum | 40; fish never die |
| Growth stages | Tiny Fry: 0 XP; Growing Buddy: 45 XP; Absolute Unit: 105 XP |
| Permanent size | `1 + min(0.55, xp / 200 * 0.55)`, up to 155% |

Above 90 hunger, health and happiness gradually decline only for the time spent above the threshold. Feeding heals. Frame rate does not determine hunger progression.

## Project map

```text
index.html                 Semantic application shell
src/main.js                Composition, shared actions, lifecycle
src/styles.css             Responsive UI, accessibility, avatar previews
src/scene/
  aquarium.js              Renderer, camera, lighting, tank, procedural decor
  fishFactory.js           Three distinct procedural meshes and expressions
  fishController.js        Bounded steering and interaction state machine
  effects.js               Pooled bubbles/particles and physical pellets
  interaction.js           Canvas-relative raycasting and drag detection
src/game/
  defaults.js              Constants, species, personalities, starter fish
  rules.js                 Pure stat, elapsed-time, and growth calculations
  persistence.js           Schema validation, defensive local saves, migration
  store.js                 Authoritative state and exactly-once meal tokens
  dialogue.js              Curated dialogue and nonrepetition
src/ui/
  dashboard.js             Live attention cards, roster, activity
  fishPanel.js             Selected fish, meters, actions, full history
  modals.js                Creation/editing, excuses, confirmations, settings
  overlays.js              Projected speech/name labels and toasts
  dom.js                   Safe DOM helpers
tests/
  rules.test.js            Pure rules and transaction lifecycle tests
  persistence.test.js      Save validation, round trips, migration, errors
  browser.mjs              Desktop/tablet/mobile end-to-end acceptance
  browser-edge.mjs         Empty/full tanks, touch, XSS text, failure states
```

## Persistence and reliability

The app uses the versioned localStorage key **`fishFriends:v1`**. It saves meaningful actions and updates wall-clock progression every 30 seconds, on visibility changes, and when leaving the page. It stores at most 100 global events and 40 events per fish. Temporary movement, selection, pellets, and pending feeds are not saved.

Invalid saves fall back safely. Blocked/full storage leaves the app playable and displays a warning. Closing or reloading during an unfinished meal does not award that meal. Clearing browser data removes the aquarium; browser/device synchronization is intentionally absent.

The earlier prototype’s `guppy-gang-v1` roster is migrated when no valid new-format save exists. Names, colors, hunger, health, meal counts, and corresponding XP are retained. Old portrait uploads and unstructured prototype activity are not imported. The old key is preserved.

The scene uses one renderer and one animation loop, a ResizeObserver, capped pixel density, clamped animation delta, pooled particle instances, merged plant geometry, and explicit fish resource disposal. WebGL 2 failure shows an actionable fallback; the roster remains manageable, but feeding is disabled until graphics are available.

API references: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer) and [OrbitControls](https://threejs.org/docs/pages/OrbitControls).

## Browser checks

With the development server running:

```sh
npm run test:browser
```

On Windows the script uses installed Microsoft Edge. On other platforms, install Playwright’s Chromium once with `npx playwright install chromium`. Browser tooling is a development dependency and is not shipped in the app.

The checks use isolated browser profiles and do not modify your personal aquarium. Screenshots are written to ignored `artifacts/`. The read-only `window.__aquariumDiagnostics()` helper exists only in Vite development mode for verifying actual scene positions, food, and picking.

## Scope and limitations

- No audio is included; thank-you and reaction dialogue appears in speech bubbles.
- The creator preview is a lightweight species/color illustration; the aquarium fish themselves are real animated 3D geometry.
- There is no cloud sync, export/import UI, or installation/service-worker flow.
- WebGL 2 and a modern browser are required for the animated scene. Device-specific GPU performance can vary.
- Vite may report the Three.js vendor chunk above its 500 kB warning threshold (about 150 kB gzip). The production build succeeds.

