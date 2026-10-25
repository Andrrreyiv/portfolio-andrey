"""Готовит картинки сайта: PNG-исходники → WebP двух ширин в assets/img/.

Запуск из корня репозитория: python scripts/images.py
Исходники лежат вне репо (в соседних проектах) — список ниже и есть их реестр.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.dirname(ROOT)  # C:/Projects
OUT = os.path.join(ROOT, 'assets', 'img')
SCRATCH = os.environ.get('SCRATCH', '')

# имя → (исходник, обрезка (x0, y0, x1, y1) или None)
SOURCES = {
    'jetron-form': (f'{P}/jetron-constructor/docs/screens-2026-09-25/boevoj-shrift-nomera-otdelno.png', None),
    'jetron-zones': (f'{P}/portfolio-upload/02-konstruktor-formy-familiya-nomer.png', None),
    'jetron-mobile': (f'{P}/portfolio-upload/03-konstruktor-formy-mobile.png', (0, 0, 375, 812)),
    'tshirt-print': (f'{P}/portfolio-upload/04-konstruktor-futbolok-print.png', None),
    'tshirt-text': (f'{P}/tshirt-constructor/docs/screens-2026-09-20/boevoj-futbolki-pole-i-knopki.png', None),
    'poster-panel': (f'{P}/poster-constructor/docs/demo-desktop-1440.png', (905, 0, 1320, 1064)),
    'sparks-widget': (f'{ROOT}/assets/sparks-widget.png', None),
    'stenarium': (f'{ROOT}/assets/stenarium.png', None),
    'gglass': (f'{ROOT}/assets/gglass-academy.png', None),
    'sheymarket': (f'{ROOT}/assets/sheymarket.png', None),
    'ux-audit': (f'{ROOT}/assets/ux-audit.png', None),
    # englishgamematters: экраны сервера комнат с локального стенда (без адресов и QR), 24.10
    'egm-gallery': (f'{P}/gamematters-access/docs/stand/rooms-3-gallery.png', (90, 18, 1190, 738)),
    'egm-draw': (f'{P}/gamematters-access/docs/stand/rooms-2-student-draw.png', None),
    'egm-speaker': (f'{P}/gamematters-access/docs/stand/rooms-6-library-speaker.png', None),
}
if SCRATCH:
    SOURCES['sparks-site'] = (os.path.join(SCRATCH, 'sparks-viewport.png'), None)
    # живой andrianov-agency.ru 17.10, полоса согласия скрыта стилем (не принята)
    SOURCES['andr-home'] = (os.path.join(SCRATCH, 'andr-home-1440.png'), None)
    SOURCES['andr-advokat'] = (os.path.join(SCRATCH, 'andr-advokat-1440.png'), None)
    SOURCES['andr-haip'] = (os.path.join(SCRATCH, 'andr-haip-1440.png'), None)
    SOURCES['andr-mobile'] = (os.path.join(SCRATCH, 'andr-home-390.png'), (0, 0, 780, 1688))
    # обложки кейсов без скриншотов: снимок живого фрагмента собственной страницы кейса (1440×900), 24.10
    for slug in ('assistant', 'bot', 'ml'):
        # снимок самого фрагмента на ровном угле (covers.py, ревью 25.10): 21:9 — «Следующий кейс» и OG, 4:3 — индекс
        SOURCES[f'{slug}-cover'] = (os.path.join(SCRATCH, f'{slug}-cover.png'), None)
        SOURCES[f'{slug}-thumb'] = (os.path.join(SCRATCH, f'{slug}-thumb.png'), None)

WIDTHS = (800, 1600)

# python scripts/images.py egm-gallery egm-draw — только названные (остальные не пережимать заново)
ONLY = set(sys.argv[1:])
os.makedirs(OUT, exist_ok=True)
for name, (src, crop) in SOURCES.items():
    if ONLY and name not in ONLY:
        continue
    if not os.path.exists(src):
        print('нет исходника:', name, src)
        continue
    im = Image.open(src)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if crop:
        im = im.crop(crop)
    # Малая версия 800 и крупная в родной ширине (не больше 1600), если исходник шире 900.
    targets = sorted({min(WIDTHS[0], im.width)} | ({min(WIDTHS[1], im.width)} if im.width > 900 else set()))
    for tw in targets:
        th = round(im.height * tw / im.width)
        out = im.resize((tw, th), Image.Resampling.LANCZOS) if tw != im.width else im
        path = os.path.join(OUT, f'{name}-{tw}.webp')
        out.save(path, 'WEBP', quality=82, method=6)
        print(f'{name}-{tw}.webp {tw}x{th} {round(os.path.getsize(path) / 1024)} KB')
