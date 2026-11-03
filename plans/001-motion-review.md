# Swarm intro motion review

Reviewed with review-animations/STANDARDS.md after executing plan 001. Scope: the introduction only; no new runtime dependencies.

| Before | After | Why |
| --- | --- | --- |
| Integer glyph positions moved typing cursors in steps | Shared-tangent spline paths, sampled once, then played as native transform animations (`src/scripts/swarm-intro.ts:13`, `:254`) | Position and velocity continue through task boundaries; soft edge constraints avoid hard viewport stops |
| Buttons and folders appeared at fixed thresholds | Staged 420ms arrivals, 40ms navigation stagger, shared clock (`src/scripts/swarm-intro.ts:151`, `:273`) | Appropriate for a rare presentation intro; no changes to frequent navigation interactions |
| Full-screen canvas rasterized text on every JS frame | Inert DOM replicas and moving transform-only cover layers (`src/scripts/swarm-intro.ts:32`, `:187`) | Actual font metrics and rounded surfaces survive the final handoff; no glyph raster loop |
| Text revealed ahead of its typing cursor | Caret, cover, and cursor share the same sampled path (`src/scripts/swarm-intro.ts:234`) | The visible build matches the cursor's position |

## Performance

Final desktop Chrome sample: 190 frame intervals over approximately 3.2 seconds; median 16.7ms, p95 16.9ms. Two intervals exceeded 33.4ms while a production build ran concurrently. No long tasks; two Layout events and four Paint events totaling 0.54ms, rather than a paint on every frame. This is a desktop sample, not a guarantee for physical phones. Trace and raw metrics are in ignored .hallmark/qa/ artifacts.

## Interruptibility and timing

Skip and Escape end immediately. Replay requests are guarded during preparation/playback/exit. Animations, timers, scene nodes, inert state, scroll lock and focus are cleaned up on completion or interruption (`src/scripts/swarm-intro.ts:70`, `:87`). The deliberate presentation lasts 4600ms; the final handoff is 220ms using the existing ease-out token. Longer presentation timings do not affect navigation. Explicit keyboard activation of Play intro remains supported; unrelated keyboard actions gain no motion.

## Origin, physicality and cohesion

No text scaling, scale(0), layout-property animation, heavy filters, or animation-library dependency. Blue field and text covers move through clipped static containers. The final covers fade out after typing, restoring the complete selection outline before the handoff. Frozen desktop/mobile frames were inspected at 0, 1400, 2400 and 4500ms.

## Accessibility

Reduced motion avoids the moving scene and keeps the static portfolio and explanation. Switching the setting during playback cancels safely. Focus stays on Skip while the rest of the page is inert; focus returns to Replay after manual playback. Existing no-JavaScript content and anchor-visit behavior pass.

## Verdict

Approve: no remaining code-level feel-breaking regressions found. Build, original interaction suite, direct replay suite, live preference/resize interruption, exact scene geometry, duplicate-ID checks, cleanup and frozen frame inspection pass. Physical-phone motion feel remains for the owner to assess via /?intro=1.
