#!/usr/bin/env python3
"""Prepara las imágenes de obras nuevas para la web.

Uso (desde la raíz del sitio):
    python3 _tools/images.py ruta/foto.jpg id-de-la-obra [otra.jpg otro-id ...]
    python3 _tools/images.py            # solo regenera los .webp y img/dims.json

Crea img/f/<id>.jpg (1400 px), img/t/<id>.jpg (640 px), sus versiones .webp
y actualiza img/dims.json (tamaños reales, para evitar saltos de maquetación).
Después: añade la obra a data.js y ejecuta  node build.js
"""
import glob, json, os, sys
from PIL import Image, ImageOps

args = sys.argv[1:]
for src, oid in zip(args[::2], args[1::2]):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    for d, m in (('f', 1400), ('t', 640)):
        c = im.copy()
        c.thumbnail((m, m), Image.LANCZOS)
        c.save(f'img/{d}/{oid}.jpg', quality=84, optimize=True, progressive=True)
    print('✓', oid)

dims = {}
for f in sorted(glob.glob('img/[ft]/*.jpg')):
    w = f[:-4] + '.webp'
    im = Image.open(f)
    if not os.path.exists(w) or os.path.getmtime(w) < os.path.getmtime(f):
        im.save(w, quality=80, method=6)
    if '/f/' in f:
        dims[os.path.basename(f)[:-4]] = list(im.size)
json.dump(dims, open('img/dims.json', 'w'), separators=(',', ':'))
print(len(dims), 'obras en img/dims.json')
