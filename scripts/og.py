"""Картинки для соцсетей (1200×630) и иконки: тёмный фон, Playfair, кадр работы справа.

Запуск из корня репозитория: python scripts/og.py <папка с полными шрифтами Playfair.ttf, Playfair-Italic.ttf, Onest.ttf>
Шрифты — полные переменные файлы из google/fonts (в репо лежат только урезанные woff2).
"""
import io, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = sys.argv[1]
BG, FG, MUTE, ACC = (16, 14, 12), (239, 232, 221), (142, 132, 120), (255, 91, 46)
_static = {}


def font(name, size, axes=None):
    """Pillow не всегда применяет оси переменного шрифта (замер 10.10: Playfair вышел светлым
    и широким), поэтому начертание фиксируется заранее через fontTools в статичную копию."""
    key = (name, tuple(sorted((axes or {}).items())))
    if key not in _static:
        f = TTFont(os.path.join(FONTS, name))
        if axes:
            f = instancer.instantiateVariableFont(f, axes)
        buf = io.BytesIO()
        f.save(buf)
        _static[key] = buf.getvalue()
    return ImageFont.truetype(io.BytesIO(_static[key]), size)


def wrap(draw, text, f, width):
    lines, line = [], ''
    for word in text.split():
        test = (line + ' ' + word).strip()
        if draw.textlength(test, font=f) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def card(title, kicker, shot, out, align='left'):
    im = Image.new('RGB', (1200, 630), BG)
    d = ImageDraw.Draw(im)
    if shot:
        s = Image.open(os.path.join(ROOT, 'assets', 'img', shot)).convert('RGB')
        h = 470
        s = s.resize((int(s.width * h / s.height), h), Image.Resampling.LANCZOS)
        w = min(s.width, 520)
        s = s.crop((s.width - w, 0, s.width, h)) if align == 'right' else s.crop((0, 0, w, h))
        mask = Image.new('L', s.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s.width - 1, h - 1], 18, fill=255)
        im.paste(s, (1200 - s.width - 56, 80), mask)
    text_w = 1200 - 112 - (560 if shot else 0)
    mono = font('Onest.ttf', 22, {'wght': 500})
    d.text((56, 72), kicker.upper(), font=mono, fill=MUTE)
    tf = font('Playfair.ttf', 66, {'opsz': 144, 'wdth': 87.5, 'wght': 500})
    y = 130
    for ln in wrap(d, title, tf, text_w)[:5]:
        d.text((56, y), ln, font=tf, fill=FG)
        y += 70
    d.ellipse([56, 540, 104, 588], outline=(70, 64, 58), width=2)
    d.text((80, 566), 'АБ', font=font('Playfair-Italic.ttf', 22, {'opsz': 144, 'wdth': 87.5, 'wght': 500}), fill=ACC, anchor='mm')
    d.text((120, 552), 'Андрей Брыкун · AI, автоматизация, разработка', font=font('Onest.ttf', 22, {'wght': 500}), fill=FG)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, optimize=True)


cases = json.load(open(os.path.join(ROOT, 'content', 'cases.json'), encoding='utf-8'))['cases']
card('Превращаю задачи бизнеса в работающие решения', 'портфолио · 2026',
     'jetron-form-800.webp', os.path.join(ROOT, 'assets', 'og', 'home.png'))
for c in cases:
    card(c['title'], c['kicker'], f"{c['cover']['img']}-{c['cover']['widths'][0]}.webp", os.path.join(ROOT, 'assets', 'og', c['slug'] + '.png'), c.get('ogAlign', 'left'))

# иконки: круг угля, «АБ» курсивом в акценте
for size, name in ((32, 'favicon-32.png'), (180, 'apple-touch-icon.png')):
    k = 8
    big = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0))
    g = ImageDraw.Draw(big)
    g.ellipse([0, 0, size * k - 1, size * k - 1], fill=BG + (255,))
    g.text((size * k / 2, size * k * .52), 'АБ', font=font('Playfair-Italic.ttf', int(size * k * .5), {'opsz': 144, 'wdth': 87.5, 'wght': 600}), fill=ACC, anchor='mm')
    big.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(ROOT, name))
print('готово: assets/og/*.png, favicon-32.png, apple-touch-icon.png')
