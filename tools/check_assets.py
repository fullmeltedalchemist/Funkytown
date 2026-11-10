"""Validate registered assets before serving or deploying the game."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'assets/manifest.json').read_text())
for name, reference in manifest['models'].items():
    path = (root / reference).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f'{name}: missing or external model file')
    data = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', data)
    if (magic, version, length) != (0x46546C67, 2, len(data)):
        raise ValueError(f'{name}: invalid GLB header')
    size, kind = struct.unpack_from('<II', data, 12)
    if kind != 0x4E4F534A:
        raise ValueError(f'{name}: expected JSON chunk')
    document = json.loads(data[20:20+size])
    for resource in document.get('images', []) + document.get('buffers', []):
        uri = resource.get('uri')
        if uri and not uri.startswith('data:'):
            companion = (path.parent / uri).resolve()
            if not companion.is_relative_to(root) or not companion.is_file():
                raise ValueError(f'{name}: missing resource {uri}')
    if name == 'villager':
        nodes = {node.get('name') for node in document['nodes']}
        if not {'Arm_L', 'Arm_R', 'Leg_L', 'Leg_R'} <= nodes:
            raise ValueError('Villager is missing required animation pivots')
    print(f'{name}: valid, {len(data):,} bytes')
for placement in manifest.get('placements', []):
    if placement['model'] not in manifest['models']:
        raise ValueError('Unknown placement model')
print('Asset manifest and model resources passed.')
