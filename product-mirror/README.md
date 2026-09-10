# Product Mirror

A browser-based virtual try-on storefront. Product Mirror anchors 3D glasses models to your face in real time using webcam face tracking, so shoppers can spin a product to inspect it and then see it worn — without leaving the page.

The included [demo](https://benkimo6i.github.io/motion-experiments/product-mirror/) is a three-category eyewear shop (Eyeglasses, Sunglasses, Smart Glasses) with a spinning hero product, buyable cards, and a live try-on mode per card.

## Idea

Traditional product pages show static renders. Product Mirror treats the shopper's face as a live anchor point:

1. **Capture** — MediaPipe Face Landmarker reads the webcam feed and outputs a per-frame facial transformation matrix and landmark positions
2. **Anchor** — the nose-bridge landmark and inter-tragion distance set the model's position, rotation, and scale each frame, smoothed with lerp/slerp so tracking doesn't jitter
3. **Render** — Three.js draws the product (a procedural mesh, or a dropped-in `.glb` asset) into an orthographic scene composited over the mirrored camera feed

One shared tracking engine (camera + Face Landmarker) is reference-counted across every try-on tile, so opening try-on on multiple cards never spins up more than one camera stream or model instance.

## Run

Serve the repo root (camera APIs need `localhost` or `https`, not `file://`):

```bash
npx serve .
```

Then open `/product-mirror/`.

## Controls

### Category nav

The pill nav (**Eyeglasses**, **Sunglasses**, **Smart Glasses**) swaps the entire catalog — hero copy, hero model, and both product cards fade and reload together. Arrow keys move focus between tabs and switch category.

### Hero viewer

- Auto-rotates slowly on load for a gallery-style first look
- Drag to rotate manually; dragging stops the auto-rotation
- Zoom and pan are disabled by design — inspection is rotation-only

### Product cards

- **Buy** — adds the item and shows a confirmation toast (demo only, no real cart)
- **Try on** — requests camera access, then replaces the static viewer with a mirrored camera feed and overlays the glasses tracked to your face; click again (**Exit try-on**) to return to the static product view
- A per-card loading overlay reports live setup stages (camera permission, tracker warm-up, first detection) so a slow start doesn't look frozen

### Asset overrides

Every product can swap its procedural placeholder mesh for a real `.glb` model via the hidden `#glb-config` block — each entry maps a `category/variant` pair to a model URL plus optional scale, offset (`x,y,z`), and rotation (`x,y,z` degrees) corrections, applied identically in both the showcase viewer and the try-on mirror.

## Stack

- [Three.js](https://threejs.org/) r128 (`OrbitControls`, `GLTFLoader`, `DRACOLoader`) for 3D rendering and optional compressed-model loading
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) `FaceLandmarker` for face tracking, with GPU delegate and automatic CPU fallback
- Single HTML file — inline CSS and vanilla JS, no build step or framework

## Layout

```
product-mirror/
├── index.html               # demo page — example ecommerce site
├── product-mirror.js        # tracking engine, 3D builders, viewer slots, render loop
└── assets/                  # optional — .glb models referenced from #glb-config
    ├── eyeglasses/
    ├── sunglasses/
    └── smartglasses/
```