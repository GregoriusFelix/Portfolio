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

The intro runs once per browser session and can be replayed from the hero. Skip or Escape ends it immediately. Reduced-motion preferences, anchor visits and disabled JavaScript bypass it. Resizing or hiding the tab safely ends playback. Navigation remains fully usable after completion. There is no audio, tracking, external animation package, or extension installation.

The implementation is original, inspired by the cursor-building concept in Dhvanil Patel's Swarm Rebuild and Joel Califa's Swarm. No source code from either project is included.

## Design and verification

Edit `src/styles/tokens.css` for colors and typography, `src/styles/global.css` for layouts, and `src/scripts/swarm-intro.ts` for the introduction. The page follows the supplied blue/white folder references. Bricolage Grotesque loads from Google Fonts with a system-font fallback.

Browser checks cover intro completion, Skip, Escape, focus containment/restoration, Replay, session memory, reduced motion, navigation, JavaScript-disabled rendering, and horizontal fit from 320px to 1920px. Physical phone testing is still needed for mobile browser chrome and touch feel.
