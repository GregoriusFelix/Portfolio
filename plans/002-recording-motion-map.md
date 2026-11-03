# Recording motion map

Reference: `Screen Recording 2026-11-03 232014.mp4`, 7.4 seconds, 2558 × 1348.

Timing was read from 24 sampled frames. Coordinates follow the live elements so the same sequence reflows on phones.

| Recording time | Build operation |
| --- | --- |
| 0.00–0.90 s | Two cursor groups gather around the scan mark, then spread into work stations. |
| 0.90–1.20 s | Editor rulers and alignment guides appear. Header frames begin. |
| 1.18–1.54 s | A crosshair drags the blue sheet from its upper-left to its lower-right corner. |
| 1.13–1.75 s | Monogram, identity frame, identity typing, and first navigation label are built in parallel. |
| 1.66–2.73 s | Work is duplicated into the other navigation positions, then the labels are replaced. |
| 2.18–2.78 s | Separate agents frame the title, label, role, selection, replay control, author tag, and main button. |
| 2.36–2.62 s | Gregorius is typed at small size. |
| 2.65–3.08 s | The title grows as its corner handle is dragged outward. |
| 2.49–3.30 s | Supporting text, button label, and icon are completed in parallel. |
| 3.45–4.59 s | The first title is duplicated and dragged into the second line. |
| 4.59–4.93 s | The duplicate is replaced with Felix. |
| 4.40–5.40 s | Agents measure bounds and check alignment. |

The recording holds the completed screen from approximately 5.4 seconds onward. The portfolio automatically enters the site after the build. Cursors gather at the viewport center for 420 ms, orbit once for 720 ms, then scatter beyond all viewport edges over 600 ms. The live page is revealed underneath them without changing its layout. No scrolling prompt or bottom status bar is reproduced.

Cursors fade out between assigned tasks instead of repeating measurement passes. They return shortly before their next edit, and all cursors reappear for the final orbit and scatter. Each component keeps one final check; repeated global alignment passes are omitted.

| Cursor | Assigned operations |
| --- | --- |
| 0 | Blue surface, folder caption, button measurement, surface alignment |
| 1 | Small title frame, typing, enlargement, duplicate drag, title alignment |
| 2 | Main button body and label, second-line replacement, second-line alignment |
| 3 | Monogram frame and measurements |
| 4 | First navigation link and spacing |
| 5 | Name selection and alignment measurement |
| 6 | Author tag, button icon, tag measurements |
| 7 | Two-line identity text and measurements |
| 8 | About duplicate, replacement, spacing |
| 9 | Contact duplicate, replacement, spacing |
| 10 | Portfolio label and measurements |
| 11 | Replay control and measurements |
| 12 | Role text and baseline |
| 13 | First folder and caption measurements |

The original small colored arrow cursors are used with a light outline. Crosshair and I-beam changes share their edit task's start and end. Cursor position and visual edits use the same geometry and progress function. Animation changes use native Web Animations with transform and opacity; glyph measurement happens before playback. Reduced-motion handling and the existing playback controls remain available.
