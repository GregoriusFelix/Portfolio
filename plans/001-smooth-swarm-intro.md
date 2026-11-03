# 001 — Smooth the swarm introduction

- Status: DONE
- Commit: 4113857
- Severity: HIGH
- Categories: physicality, performance, timing
- Scope: src/scripts/swarm-intro.ts, intro scene markup in src/pages/index.astro, intro-only styles in src/styles/global.css

## Problem

`src/scripts/swarm-intro.ts:174` selects integer glyph positions with `Math.floor`, making typing cursors jump. Lines 153 and 166 reveal buttons/folders abruptly at fixed timestamps. Lines 135–185 redraw a full-screen canvas and individual glyphs on each animation frame. The approximate canvas typography, square corners, and missing details also make the final handoff visible.

## Target

Use browser-native Web Animations API timelines and detached DOM replicas of the actual page. Preserve the original typography and folder geometry. Animate transform and opacity only. Generate continuous cubic-Hermite cursor paths once before playback; no glyph-index movement or JS frame loop. Use the existing `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for arrivals and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for scene choreography. Constant-rate path samples use linear interpolation because their trajectory already includes velocity. Use 420ms group arrivals, 40ms nav stagger, 650ms title wipes, 700ms surface wipe, 220ms final exit, and a 4600ms finite presentation timeline. The longer timings are reserved for this rare first-visit introduction, not navigation.

## Repo conventions

Root motion tokens are in src/styles/tokens.css. The entry point is initSwarmIntro(). Session key is felix-portfolio:intro-v1. A direct /?intro=1 link forces replay; ordinary anchor visits skip it. Keep all these behaviors.

## Steps

1. Replace the decorative canvas with an aria-hidden inert scene container.
2. Batch geometry and token reads, then build detached clones of the visible header, hero sheet, caption, and first folder. Strip clone IDs and focusability.
3. Reveal the blue field through a translated clipped layer, leaving text unscaled. Reveal actual cloned title text using translated blue cover layers. Sequence header/nav/labels/actions/folder with opacity and small transforms.
4. Animate six SVG cursor elements with sampled continuous paths, including an initial orbit, arrival at their own task, smooth drawing/typing motion, and departure. Match type paths to reveal timing and constrain labels to the viewport.
5. Use one shared timeline epoch. Cancel all animations on Skip, Escape, resize, tab hiding, reduced-motion changes, errors, and completion. Clear clones and temporary compositor hints. Preserve focus restoration, inert state and scroll position handling.
6. Respect reduced motion without instantiating the scene; retain current explanation.

## Boundaries

Do not change portfolio content, resume, links, projects, typography, overall design, routes or unrelated working changes. No new runtime dependencies. No upstream animation code is copied.

## Verification

Run npm.cmd run build with ASTRO_TELEMETRY_DISABLED=1. Browser-test automatic playback, direct replay after a seen session, Skip/Escape, natural completion, focus containment/restoration, rapid Replay, reduced motion before/during playback, resize/tab interruption, no-JS rendering, and 320/375/1280/1920 sizes. Freeze native animations at start/mid/end for screenshots; inspect exact final geometry and unclipped text. Capture a Chrome trace across the motion window and report Layout/Paint and long tasks honestly. At slow playback, cursor paths must not teleport at task boundaries. Physical phone feel remains a manual check.

## Missed opportunities

- A coherent cursor departure can finish the build rather than stopping motion abruptly.
- Matching the actual live DOM removes the approximate canvas-to-page seam.
