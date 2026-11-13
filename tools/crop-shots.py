"""Recorta y convierte a WebP las capturas de tools/capture-teikit.js.
Uso: python3 tools/crop-shots.py <dirCapturas> <dirSalida>"""
import json, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
meta = json.load(open(f'{src}/meta.json'))

def save(im, name, width=None, q=78):
    im = im.convert('RGB')
    if width and im.size[0] != width:
        im = im.resize((width, round(im.size[1] * width / im.size[0])), Image.LANCZOS)
    im.save(f'{dst}/{name}.webp', 'WEBP', quality=q, method=6)
    print(name, im.size)

H = 3000  # alto común de las comparativas de página completa (px CSS)
save(Image.open(f'{src}/home-before.png').crop((0, 0, 1440, H)), 'home-before', 1200)
save(Image.open(f'{src}/home-after.png').crop((0, 0, 1440, H)), 'home-after', 1200)
save(Image.open(f'{src}/carta-before.png').crop((0, 0, 1440, H)), 'carta-before', 1200)
y = int(meta['cartaTop']) - 120
save(Image.open(f'{src}/carta-after.png' if False else f'{src}/home-after.png').crop((0, y, 1440, y + H)), 'carta-after', 1200)
for n in ['pedido', 'locales']:
    for s in ['before', 'after']:
        save(Image.open(f'{src}/{n}-{s}.png'), f'{n}-{s}', 1200)
MH = 3200 * 2  # móvil: 3200 px CSS a DSF 2
for s in ['before', 'after']:
    save(Image.open(f'{src}/m-home-{s}.png').crop((0, 0, 780, MH)), f'm-home-{s}', 480, 74)

# Móvil: carta (2400 px CSS), pedido y locales (pantalla)
MC = 2400 * 2
save(Image.open(f'{src}/m-carta-before.png').crop((0, 0, 780, MC)), 'm-carta-before', 480, 74)
my = int(meta['mCartaTop'] - 16) * 2
save(Image.open(f'{src}/m-home-after.png').crop((0, my, 780, my + MC)), 'm-carta-after', 480, 74)
for n in ['pedido', 'locales']:
    for s in ['before', 'after']:
        save(Image.open(f'{src}/m-{n}-{s}.png'), f'm-{n}-{s}', 480, 76)
