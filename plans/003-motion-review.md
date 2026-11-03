# Refactor and exit motion review

| Before | After | Why |
| --- | --- | --- |
| Exit brakes at formation, then restarts | Shared rightward velocity across the formation and departure boundary in src/scripts/swarm-paths.ts:53 | Keeps the line moving continuously, following the recording's flowing motion |
| Playback, scene construction and math share one large function | Controls in swarm-intro.ts, construction in swarm-scene.ts, geometry in swarm-paths.ts, snapshots in swarm-dom.ts | Smaller responsibilities and readable names; no runtime dependency added |
| Unused fade state and legacy styles remain | One cleanup path in src/scripts/swarm-intro.ts:64; obsolete surface/edge/label styles removed | Fewer branches and selectors to maintain |

## Origin, physicality and cohesion

The exit preserves the 420ms formation and 600ms rightward departure. Initial velocity comes from the existing cursor path. The formation ends with the same rightward velocity as the departing row, instead of stopping. A numerical check across the boundary measured approximately 1.19px/ms immediately before and 1.36px/ms immediately after; the exact shared tangent is 1.36px/ms in that test. Discrete samples converge on that tangent. Cursor positions are sampled once; playback uses native transform animation.

The recorded build choreography, 14 cursors, character typing, sizing, duplicate step, right-aligned Felix, timing and controls are retained. Frozen frames at 3400ms and 5200ms on desktop and mobile matched the pre-refactor baseline, with less than 0.005% pixel variation.

## Interruptibility and accessibility

Browser checks pass for pause/resume, speed changes, replay, Skip/Escape, toolbar keyboard focus, reduced motion, resize cancellation, automatic removal of scene nodes, restored navigation, resume links and no-JavaScript content. Astro's development-only toolbar was hidden for interaction checks because it intercepted clicks near the bottom; no production behavior was changed for the test.

## Code cleanup

Source comments were removed at the user's explicit request, including stylesheet stamps and configuration comments. Documentation remains in Markdown. Source scan reports no comments in src/, public/, or astro.config.mjs. Production build and git diff whitespace checks pass.

## Verdict

Approve. No remaining blocking motion or functionality regression found in this change. Physical-phone feel remains unverified; the owner can assess the exit at /?intro=1.
