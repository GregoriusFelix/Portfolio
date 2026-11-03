# Recording-matched swarm intro

Implemented against the supplied 10.333-second recording, inspected as 12 frames across its duration. No extension source code was reused.

- 14 small colored cursors gather around a rounded gray monogram, then fan out and wander.
- Drag-to-size blue panel, selection handles, crosshair and I-beam tools, live measured dimensions.
- Character-boundary text masks; first name is typed small and sized up; duplicate-and-retype sequence builds the second line.
- Compact toolbar with real completed-layer count, progress, Pause/Resume, 1x/2x/3x and Close.
- Automatic entry after the approximately 10-second sequence, explicitly selected by the user.
- Existing portfolio content, Gregorius Felix name, resume and links preserved.

Build and Chrome checks pass: matched-timestamp frames at 1706x900; 320px/375px layout; 14 cursors without name labels; keyboard focus across toolbar buttons; speed changes; normal-speed automatic completion; late pause/resume preserving completed layers; reduced motion before/during playback; resize cleanup; no-JavaScript content; no browser errors.

Chrome desktop sample during active building: median 16.7ms, p95 16.9ms across 193 frames; no intervals above 33.4ms and no long tasks. Live dimension counters add small local Layout/Paint work (approximately 21ms Layout and 37ms Paint combined over 3.2 seconds); cursor and scene movement use native transform/opacity animation. Physical-phone feel remains unverified.

The recording guides choreography and visual treatment. Cursor trajectories remain procedural and adapt to the viewport; the result is not a pixel-for-pixel replay of the video. The portfolio remains live HTML after the intro.
