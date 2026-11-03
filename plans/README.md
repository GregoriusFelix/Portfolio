# Animation plans

| Plan | Severity | Status |
| --- | --- | --- |
| 001-smooth-swarm-intro.md | HIGH | DONE |

Plan 001 combined cursor continuity, staged reveals and rendering cost because they shared the intro engine. The user authorized implementing these improvements. Audit/planning used improve-animations; implementation used the newly installed 60fps-animation and accessible-animation guidance; final review used review-animations.

See 001-motion-review.md for the verdict, measured performance and remaining physical-device verification limit. The production build, interaction checks, direct replay, reduced motion, cancellation and desktop/mobile frame checks pass.
