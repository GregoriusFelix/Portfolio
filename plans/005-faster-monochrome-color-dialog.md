# Faster monochrome build and one color dialog

The user requested faster playback, fewer eyedroppers, and a black-and-white start that becomes the existing website palette through one color dialog inspired by the supplied Windows color picker reference.

One dedicated cursor owns the dialog: open, select hue, select saturation/value, confirm Done. The dialog shows the actual site blue, #2A4D88, and RGB values 42, 77, 136. Its spectrum and color field are functional explanations of choosing a color, not decorative page gradients. The page, build layers, cursor colors and toolbar are monochrome until confirmation. The color dialog remains colorful so the selection is legible. Filter values change once at confirmation; opacity and transforms provide the motion.

Only one available cursor receives an eyedropper task. Selection checks that all of its existing jobs finish before the new task starts. The ten previous color-transfer passes are removed. Typography, construction and corner jobs remain distinct and run once. The label task moves to another cursor so the dialog owner has no competing job.

The choreography ends construction at 6200ms before a shared 0.72 timing factor. The factor applies to animation delays, durations, progress jobs, the scan threshold and the overall clock. Actual construction lasts 4464ms; the full introduction lasts 5716.8ms, down from 9340ms. The existing final scene remains. Pause, speed, replay, interruption and reduced-motion cleanup share the same synchronized animation list.

Verification: production build; Chrome at widths 320, 375, 768, 1280 and 1920px; exactly one dialog owner and one eyedropper; monochrome before confirmation and full color afterward; bounded continuous cursor keyframes; dialog fit; pause, speed, replay, completion, interruption, restored page filters and reduced motion. Repeatable check: .hallmark/qa/color-dialog-check.mjs. Screenshots: .hallmark/shots/color-dialog-*.png. Physical-device feel remains a manual check.
