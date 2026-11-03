# 003 — Simplify animation code and preserve exit momentum

Status: DONE
Commit: bb26182

The user authorized source-comment removal, code simplification and smoother motion. Audit/planning uses improve-animations; execution uses animate and animation-performance; verification uses review-animations.

| Severity | Location before changes | Finding | Fix |
| --- | --- | --- | --- |
| MEDIUM | src/scripts/swarm-intro.ts:278 | Two easing segments brake at formation, then restart | Preserve starting velocity and use a shared rightward tangent through formation |
| LOW | src/scripts/swarm-intro.ts:90 | Unused fade branch and exit state complicate lifecycle | Keep one immediate cleanup function after the animated departure |
| LOW | src/styles/global.css:96 | Obsolete canvas-era surface/edge/caret and label styles remain | Remove only selectors absent from runtime markup |

The introduction is a rare presentation effect. Preserve build timings, 14 cursors, title alignment, typing, duplication, toolbar, pause/speed, Skip/Escape, session behavior, reduced motion, focus, responsive layout, links and resume.

Execution: extract existing spline/easing calculations and DOM snapshot helpers into named modules. Keep code readable and unminified. Remove source comments as explicitly requested. Move existing motion geometry unchanged into helpers; keep documentation in Markdown. Replace only the final cursor path with sampled cubic-Hermite segments. Preserve the 420ms formation and 600ms exit durations. Initial tangent comes from the existing trajectory; the formation tangent is the final line's shared rightward velocity (exit displacement / 600ms). The second segment continues at that velocity, so the row never stops. Sample once and animate transform/opacity with native WAAPI. Existing easing tokens stay cubic-bezier(0.23, 1, 0.32, 1) and cubic-bezier(0.77, 0, 0.175, 1).

Verify production build, zero source comment tokens, unchanged frozen build frames at 3400/5200ms on desktop/mobile, aligned row at 5870ms, all cursors off-screen before handoff, and continuous velocity at the formation boundary. Check normal completion, pause/resume/speed, replay, Skip/Escape, keyboard focus, reduced motion, resize cleanup, no-JavaScript content and navigation. Record any visual verification limits; desktop emulation does not verify physical-phone feel.
