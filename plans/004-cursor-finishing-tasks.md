# Cursor finishing tasks

Superseded by 005-faster-monochrome-color-dialog.md: one dialog owner, one idle eyedropper, and a shorter timeline.

Implemented 2026-11-08. Preserve the existing portfolio design and final formation/departure. Give available cursors distinct finishing jobs before departure, with no repeated checks or undo loops.

Skills used: animate for implementation, antislop-ui for restraint and consistency, find-animation-opportunities for the motion opportunities below, and the installed UI UX Pro Max skill for UX guidance on meaningful, finite motion. This is a rare explanatory introduction. Existing palette, type, layout and easing tokens remain the design direction.

| Location | Opportunity | Purpose | Frequency | Motion |
| --- | --- | --- | --- | --- |
| swarm-scene.ts sample helper | Idle cursors transfer existing text and fill colors | Explanation and state indication | First visit or replay | 260ms eyedropper hold, visible straight eased travel, 220ms opacity crossfade to the final color |
| swarm-scene.ts palette sequence | Choose the final panel blue from the existing palette | Explanation | First visit or replay | Three 260ms swatch selections, 620ms apart; 220ms alternative-fill crossfades, then a 420ms crossfade to the final blue |
| swarm-scene.ts corner sequence | Square panel becomes the finished rounded panel | State indication | First visit or replay | 420ms corner-handle movement using cubic-bezier(0.77, 0, 0.175, 1); static square and rounded surfaces crossfade using opacity |

Rejected: repeated measurements of finished elements, trial-and-undo typography loops, and additional navigation/keyboard animations. These fail purpose, frequency or task scope. The requested color exploration is a single palette pass that keeps its final choice.

Cursor arrows retain black outlines. The new eyedropper SVG has a black outline and shares the same coordinate anchor as the other tools. All cursors stay visible; typing position interpolation and travel between tasks remain continuous. Travel uses existing easing and sampled native transform animations. Construction and finishing last 7600ms, followed by the existing final scene. Reduced-motion users retain the existing bypass.

The animated editor panels use existing colors and fit within the document client width, including the reserved scrollbar gutter. Only the temporary introduction changes; the final site retains its existing colors and corner radii.

Verification: Chrome checks at 320, 375, 768, 1280 and 1920px widths, each at 900px height. Check finite cursor trajectories and per-keyframe travel below 6 CSS px/ms at normal speed, persistent visibility, visible eyedropper states, completed fill and corner effects, panel bounds, pause/resume, speed, normal completion, cleanup, replay, session memory and reduced motion. Repeatable script: .hallmark/qa/finishing-cursors-check.mjs. Screenshots: .hallmark/shots/finishing-*.png. Physical phone testing remains a manual feel check.
