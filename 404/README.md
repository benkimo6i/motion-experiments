# 404 Stress Ball

A Three.js stress ball floating over a broken 404 page. Squeeze it, throw it, and watch letters spit out of the page.

## Run

Serve the repo root (camera APIs need `localhost` or `https`, not `file://`):

```bash
npx serve .
```

Then open `/404/`.

## Controls

On load, the page asks for camera access:

- **Allow** → hand tracking mode (MediaPipe)
- **Deny / fail** → mouse mode (or pick it from the error overlay)

### Hand mode

- Pinch / fist to squeeze the ball
- Fling your hand to throw
- Camera preview sits in the HUD

### Mouse mode

- Cursor at screen edges → look around
- Scroll → move
- Hold click → squeeze
- Flick-drag and release → throw

## Stack

- [Three.js r128](https://threejs.org/) (CDN)
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) for hand landmarks
- Plain ES5 scripts (no build step) under `js/`

## Layout

```
404/
├── index.html
├── css/styles.css
└── js/
    ├── state.js      # shared state
    ├── scene.js      # Three.js scene setup
    ├── page.js       # 404 page / letter meshes
    ├── ball.js       # ball physics + intro
    ├── particles.js  # particle effects
    ├── splat.js      # impact splats
    ├── audio.js      # Web Audio
    ├── camera.js     # view / camera motion
    ├── hand.js       # MediaPipe hand tracking
    ├── mouse.js      # mouse/pointer controls
    ├── hud.js        # hints + overlay UI
    ├── boot.js       # mode selection / error flow
    └── main.js       # animation loop + entry
```
