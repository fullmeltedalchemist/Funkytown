# Game asset pipeline

## Authoring and generation

Run `blender -b -t 2 --python tools/author_field_props.py` to export authored GLB
assets into `assets/`. This includes the villager, its embedded fabric texture,
weapons and rescue equipment.

For generated static props, use fal's Tripo H3.1 text-to-3D endpoint
(`tripo3d/h3.1/text-to-3d`) with textures enabled and download the GLB
from the completed job. This is an authoring workflow that uses the connected
fal account. The game only needs the exported GLB.

Normalize the prop in Blender before testing. Set the height in meters and
give the output a new filename.

```sh
blender -b -t 2 --python-exit-code 1 --python tools/prepare_prop.py -- \
  raw-jerrycan.glb prepared-jerrycan.glb --height 0.47
```

This preserves the textures, centers the footprint, and puts the base at
floor level. Use **Test a local GLB** in the pause menu to check appearance
and physics. Use the villager workflow below for animated characters.

For persistent use, register the GLB in `assets/manifest.json` and add a placement or
load it from a gameplay class. Run `python3 tools/check_assets.py` and `npm test`
before publishing.

## Villagers

The `villager` manifest entry supplies the shared fieldworker model. Coat colors vary
per character. Preserve separate nodes named `Arm_L`, `Arm_R`, `Leg_L` and `Leg_R`,
with pivots at shoulders and hips, for walking and work animations. Export with feet
at zero and approximately 1.8 m height. Replacing this file changes every character
created through `person()`.

The model includes UVs, an embedded woven-fabric color texture, and roughness and
metallic materials. Skin and leather use material colors. Individual faces, clothing
sets and a skeletal animation library remain additional art work.

## Textures, collision and grounding

GLTFLoader reads standard glTF base-color, normal and roughness textures. Embed images
in the GLB for portable uploads. Terrain uses bundled forest color and normal maps.

Name authored collision pieces `COL_...`. Separate walls, roofs, furniture and stairs
so buildings remain enterable. Single convex hulls suit small loose props.

For irregular source origins, `prepare()` and `place()` accept `groundY` to align the
visible geometry's lowest point before generating collision. Omit it for wall-mounted
and suspended objects.
