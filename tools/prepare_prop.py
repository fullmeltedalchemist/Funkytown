"""Prepare a static GLB prop for Funkytown using Blender."""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--height", type=float, required=True, help="Height in meters")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if not math.isfinite(args.height) or args.height <= 0:
        parser.error("--height must be a finite positive number")
    source, output = args.source.resolve(), args.output.resolve()
    if source.suffix.lower() != ".glb" or output.suffix.lower() != ".glb":
        parser.error("source and output must be GLB files")
    if not source.is_file() or output.exists():
        parser.error("source must exist and output must be a new file")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    imported = list(scene.objects)
    if any(obj.type not in {"MESH", "EMPTY"} or obj.animation_data for obj in imported):
        raise ValueError("Expected a static prop without cameras, lights, or animation")
    meshes = [obj for obj in imported if obj.type == "MESH" and obj.data.polygons]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not corners or any(not math.isfinite(v) for corner in corners for v in corner):
        raise ValueError("Prop has no usable mesh bounds")
    lower = Vector([min(c[i] for c in corners) for i in range(3)])
    upper = Vector([max(c[i] for c in corners) for i in range(3)])
    height = upper.z - lower.z
    if height <= 1e-6:
        raise ValueError("Prop has no vertical extent")

    origin = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    scale = args.height / height
    root = bpy.data.objects.new(output.stem, None)
    scene.collection.objects.link(root)
    for obj in imported:
        if obj.parent is None:
            obj.parent = root
    root.scale = (scale,) * 3
    root.location = -origin * scale
    bpy.context.view_layer.update()

    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
    triangles = sum(len(face.vertices) - 2 for obj in meshes for face in obj.data.polygons)
    print(f"{output}: {triangles:,} triangles, {args.height:g} m tall, base at floor level")


if __name__ == "__main__":
    main()
