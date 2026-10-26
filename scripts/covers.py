"""Обложки v2-кейсов без текста страницы (ревью 25.10): снимок самого фрагмента (DPR 2) без зерна страницы,
обрезан плотно по содержимому и посажен на ровный #100E0C. Два кадра под две рамки:
  <name>-cover.png 1680×720 (21:9) — «Следующий кейс» и OG, фрагмент целиком по высоте;
  <name>-thumb.png 960×720 (4:3)  — «Индекс работ»: кадр справа и миниатюры на телефоне, фрагмент крупно.

Запуск (нужен локальный сервер 127.0.0.1:8744):
  SCRATCH=<папка> python scripts/covers.py
  SCRATCH=<папка> python scripts/images.py assistant-cover bot-cover ml-cover assistant-thumb bot-thumb ml-thumb
"""
import os, tempfile, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

# куда класть снимки: SCRATCH (тот же путь потом читает images.py), иначе — временная папка
SCR = os.environ.get('SCRATCH') or tempfile.gettempdir()
BG = (16, 14, 12)
JOBS = {'bot': ('neurochessai', '.ch'), 'assistant': ('sales-assistant', '.as'), 'ml': ('metal-ml', '.gr')}


def poster(frag, W, H, fill):
    k = min(W * fill / frag.width, H * fill / frag.height)
    f = frag.resize((round(frag.width * k), round(frag.height * k)), Image.Resampling.LANCZOS)
    out = Image.new('RGB', (W, H), BG)
    out.paste(f, ((W - f.width) // 2, (H - f.height) // 2))
    return out


with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, (slug, sel) in JOBS.items():
        c = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
        p = c.new_page()
        p.goto(f'http://127.0.0.1:8744/cases/{slug}/', wait_until='load')
        time.sleep(9)   # фрагмент доигрывает своё действие
        # зерно страницы и фон — ровный уголь, иначе вокруг фрагмента виден светлый прямоугольник
        p.add_style_tag(content='.grain{display:none!important}html,body,main,.c-hero,.c-frag{background:#100E0C!important}')
        time.sleep(0.4)
        raw = os.path.join(SCR, f'{name}-frag.png')
        p.locator(sel).first.screenshot(path=raw)
        c.close()
        frag = Image.open(raw).convert('RGB')
        diff = ImageChops.difference(frag, Image.new('RGB', frag.size, BG)).convert('L').point(lambda v: 255 if v > 10 else 0)
        box = diff.getbbox() or (0, 0, *frag.size)
        pad = 24
        frag = frag.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(frag.width, box[2] + pad), min(frag.height, box[3] + pad)))
        poster(frag, 1680, 720, 0.9).save(os.path.join(SCR, f'{name}-cover.png'))
        poster(frag, 960, 720, 0.94).save(os.path.join(SCR, f'{name}-thumb.png'))
        print('ok', name, frag.size, flush=True)
    b.close()
