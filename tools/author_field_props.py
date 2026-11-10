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
        if obj.type == "MESH" and not obj.name.startswith("COL_"):
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

reset()
oak = material("Dark survey oak", (.23,.13,.071), 0,.77)
bronze = material("Survey brass", (.57,.33,.11), .62,.36)
felt = material("Faded survey felt", (.12,.19,.15), 0,.94)
box("Felt channel",(0,0,.037),(.46,1.6,.054),felt,.017)
for x in (-.248,.248):
    box("Rounded oak rail",(x,0,.068),(.068,1.67,.122),oak,.022)
for y in (-.793,.793):
    box("Raised end stop",(0,y,.065),(.47,.059,.108),oak,.013)
for y in (-.57,-.38,-.19,0,.19,.38,.57):
    box("Inlaid distance mark",(-.172,y,.065),(.094,.011,.006),bronze,.002)
for x in (-.246,.246):
    for y in (-.69,.69):
        bolt=lathe("Flush brass screw",[(.018,.123),(.016,.132)],bronze,12)
        bolt.location=(x,y,0)
export("echo-survey-tray.glb")

reset()
fur = material("Cottontail brown", (.27,.16,.09), 0,.88)
belly = material("Pale throat and tail", (.64,.51,.37), 0,.95)
ear = material("Dusky inner ear", (.39,.18,.14), 0,.89)
eye = material("Dark wet eye", (.019,.015,.012), .12,.19)


def oval(name, location, size, mat, tilt=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=location)
    obj = bpy.context.object
    obj.scale = size
    obj.rotation_euler.x = tilt
    for face in obj.data.polygons:
        face.use_smooth = True
    return finish(obj, name, mat)


oval("Hindquarters",(0,.09,.15),(.14,.18,.145),fur)
oval("Chest",(0,-.075,.151),(.103,.137,.12),belly)
oval("Head",(0,-.192,.215),(.093,.10,.096),fur)
oval("Tail",(0,.262,.178),(.067,.062,.066),belly)
for side in (-1,1):
    oval("Hind paw",(side*.091,.061,.043),(.063,.148,.042),fur)
    oval("Fore paw",(side*.053,-.166,.031),(.031,.064,.031),belly)
    oval("Ear",(side*.046,-.154,.343),(.033,.036,.12),fur,-.29)
    oval("Ear lining",(side*.046,-.184,.348),(.019,.011,.082),ear,-.29)
    oval("Eye",(side*.078,-.237,.238),(.013,.022,.018),eye)
oval("Nose",(0,-.284,.207),(.029,.018,.019),eye)
export("ridge-cottontail.glb")

reset()
orange = material("Flare orange enamel", (.68,.21,.05), .26,.38)
gunmetal = material("Oxidized barrel", (.115,.13,.14), .72,.36)
grip = material("Textured polymer grip", (.067,.052,.043), .08,.77)
box("Orange receiver",(0,-.044,.019),(.071,.18,.064),orange,.013)
box("Rounded grip",(0,.036,-.063),(.059,.069,.13),grip,.014).rotation_euler.x=-.2
barrel=lathe("Flared barrel mouth",[(.027,-.103),(.029,-.088),(.026,.076),(.031,.091),(.031,.106)],gunmetal,24)
barrel.rotation_euler.x=-tau/4
barrel.location=(0,-.16,.039)
box("Dark muzzle insert",(0,-.268,.039),(.039,.006,.037),grip,.009)
box("Front sight",(0,-.232,.071),(.013,.016,.017),gunmetal,.003)
for z in (-.105,-.087,-.068):
    box("Grip rib",(0,.069,z),(.061,.014,.009),gunmetal,.003)
export("field-flare-pistol.glb")

reset()
oak = material("Kitchen clock oak", (.25,.12,.06), 0,.71)
dial = material("Aged ivory dial", (.78,.67,.44), 0,.76)
steel = material("Blackened steel hands", (.075,.055,.041), .48,.38)
brass = material("Brass bezel", (.63,.38,.13), .72,.34)
for name,radius,depth,mat in [
    ("Turned oak case",.244,.064,oak),
    ("Brass rim",.221,.07,brass),
    ("Paper dial",.202,.077,dial)
]:
    piece=lathe(name,[(radius,0),(radius,depth)],mat,48)
    piece.rotation_euler.x=tau/4
for i in range(12):
    a=tau*i/12
    tick=box("Hour marker",(.169*sin(a),-.079,.169*cos(a)),(.009,.006,.023),steel,.002)
    tick.rotation_euler.y=a
box("Stopped minute hand",(0,-.086,.073),(.014,.009,.157),steel,.003)
box("Stopped hour hand",(-.047,-.089,.0),(.105,.009,.017),steel,.003)
pin=lathe("Center rivet",[(.018,.092),(.018,.099)],brass,18)
pin.rotation_euler.x=tau/4
export("stopped-kitchen-clock.glb")

reset()
green = material("Archive utility paint", (.24,.36,.25), .34,.52)
panel = material("Faded ivory sign", (.72,.63,.42), .12,.6)
dark = material("Window glass", (.053,.13,.14), .35,.25)
rubber = material("Rubber tyres", (.035,.032,.03), .05,.9)
steel = material("Wheel steel and bumpers", (.26,.26,.23), .67,.43)
red = material("Tail lamp", (.51,.036,.025), .15,.3)
cream = material("Head lamp", (.88,.70,.36), .2,.22)
box("Chassis",(0,0,.55),(1.45,3.1,.31),steel,.08)
box("Bonnet",(0,1.04,.83),(1.4,.89,.41),green,.1)
box("Cab",(0,.34,1.11),(1.45,1.15,1.08),green,.10)
box("Front windshield",(0,.92,1.35),(1.18,.05,.44),dark,.026)
for x in (-.724,.724):
    box("Side window",(x,.43,1.37),(.03,.67,.4),dark,.022)
    box("Archive enamel plaque",(x,-.79,1.14),(.035,.73,.31),panel,.01)
box("Covered archive bed",(0,-.75,1.07),(1.49,1.47,1),green,.095)
box("Rolled edge roof",(0,-.75,1.56),(1.52,1.51,.15),green,.052)
for y in (-1.52,1.52):
    box("Bumper",(0,y,.48),(1.54,.15,.18),steel,.042)
    for x in (-.55,.55):
        box("Lamp lens",(x,y,.73),(.21,.11,.14),cream if y>0 else red,.026)
for x in (-.755,.755):
    for y in (-1.07,1.03):
        tire=lathe("Tread and tyre",[(.272,-.105),(.302,-.078),(.303,.078),(.272,.105)],rubber,28)
        tire.rotation_euler.y=tau/4
        tire.location=(x,y,.31)
        hub=lathe("Steel hub",[(.153,-.109),(.153,.109)],steel,20)
        hub.rotation_euler.y=tau/4
        hub.location=(x,y,.31)
export("archive-truck.glb")

reset()
shell = material("Olive archive case", (.17,.22,.12), .17,.69)
edge = material("Steel corner guards", (.26,.29,.26), .62,.4)
rubber = material("Handle and seal", (.049,.05,.037), .08,.85)
paper = material("Cream accession label", (.76,.64,.42), 0,.86)
box("Pressed case body",(0,0,.13),(.56,.38,.23),shell,.038)
box("Rubber gasket",(0,0,.217),(.567,.385,.022),rubber,.009)
box("Lid",(0,0,.248),(.56,.38,.072),shell,.022)
box("Accession label",(-.065,0,.287),(.22,.136,.006),paper,.005)
for x in (-.159,.159):
    box("Lid catch",(x,-.191,.203),(.051,.041,.095),edge,.011)
    box("Handle boss",(x*.62,-.203,.117),(.038,.055,.05),edge,.01)
    box("Hinge",(x,.191,.214),(.081,.042,.044),edge,.01)
box("Carry handle",(0,-.235,.117),(.219,.038,.04),rubber,.012)
for x in (-.241,.241):
    for y in (-.155,.155):
        box("Corner foot",(x,y,.025),(.063,.063,.044),edge,.01)
export("archive-tape-case.glb")

reset()
iron = material("Bent galvanised steel", (.28,.33,.31), .66,.43)
webbing = material("Ochre rescue webbing", (.57,.28,.073), 0,.87)
pad = material("Canvas sling pads", (.41,.29,.16), 0,.9)
box("Tow bracket plate",(0,0,.025),(.30,.15,.049),iron,.016)
for x in (-.113,.113):
    rivet=lathe("Bracket rivet",[(.022,.048),(.022,.06)],iron,12)
    rivet.location=(x,0,0)
for x in (-.068,.068):
    box("Bent bracket cheek",(x,-.044,.092),(.044,.098,.134),iron,.011).rotation_euler.x=-.31
box("Bracket cross pin",(0,-.068,.146),(.177,.031,.037),iron,.009)
for x in (-.106,.106):
    box("Rolled sling",(x,.079,.073),(.11,.17,.12),pad,.031)
    box("Webbing strap",(x,.079,.138),(.041,.176,.018),webbing,.005)
export("ford-rescue-bracket.glb")

reset()
oak = material("Warm oak", (.29,.13,.055), roughness=.74)
edge = material("Dark end grain", (.15,.065,.03), roughness=.82)
paint = material("Faded cream paint", (.61,.48,.31), roughness=.68)
iron = material("Dull cast iron", (.085,.09,.082), .48,.52)
red = material("Red enamel and repair paint", (.49,.06,.034), .17,.46)

# Blender Y becomes negative world Z. The origin sits on the cabin's floor.
box("Counter cabinet",(-.88,2.23,.43),(.97,.42,.86),paint,.027)
box("Oak worktop",(-.88,2.23,.89),(1.05,.49,.062),oak,.025)
for x in (-1.11,-.65):
    box("Recessed cupboard front",(x,2.01,.36),(.39,.036,.57),oak,.026)
    box("Cupboard latch",(x,1.982,.51),(.105,.027,.032),iron,.009)
box("Counter drawer",(-.88,2.005,.75),(.87,.05,.15),paint,.015)
box("Drawer pull",(-.88,1.97,.76),(.19,.035,.031),iron,.009)

# The chair was cut down for a child. One foot is split and bound with red tape.
cx, cy = -1.44, .44
for x in (-.185,.185):
    for y in (-.18,.18):
        box("Short oak leg",(cx+x,cy+y,.163),(.047,.047,.326),edge,.008)
box("Low seat",(cx,cy,.344),(.46,.43,.064),oak,.035)
for x in (-.185,.185):
    box("Back upright",(cx+x,cy+.18,.533),(.049,.047,.354),oak,.012)
for z in (.49,.654):
    box("Curved-edge back slat",(cx,cy+.18,z),(.394,.047,.087),paint,.022)
for z in (.034,.054,.074):
    box("Red repair wrap",(cx+.185,cy-.18,z),(.055,.055,.024),red,.005)

pot = lathe("Enamel kettle body",[(.094,0),(.119,.025),(.116,.12),(.074,.165),(.057,.177)],red,28)
pot.location=(-1.12,2.23,.922)
lid = lathe("Kettle lid",[(.066,0),(.066,.014),(.02,.024)],iron,24)
lid.location=(-1.12,2.23,1.095)
box("Kettle lid knob",(-1.12,2.23,1.13),(.047,.047,.031),iron,.013)
bpy.ops.mesh.primitive_torus_add(major_radius=.105,minor_radius=.012,location=(-1.12,2.23,1.056))
bpy.context.object.rotation_euler.x=tau/4
finish(bpy.context.object,"Kettle bail",iron)

collision = material("Furniture collision", (.4,.4,.4))
box("COL_cupboard",(-.88,2.23,.46),(1.05,.49,.92),collision,0)
box("COL_child_chair",(cx,cy,.19),(.46,.43,.38),collision,0)
box("COL_chair_back",(cx,cy+.18,.531),(.43,.06,.365),collision,0)
export("paired-kitchen.glb")
