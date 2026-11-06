# Bellwether Hollow · Foxglove Ridge

Foxglove Ridge is a first-person mystery set around a wooded ridge, a creek ford, and a small settlement. Find the Vale House journal, follow it to the Foxglove Camp lodge, and unlock the Echo Grid. The journal, letter, and memory milestones persist in this browser.

## Play

- On Netlify, upload the extracted folder as a static site. The publish root is the folder with `index.html`. There is no build command. Use a separate site if you want to keep an older build available.
- Locally, run `python3 -m http.server 8000` from the extracted folder and open `http://localhost:8000`.
- Desktop controls are WASD, mouse, Space to jump, Shift to sprint, and E to read the log. On a phone or tablet, use the left stick, drag the scene to look, and tap the matching action. Use / E reads clues, carries or sets down props, opens the spillway, and enters or exits the wagon. Q / Throw throws carried props. Left click / F fires a physical round. Right click / G toggles the grapple. In the wagon, movement steers and accelerates and Space / Jump drifts.

All runtime dependencies are included. The entry page should be served over HTTP or HTTPS.

## Put a model in the map

1. To check the model quickly, choose **Test a local GLB** on the pause menu. A self-contained GLB is scaled to fit and placed beside the trail as a carryable prop with a convex collider. That placement lasts for the current session.
2. To keep a model in the map, copy it into `assets/` and register it in `assets/manifest.json`. A GLTF with separate textures or buffers needs its companion files in the expected relative paths.
3. Add a placement. Positions are `[x, y, z]` in meters. Yaw is in radians and scale defaults to 1. The terrain height function is in `src/terrain.js`. The bundled cabin uses a named terrain anchor.

Example model entry

```json
"trailSign": "./assets/trail-sign.glb"
```

Example placement entry

```json
{ "model": "trailSign", "position": [4, 3, 20], "yaw": 0.5, "scale": 1, "collider": "hull" }
```

Collision modes:

- `hull` encloses the model in a single convex collider, with a bounds fallback for flat geometry. Use it for props that do not need holes or interiors.
- `authored` uses individual meshes named with a `COL_` prefix as invisible convex colliders. Use separate wall, floor, stair and furniture colliders to leave doors and passages open. The cabin is an example.
- Omit `collider` for decoration. Repeated trees and underbrush are instanced separately. Trees get simple trunk colliders.

Plain GLB/GLTF and Meshopt-compressed geometry are supported. Export uncompressed GLB if your tool offers several compression options. The importer consumes model files produced by external tools.

## Project layout

| File | Role |
| --- | --- |
| `index.html`, `style.css` | Start screen, HUD, input controls |
| `src/main.js` | Scene loading, lighting, forest, objective and local import |
| `src/terrain.js` | Ridge and creek mesh, terrain materials, exact mesh collider |
| `src/assets.js` | Async GLTF loading, asset placement, hulls and instancing |
| `src/walker.js`, `src/input.js` | Fixed-timestep capsule movement and controls |
| `assets/manifest.json` | Model registry and placements |

## Art and dependencies

- Forest trees and bush: Quaternius, Stylized Nature MegaKit, CC0. https://quaternius.com/packs/stylizednaturemegakit.html
- Rock: Quaternius, Ultimate Stylized Nature Pack, CC0. https://poly.pizza/m/OQvi8PIZ40
- Terrain color and normal maps: Poly Haven, Forest Floor, CC0. https://polyhaven.com/a/forest_floor
- Ranger cabin: original mesh for this build. Three.js r169, Meshopt decoder, and Rapier 0.17.3 are bundled.
