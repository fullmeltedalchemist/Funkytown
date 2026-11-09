"""Run with blender -b -t 2 --python tools/author_field_props.py."""
from pathlib import Path
from math import cos, sin, tau
import bpy

OUT = Path(__file__).resolve().parents[1] / "assets"


def material(name, rgb, metal=0, roughness=.6, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, alpha)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = "BLENDED"
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        bpy.context.view_layer.objects.active = obj
        edge = obj.modifiers.new("Rounded manufactured edges", "BEVEL")
        edge.width = bevel
        edge.segments = 3
        bpy.ops.object.modifier_apply(modifier=edge.name)
        normals = obj.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normals.name)
    return obj


def box(name, position, size, mat, bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def lathe(name, profile, mat, segments=40):
    vertices = [(r*cos(tau*i/segments), r*sin(tau*i/segments), z)
                for r,z in profile for i in range(segments)]
    faces = [(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i)
             for j in range(len(profile)-1) for i in range(segments)]
    faces.extend([tuple(reversed(range(segments))),
                  tuple(range((len(profile)-1)*segments,len(profile)*segments))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, name, mat)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export(filename):
    # One draw call per material rather than one per handle, badge, or rib.
    groups = {}
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = name
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), export_format="GLB", export_yup=True)


reset()
glass = material("Pale bottle glass", (.29,.69,.61), .05,.18,.34)
water = material("Creek water behind glass", (.035,.33,.49), .07,.22,.67)
metal = material("Tinned steel", (.24,.27,.26), .71,.35)
enamel = material("Pump service enamel", (.71,.49,.22), .16,.41)
lathe("Rolled lip, shoulder, and thick foot", [
    (.215,-.34),(.255,-.323),(.274,-.287),(.278,-.18),(.272,.09),
    (.242,.16),(.175,.205),(.084,.23),(.078,.294),(.091,.305),(.091,.333),(.075,.342)
], glass)
lathe("Visible water fill",[(.241,-.306),(.25,-.274),(.25,.027),(.247,.042)],water)
lathe("Protective foot ring",[(.25,-.338),(.277,-.324),(.279,-.307),(.257,-.299)],metal)
lathe("Knurled cap",[(.084,.326),(.092,.339),(.092,.372),(.077,.381)],enamel)
for i in range(18):
    a=tau*i/18
    tooth=box("Cap grip",(.091*cos(a),.091*sin(a),.354),(.008,.012,.027),metal,.002)
    tooth.rotation_euler.z=a
bpy.ops.mesh.primitive_torus_add(major_radius=.17,minor_radius=.017,location=(.0,0,.227))
loop=bpy.context.object
loop.scale=(.52,1,1)
loop.rotation_euler.x=tau/4
finish(loop,"Swing carrying bail",metal)
export("pump-water-jug.glb")

reset()
red = material("Brick red powder coat", (.48,.038,.024), .3,.47)
rim = material("Rubbed steel seam", (.27,.09,.056), .63,.35)
black = material("Black cap and handle", (.052,.045,.041), .21,.59)
cream = material("Aged fuel badge", (.86,.62,.31), .1,.47)
box("Pressed steel can shell",(0,0,-.04),(.48,.28,.6),red,.056)
box("Pinched midline seam",(0,0,-.04),(.49,.292,.56),rim,.032)
box("Inset side panel",(0,0,-.04),(.42,.303,.52),red,.041)
for side in (-1,1):
    for slope in (-1,1):
        rib=box("Pressed reinforcement", (0,side*.154,-.063),(.046,.033,.37),rim,.013)
        rib.rotation_euler.y=slope*.65
    box("Fuel badge",(0,side*.17,.105),(.18,.018,.083),cream,.012)
for x in (-.126,.126):
    box("Handle riser",(x,0,.278),(.06,.089,.081),rim,.015)
box("Bridge handle",(0,0,.323),(.32,.086,.047),black,.017)
box("Threaded filler",(.174,0,.272),(.095,.11,.075),black,.021)
box("Latch arm",(.177,.056,.299),(.084,.021,.034),rim,.006)
export("creek-fuel-can.glb")

reset()
iron = material("Oxidized blue pump casting", (.094,.24,.23), .42,.57)
edge = material("Machined steel edges", (.27,.34,.33), .69,.38)
rubber = material("Black pump seals", (.055,.051,.048), .13,.82)
brass = material("Tarnished brass fittings", (.52,.32,.12), .54,.41)
box("Pump mounting foot",(0,0,.043),(.56,.39,.083),edge,.024)
lathe("Ribbed motor housing",[(.116,-.236),(.14,-.212),(.14,.177),(.123,.218)],
      iron,28)
motor=bpy.data.objects["Ribbed motor housing"]
motor.rotation_euler.y=tau/4
motor.location.z=.15
for i in range(8):
    angle=tau*i/8
    rib=box("Cooling fin",(0,.129*cos(angle),.129*sin(angle)+.15),(.31,.038,.021),iron,.008)
    rib.rotation_euler.x=angle
for x in (-.22,.214):
    seal=lathe("Motor end seal",[(.123,-.019),(.139,-.007),(.139,.007),(.123,.018)],rubber,28)
    seal.rotation_euler.y=tau/4
    seal.location=(x,0,.15)
box("Copper terminal cover",(.034,0,.28),(.22,.163,.11),iron,.027)
box("Serial plate",(.018,-.089,.287),(.131,.018,.05),brass,.008)
for x in (-.2,.2):
    for y in (-.13,.13):
        bolt=lathe("Hex mounting bolt",[(.029,.08),(.029,.104)],brass,6)
        bolt.location=(x,y,0)
neck=lathe("Intake coupling",[(.074,-.1),(.091,-.083),(.091,-.047),(.069,-.024),(.069,.11)],brass,24)
neck.location=(-.12,.09,.187)
export("creek-transfer-pump.glb")
