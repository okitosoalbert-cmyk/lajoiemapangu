"""Generate the INNOVA mascot. Run with Blender 4.3 in background mode."""
from pathlib import Path
from math import radians
import bpy

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, rgb, roughness=.7):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*rgb, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = roughness
    return result

grey = material("Pelage gris", (.23,.25,.30))
light = material("Museau argent", (.43,.45,.50))
wine = material("Gilet grenat", (.28,.018,.071))
mane = material("Crinière framboise", (.47,.035,.12))
dark = material("Sabots et pupilles", (.025,.019,.035))
cream = material("Ivoire", (.93,.84,.70))
charcoal = material("Coutures", (.11,.015,.046))

def oval(name, xyz, scale, color, angle=0, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(color)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.parent = parent
    obj.location = xyz
    obj.scale = scale
    obj.rotation_euler.y = radians(angle)
    return obj

def pivot(name, location, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj

root = pivot("Gee-Gee", (0,0,0))
head = pivot("Tête", (0,0,2.32), root)
oval("Maillot", (0,.02,1.40), (.57,.40,.63), wine, parent=root)
oval("Col", (0,-.01,1.88), (.37,.34,.14), cream, parent=root)
oval("Queue", (.26,.47,1.03), (.15,.34,.37), mane, -35, root)
for side in (-1,1):
    oval("Jambe", (.27*side,.0,.74), (.22,.25,.4), grey, parent=root)
    oval("Sabot", (.27*side,-.09,.31), (.28,.37,.22), dark, parent=root)
    oval("Semelle", (.27*side,-.1,.225), (.27,.36,.08), wine, parent=root)
    arm = pivot("Bras droit" if side==1 else "Bras gauche", (.48*side,0,1.67), root)
    oval("Manche", (.12*side,0,-.12), (.22,.27,.25), wine, -26*side, arm)
    oval("Avant-bras", (.23*side,0,-.30), (.19,.21,.28), grey, -28*side, arm)
    oval("Sabot avant", (.33*side,-.045,-.48), (.20,.24,.21), charcoal, parent=arm)
    if side == 1:
        waving_arm = arm
    oval("Oreille", (.38*side,.02,.52), (.15,.17,.34), grey, 25*side, head)
    oval("Intérieur oreille", (.40*side,-.13,.54), (.09,.047,.23), mane, 25*side, head)
oval("Joue", (0,.015,.05), (.51,.42,.55), grey, parent=head)
oval("Chanfrein", (0,-.27,-.125), (.40,.40,.46), grey, parent=head)
jaw = pivot("Mâchoire", (0,-.30,-.27), head)
oval("Mâchoire inférieure", (0,-.19,-.19), (.31,.31,.145), light, parent=jaw)
oval("Bouche", (0,-.32,-.10), (.225,.14,.07), dark, parent=jaw)
oval("Museau", (0,-.49,-.24), (.38,.29,.235), light, parent=head)
for side in (-1,1):
    oval("Narine", (.15*side,-.747,-.18), (.063,.032,.045), dark, parent=head)
    oval("Oeil", (.245*side,-.428,.17), (.125,.060,.146), cream, 8*side, head)
    oval("Pupille", (.231*side,-.486,.164), (.059,.029,.084), dark, parent=head)
    oval("Reflet", (.214*side,-.510,.199), (.019,.012,.023), cream, parent=head)
    oval("Sourcil", (.242*side,-.424,.329), (.122,.047,.04), mane, -8*side, head)
for idx, x in enumerate((-.31,-.19,-.06,.09,.24)):
    oval("Mèche", (x,-.225-.014*idx,.44+.12*(1-abs(x)*2)), (.125,.23,.15), mane, 22, head)
for x in (-.15,.14):
    bpy.ops.object.text_add()
    label = bpy.context.object
    label.name = "Lettrage GG"
    label.parent = root
    label.location = (x,-.391,1.30)
    label.rotation_euler.x = radians(90)
    label.data.body = "G"
    label.data.align_x = "CENTER"
    label.data.size = .26
    label.data.extrude = .009
    label.data.materials.append(cream)
    bpy.ops.object.convert(target="MESH")

def clip(obj, name, channel, frames):
    obj.animation_data_create()
    baseline = tuple(getattr(obj,channel))
    for frame, values in frames:
        setattr(obj,channel,values)
        obj.keyframe_insert(channel, frame=frame)
    action = obj.animation_data.action
    action.name = name
    obj.animation_data.action = None
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    track.mute = True
    setattr(obj, channel, baseline)

clip(root,"Idle","rotation_euler",[(1,(0,0,-.12)),(65,(0,0,.12)),(129,(0,0,-.12))])
clip(waving_arm,"Wave","rotation_euler",[(1,(0,0,0)),(17,(0,-2.6,0)),(28,(0,-2.05,0)),(39,(0,-2.7,0)),(50,(0,-2.1,0)),(70,(0,0,0))])
clip(jaw,"Talk","location",[(1,(0,-.3,-.27)),(6,(0,-.32,-.37)),(12,(0,-.3,-.27)),(17,(0,-.32,-.34)),(23,(0,-.3,-.27))])
bpy.ops.export_scene.gltf(filepath=str(Path(__file__).resolve().parents[1]/"static"/"mascotte.glb"),
                         export_format="GLB", export_animation_mode="NLA_TRACKS")
