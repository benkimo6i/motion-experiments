# Motion Experiments

A collection of browser-based interactive motion experiments — small, self-contained pieces that explore physics, gesture, and playful UI.

Open [`index.html`](index.html) for a directory of experiments, or serve the repo locally:

```bash
npx serve .
```

Then visit `http://localhost:3000` (or the port printed by your static server).

## Experiments

| Experiment | Path | Description |
|---|---|---|
| [404 Stress Ball](404/) | `/404/` | A 3D stress ball you squeeze and throw against a 404 page — via hand tracking or mouse |
| [Product Mirror](product-mirror/) | `/product-mirror/` | Wearables product showcase with a mirrored tile interaction |

## Requirements

- A modern browser (Chrome or Edge recommended for WebGL + camera APIs)
- Some experiments need a secure context (`localhost` or `https`) and may request camera permission
