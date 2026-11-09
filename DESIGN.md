# Portfolio introduction: code editor

This document records the scope of the role-text animation added on 2026-11-09. The existing portfolio design remains the source of truth for the rest of the site.

## Brief

Gregorius Felix's portfolio introduces a software engineer. The user requested that a cursor open an IDE or terminal and code the role text, instead of typing directly on the page. Preserve the existing Astro framework, blue folder design, shared introduction clock, color and radius dialogs, completed-cursor fades, final orbit, pause/speed/replay controls and reduced-motion path.

## Concept selection

| Territory | Candidate | Fit | Decision |
| --- | --- | --- | --- |
| Profession's material | A small C++ editor renders the actual paragraph | Direct connection between code and the finished website | Chosen |
| Command line | A terminal prints the role through a command | Requires an invented command or extra explanation | Rejected |
| Workspace layout | A split editor and live preview pane | Duplicates the page preview and crowds mobile | Rejected |

Idea: a cursor writes the C++ source that prints the portfolio's role text.

Metaphor: a developer editing the page they are introducing.

Signature: open main.cpp, type the supplied C++ program, press Run, reveal the existing role below the editor.

Emotion: a small, legible moment of authorship inside the cursor-built page.

Motion verb: construct, then render. All movement uses the existing continuous cursor paths and easing tokens.

Screenshot: the completed paragraph source in the editor, Preview updated in its footer, and the same role visible in the hero.

## System

Keep the existing Bricolage Grotesque portfolio type and #2A4D88 blue. The temporary editor uses a white code surface, light neutral chrome, existing blue for syntax and Run, and a small monospace font only where it represents source code. No decorative terminal dots or extra panels.

The window sits above the destination paragraph, clamped within the document width. Its title, source and footer form three quiet horizontal regions. On phones, the window fits within the viewport; it temporarily overlays the title while keeping the output paragraph below it visible.

One cursor owns open, focus, typing and Run. Newline travel has extra time rather than jumping to the next line. The source is the C++ program supplied by the owner; no fabricated credentials or new copy are introduced. Output appears only after Run. The editor closes, the cursor finishes and fades, and the existing final scene follows. The full intro duration remains about 5.7 seconds.

Existing native Web Animations API transforms and opacity provide the implementation. No additional runtime library is needed for this sequence. Reduced motion bypasses the intro and exposes the original complete page.

## Validation

Production-build checks cover 320, 375 and 1280px widths, intermediate typing, hidden output before Run, output after Run, window fit, no code overflow, live playback, cleanup and reduced motion. Screenshots and the repeatable check are under .hallmark/shots/code-role-* and .hallmark/qa/code-role-check.mjs.
