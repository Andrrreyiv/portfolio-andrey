"""Видео работ для портфолио: сценарий в Chromium (Playwright recordVideo) → кадрирование и кодирование ffmpeg.

Запуск из корня репозитория: python scripts/record.py [jetron tshirt viz sparks]
Источники — ЛОКАЛЬНЫЕ сборки конструкторов (серверы из C:/Projects/.claude/launch.json: jetron 8777,
tshirt 8779, viz 8731). ☠️ По jetronsport.ru автоматику не запускать. Спаркс снимается на боевом sparks.su
(решение владельца 17.10): только кнопки подбора, свободный текст не вводится — лимит нейросети не тратится.
Результат: assets/video/<имя>.webm, .mp4 и постер assets/video/<имя>.webp.
"""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'video')
FFMPEG = os.environ.get('FFMPEG') or os.path.expandvars(
    r'%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe'
    r'\ffmpeg-8.1-full_build\bin\ffmpeg.exe')  # в PATH он виден с битой кодировкой (замер 17.10)


def pause(s):
    time.sleep(s)


def jetron(pg):
    pg.goto('http://localhost:8777/', wait_until='networkidle'); pause(2.5)
    t0 = time.time()
    # подписи у карточек и цветов — в атрибутах, поэтому по порядку (разведка 17.10):
    # цвета Белый, Синий, Красный, Чёрный…; смена цвета ставит первую модель этого цвета
    pg.click('.pcolor >> nth=1'); pause(0.9)                             # синий: модели в цвете видны лучше
    for i in (2, 4):
        pg.click(f'.model-card >> nth={i}'); pause(1.0)
    for i in (2, 3):                                                      # красный, чёрный
        pg.click(f'.pcolor >> nth={i}'); pause(0.9)
    pg.click('.pcolor >> nth=0'); pause(0.7)                             # белый
    # Финал — белая Champion: у неё в zones.json зоны клиента, перенесённые с боевой картинки 30.08.
    # Остальным формам локальная сборка ставит фамилию на 10–28 px левее середины спинки (замер 18.10),
    # и на синей Champion буква «Г» заезжала на шов рукава — владелец: «фамилия съехала».
    pg.click('.model-card:has(img[src*="Champion"])'); pause(1.0)
    pg.click('.opt-head >> nth=0'); pause(0.6)
    pg.type('input[data-field="name"]', 'ГРЕЧУШКИН', delay=110); pause(0.3)
    pg.type('input[data-field="number"]', '7', delay=150); pause(1.0)
    pg.click('[data-fc="font"]'); pause(0.5)
    pg.click('.font-opt >> nth=1'); pause(2.2)                           # Oswald
    return t0


def tshirt(pg, wait=pause):
    pg.goto('http://localhost:8779/', wait_until='networkidle'); pause(1.5)
    # до начала кадра: крой «Оверсайз», прогрев картинок всех трёх цветов и превью библиотеки —
    # иначе в кадре мелькают пустые ячейки и недогруженная футболка
    pg.locator('.seg__btn:has-text("Оверсайз")').dispatch_event('click'); pause(1.0)
    for i in (1, 2, 0):
        pg.locator(f'.swatch:not(.swatch--text) >> nth={i}').dispatch_event('click'); pause(0.8)
    pg.evaluate("""async () => {
        const m = await (await fetch('src/config/prints-manifest.json')).json();
        await Promise.all(m.categories.flatMap((c) => c.items).map((i) => new Promise((r) => {
            const im = new Image(); im.onload = im.onerror = r; im.src = i.file; })));
    }"""); pause(1.0)
    t0 = time.time()
    # Принты из библиотеки клиента (владелец 18.10: «реально красивые принты… Месси, Роналдо»).
    # На сторону ложится до двух принтов слоями, поэтому старый снимаем крестиком перед новым.
    # Клики событием, а не мышью: курсора в кадре всё равно нет, а мышь Playwright подводит цель прокруткой.
    def click(sel):
        pg.locator(sel).dispatch_event('click')

    def pick(name, look=0.9):
        click('.design-row__btn'); wait(look)
        click(f'.libm__cell:has(img[src*="{name}"])'); wait(1.6)
    wait(1.0)
    pick('messi/2', 1.3)                                                 # окно библиотеки — подольше, один раз
    click('.swatch:not(.swatch--text) >> nth=1'); wait(0.8)            # чёрная
    click('.pf-print__del'); wait(0.3)
    pick('ronaldo/4')                         # на тёмной ткани библиотека первыми даёт принты под неё
    click('.swatch:not(.swatch--text) >> nth=2'); wait(0.8)            # слоновая кость
    click('.pf-print__del'); wait(0.3)
    pick('yamal/1'); wait(0.6)
    return t0


def viz(pg):
    pg.goto('http://localhost:8731/', wait_until='networkidle'); pause(2.5)
    t0 = time.time()
    # зоны 0 левая, 1 центральная, 2 правая (подписи в aria-label, поэтому по порядку)
    steps = [(0, 'Дерево', 'Беленый дуб'), (1, 'Дерево', 'Венге'),
             (2, 'Камень', None), (1, 'Гибкий мрамор', None), (0, 'Дерево', 'Орех')]
    for zone, tab, tile in steps:
        pg.click(f'.viz-zone >> nth={zone}'); pause(0.5)
        pg.click(f'.viz-tab:has-text("{tab}")'); pause(0.5)
        if tile:
            pg.click(f'.viz-tile:has-text("{tile}")')
        else:
            pg.click('.viz-tile >> nth=1')
        pause(1.3)
    pause(1.0)
    return t0


def sparks(pg):
    pg.goto('https://sparks.su/', wait_until='domcontentloaded', timeout=90000)
    pg.locator('#sparks-widget-loader button.btn').wait_for(timeout=60000); pause(1.5)
    t0 = time.time()
    pg.locator('#sparks-widget-loader button.btn').click()
    pg.locator('#sparks-widget-host .cw-panel.open').wait_for(timeout=30000); pause(2.0)
    pg.locator('#sparks-widget-host .chip', has_text='Подобрать оборудование').first.click(); pause(2.2)
    # дальше — первая предложенная кнопка шага, кроме возврата и менеджера; только клики, без текста
    skip = ('Назад', 'назад', 'менеджер', 'Менеджер', 'Вопрос', 'Связаться', 'Начать', 'сначала')
    for _ in range(3):
        chips = pg.locator('#sparks-widget-host .chip:visible')
        picked = False
        for i in range(chips.count()):
            text = chips.nth(i).inner_text().strip()
            if text and not any(w in text for w in skip):
                chips.nth(i).click(); picked = True; break
        pause(2.4)
        if not picked:
            break
    pause(1.5)
    return t0


def andrianov(pg):
    """Живой andrianov-agency.ru: плавная прокрутка главной. Cookie-баннер скрываем стилем, не принимая его."""
    pg.goto('https://andrianov-agency.ru/', wait_until='networkidle', timeout=90000)
    # полоса согласия CookieYes называется .cky-consent-container (замер 17.10)
    pg.add_style_tag(content='[class*="cookie" i],[id*="cookie" i],.cky-consent-container,.cky-overlay{display:none!important}')
    pause(2.0)
    t0 = time.time()
    pause(1.2)
    total = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
    y = 0
    for _ in range(40):  # ~8 с плавной прокрутки на первые 4,5 экрана
        y = min(total, y + 95)
        pg.evaluate(f'window.scrollTo(0, {y})')
        pause(0.2)
    pause(1.0)
    return t0


# имя → (сценарий, окно, кадрирование x, y, w, h)
SCENES = {
    'jetron': (jetron, (1280, 800), (30, 10, 790, 790)),
    # снимается скриншотами (см. Shots), поэтому окно обычной высоты
    'tshirt': (tshirt, (1280, 860), (82, 48, 720, 720)),
    'viz': (viz, (1280, 800), (0, 0, 1280, 620)),
    # высота 512, а не 664: ниже панели на sparks.su всплывает cookie-баннер сайта (замер 17.10)
    'sparks': (sparks, (1440, 900), (996, 132, 412, 512)),
    'andrianov': (andrianov, (1440, 900), (0, 0, 1440, 900)),
}


POSTER_FIRST = {'andrianov'}  # у прокрутки сайта лучший кадр — первый экран, у конструкторов — итог


SHOTS = {'tshirt'}  # снимаются скриншотами, см. Shots


class Shots:
    """Съёмка скриншотами области кадра вместо записи экрана.

    Запись экрана Playwright на конструкторе футболок вставляла кадры со сдвинутой страницей на каждой
    смене цвета и кроя, хотя окно не прокручивалось, а сцена не меняла высоту (замер 18.10).
    Скриншот дорисовывает страницу целиком, поэтому таких кадров в нём нет.
    """

    def __init__(self, pg, crop, folder):
        x, y, w, h = crop
        self.pg, self.folder, self.frames = pg, folder, []
        self.clip = {'x': x, 'y': y, 'width': w, 'height': h}

    # Конструктор на смене цвета пересобирает сцену (renderViews: innerHTML = ''): кадр, где новая картинка
    # футболки ещё не готова, не снимаем. Проявление сцены после этого (rise-in .5 с) — поведение самого
    # продукта, его оставляем.
    READY = """() => { const i = document.querySelector('.stage__img');
        return !!i && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height > 100; }"""

    def wait(self, s):
        """Пауза сценария, в которую идёт съёмка: кадр за кадром, пока не выйдет время."""
        end = time.time() + s
        while True:
            if self.pg.evaluate(self.READY):
                path = os.path.join(self.folder, f'{len(self.frames):05d}.jpg')
                self.pg.screenshot(path=path, clip=self.clip, type='jpeg', quality=92)
                self.frames.append((time.time(), path))
            if time.time() >= end:
                return

    def encode(self, name):
        # длительность каждого кадра — до следующего снимка: скриншоты идут неровно, а скорость должна быть живой
        lst = os.path.join(self.folder, 'frames.txt')
        with open(lst, 'w', encoding='utf-8') as f:
            for (t, path), (t2, _) in zip(self.frames, self.frames[1:]):
                f.write(f"file '{path.replace(os.sep, '/')}'\nduration {t2 - t:.3f}\n")
            f.write(f"file '{self.frames[-1][1].replace(os.sep, '/')}'\nduration 0.1\n")
            f.write(f"file '{self.frames[-1][1].replace(os.sep, '/')}'\n")  # concat требует повторить последний
        # JPEG даёт полный диапазон яркости (color_range=pc): такой VP9 Chrome не декодирует
        # (PIPELINE_ERROR_DECODE, замер 18.10) — переводим в обычный tv-диапазон
        _encode(['-f', 'concat', '-safe', '0', '-i', lst], 'scale=in_range=pc:out_range=tv,format=yuv420p,', name)


def encode(raw, name, start, crop):
    x, y, w, h = crop
    _encode(['-ss', f'{start:.2f}', '-i', raw], f'crop={w}:{h}:{x}:{y},', name)


def _encode(inp, pre, name):
    vf = pre + "scale='min(960,iw)':-2,fps=30"
    base = os.path.join(OUT, name)
    common = [FFMPEG, '-y', '-v', 'error', *inp, '-an', '-vf', vf]
    subprocess.run(common + ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', base + '.webm'], check=True)
    subprocess.run(common + ['-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                             '-movflags', '+faststart', base + '.mp4'], check=True)
    # постер — последний кадр (самое «собранное» состояние изделия) или первый, см. POSTER_FIRST
    seek = ['-ss', '0.1'] if name in POSTER_FIRST else ['-sseof', '-0.4']
    subprocess.run([FFMPEG, '-y', '-v', 'error', *seek, '-i', base + '.mp4', '-frames:v', '1',
                    '-c:v', 'libwebp', '-quality', '80', base + '.webp'], check=True)
    for ext in ('webm', 'mp4', 'webp'):
        print(f'  {name}.{ext}: {os.path.getsize(base + "." + ext) // 1024} КБ')


def main(names):
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in names:
            fn, (vw, vh), crop = SCENES[name]
            tmp = tempfile.mkdtemp(prefix=f'rec-{name}-')
            if name in SHOTS:
                ctx = browser.new_context(viewport={'width': vw, 'height': vh}, locale='ru-RU')
                shots = Shots(ctx.new_page(), crop, tmp)
                fn(shots.pg, shots.wait)
                ctx.close()
                print(f'{name}: {len(shots.frames)} кадров')
                shots.encode(name)
                continue
            ctx = browser.new_context(viewport={'width': vw, 'height': vh}, record_video_dir=tmp,
                                      record_video_size={'width': vw, 'height': vh}, locale='ru-RU')
            pg = ctx.new_page()
            started = time.time()
            t0 = fn(pg)
            assert pg.video, 'контекст создан без record_video_dir'
            raw = pg.video.path()
            ctx.close()  # видео дописывается при закрытии контекста
            print(f'{name}: записано, сцена с {t0 - started:.1f} с')
            encode(raw, name, max(0.0, t0 - started - 0.3), crop)
        browser.close()


if __name__ == '__main__':
    main(sys.argv[1:] or list(SCENES))
