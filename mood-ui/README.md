# Mood UI

A browser library that reads facial expressions and drives UI from them. Inspired by **micro-expressions** in psychology — the brief, involuntary muscle movements that leak how someone actually feels — Mood UI maps live face data to emotion states so interfaces and animations can respond in a more dynamic, organic way than clicks or static toggles.

The included [demo](https://benkimo6i.github.io/motion-experiments/mood-ui/) includes: ambient shaders, copy, and card highlights that shift as your expression changes.

## Idea

Traditional UI waits for explicit input. Mood UI treats the face as a continuous signal:

1. **Capture** — MediaPipe Face Landmarker outputs per-frame blendshape scores (smile, brow furrow, inner brow raise, etc.)
2. **Infer** — heuristics roll those scores into `happy`, `sad`, and `angry` moods with frame smoothing and a short hold delay, so fleeting micro-movements don't flicker the UI
3. **React** — any element marked `.mood` can declare which moods it cares about (`data-moods`) and wire custom behavior via per-mood `trigger` callbacks — gradients, shaders, copy, layout, animation, whatever you attach

The goal is emotion-reactive UI: surfaces that breathe with the person in front of the camera instead of feeling static or button-driven.

## Run

Serve the repo root (camera APIs need `localhost` or `https`, not `file://`):

```bash
npx serve .
```

Then open `/mood-ui/`.

## Controls

On load, the page asks for camera access:

- **Allow** → face tracking mode (MediaPipe)
- **Deny / fail** → manual mode via the pill selector in the header

### Face tracking mode

- Subtle expression changes update blendshape scores in real time
- Scores smooth over ~12 frames and must hold for ~400 ms before the active mood switches
- Camera preview + live score bars sit in the bottom-right HUD
- Only visible `.mood` elements with a matching `data-moods` value receive updates

### Manual mode

- Click **Happy**, **Sad**, or **Angry** in the header to set mood without a camera

### Demo sections

The sample page wires three `.mood` blocks to show what triggers can do:

1. **Mirror Canvas** — ambient noise shader shifts hue to match the detected mood
2. **Mood Regulation** — heading and body copy cross-fade with mood-specific gradient text
3. **Personalized Recommendations** — card grid highlights mood-matched items; **Disable Filter** toggles dimming

## Stack

- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) for face blendshapes
- [simplex-noise](https://www.npmjs.com/package/simplex-noise) for organic particle motion in the demo shader
- ES module (`mood.js`) + plain script (`background-shader.js`); no build step

## Layout

```
mood-ui/
├── index.html              # demo page — example triggers and section markup
├── mood.js                 # library: detection, smoothing, observer, manual fallback
└── background-shader.js    # demo helper: dual-canvas ambient shader
```
