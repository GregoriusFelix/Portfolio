# Felix Erawan's portfolio

Astro portfolio with a blue-and-white folder layout and an original, dependency-free cursor-swarm introduction.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:4321. On Windows, use `npm.cmd` if PowerShell blocks npm's script wrapper. Build with `npm run build`; the static output is `dist/`.

## Personal details and resume

Edit `src/profile.ts` for email, GitHub, LinkedIn, and resume. Empty links are omitted. The supplied resume is stored at `public/Gregorius_Felix_Resume.pdf`; email and public profile links come from that PDF. Replace the file when your resume changes, or update the URL in the profile configuration.

## Add projects

Copy `src/content/work/sample-project.md`, rename it, replace the sample text and links, and set `draft: false`. Published projects appear in the work folder automatically and get their own `/work/<filename>` page. Drafts are excluded from the homepage and generated routes. The included sample stays a draft so fabricated results never appear as your work.

## Intro behavior

The intro runs once per browser session and can be replayed with the Play intro button at the top of the blue hero. Open `/?intro=1` to play it regardless of session history. It follows the supplied screen recording: 14 small colored cursors gather around the monogram, draw the panel and selection boxes, type and size the name, duplicate a text layer, and switch between pointer/crosshair/I-beam tools. The compact toolbar shows actual build progress and offers Pause/Resume, 1x/2x/3x speed, and a close control. The build starts in black and white. One dedicated cursor opens a custom color dialog, selects the site blue (#2A4D88; RGB 42, 77, 136), and presses Done to reveal the existing site palette. A single idle cursor samples the finished blue; the other cursors retain their construction and corner-adjustment jobs. For the role text, one cursor opens a C++ editor, types the supplied main.cpp program, and presses Run before Software Engineer appears in the hero. Typed code and the single footer status persist throughout playback. For Portfolio, a cursor duplicates the full header name into the hero, changes the copy to light text, selects and deletes it, then types Portfolio. Each pass runs once, with visible continuous travel. The full introduction takes about 5.7 seconds at normal speed, including the existing final formation and departure. The intro is then removed and navigation is enabled. Close or Escape ends it immediately. Reduced-motion preferences, ordinary anchor visits and disabled JavaScript bypass it. Reduced-motion users see an explanation beneath the hero. Resizing or hiding the tab safely ends playback. There is no audio, tracking, external animation package, or extension installation.

The implementation is original, inspired by the cursor-building concept in Dhvanil Patel's Swarm Rebuild and Joel Califa's Swarm. No source code from either project is included. The intro uses temporary, inert DOM replicas of the actual page, continuous cursor paths sampled before playback, and synchronized native Web Animations API timelines. Only transforms and opacity animate; text is revealed by moving cover layers rather than redrawing glyphs in a canvas. All temporary nodes and animations are removed on completion or interruption.

## Design and verification

Edit `src/styles/tokens.css` for colors and typography, `src/styles/global.css` for layouts, and `src/scripts/swarm-intro.ts` for the introduction. The page follows the supplied blue/white folder references. Bricolage Grotesque loads from Google Fonts with a system-font fallback.

Browser checks cover intro completion, Skip, Escape, focus containment/restoration, Replay, session memory, reduced motion, navigation, JavaScript-disabled rendering, and horizontal fit from 320px to 1920px. Physical phone testing is still needed for mobile browser chrome and touch feel.
