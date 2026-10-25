// Живые фрагменты первого экрана кейса («Живой фрагмент первым», владелец 24.10).
// Сборка печатает ФИНАЛЬНОЕ состояние: без JS и при reduced-motion фрагмент виден целиком,
// а case.js разыгрывает действие продукта поверх (начальные состояния ставит сам скрипт).
// Всё, что здесь нарисовано, — реконструкция или иллюстрация: данных клиентов и учеников нет.

/** Детерминированный генератор: сборка обязана выдавать одни и те же байты (тест «сборка свежая»). */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (v) => Math.round(v * 10) / 10;

/* ── видео работы в окне браузера (старые кейсы: их видео и есть живой фрагмент) ── */
export function videoFrag(f, c, root, { esc, video }) {
  const host = (c.links.find((l) => l.primary) || {}).href;
  const label = host ? new URL(host).hostname : '';
  // второй предмет той же работы (ревью 25.10): мобильная версия в телефоне или второе окно — колонка не пустует
  const s = f.sub;
  const sub = s ? `<div class="frag-sub frag-sub--${s.pos}"><img src="${root}assets/img/${s.img}-${s.w}.webp" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" loading="lazy" decoding="async"></div>` : '';
  return `<figure class="frag frag--video${f.h > f.w ? ' frag--tall' : ''}" data-frag="video" style="--ar:${(f.w / f.h).toFixed(4)}">
    <div class="frag-stage${s ? ` has-${s.pos}` : ''}"><div class="frag-win shot"><div class="frag-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(label)}</span></div>${video(f, root)}</div>${sub}</div>
    <figcaption class="frag-cap mono">${esc(f.caption)}</figcaption>
  </figure>`;
}

/* ── englishgamematters: лобби комнаты, ученики входят по QR, счётчик растёт ──
   QR — узор для вида, ничего не кодирует (на стенде в нём был локальный адрес). */
function pseudoQr(n = 25) {
  const rnd = rng(305);
  const dark = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (x0, y0) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
      dark[y0 + y][x0 + x] = ring !== 2;
    }
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dark[y][x] = rnd() < 0.48;
  for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    for (let j = -1; j <= 7; j++) for (let i = -1; i <= 7; i++) {
      const X = x + i, Y = y + j;
      if (X >= 0 && Y >= 0 && X < n && Y < n) dark[Y][X] = false;
    }
    finder(x, y);
  }
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!dark[y][x]) continue;
      let w = 1;
      while (x + w < n && dark[y][x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  }
  return `<svg class="rm-qr" viewBox="-2 -2 ${n + 4} ${n + 4}" aria-hidden="true"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" rx="2"/><path d="${d}"/></svg>`;
}

export function roomFrag(f, c, root, { esc }) {
  const players = ['Alex', 'Sam', 'Mia', 'Leo', 'Zoe', 'Max'];
  return `<figure class="frag frag--room" data-frag="room">
    <div class="rm" lang="en" role="img" aria-label="Лобби игровой комнаты Sketch Relay: ученики вошли по QR-коду, счётчик — 6 из 30, учитель может запускать игру">
      <div class="rm-top"><span class="rm-logo"><i></i>SKETCH RELAY</span><span class="rm-live"><i></i>LIVE CLASS GAME</span></div>
      <p class="rm-k">TEACHER’S CONTROL ROOM</p>
      <p class="rm-h">The room is <em>getting bigger.</em></p>
      <div class="rm-card">
        <div class="rm-left">
          <p class="rm-row"><b>ROOM 4QKTX</b><span class="rm-count"><b class="rm-n">${players.length}</b> / 30 joined</span></p>
          <ul class="rm-players">${players.map((p) => `<li><i>${p[0]}</i>${p}</li>`).join('')}</ul>
          <span class="rm-btn">Shuffle teams &amp; start</span>
        </div>
        <div class="rm-right"><span class="rm-scan">Scan to join</span>${pseudoQr()}<span class="rm-code">4QKTX</span><i class="rm-beam"></i></div>
      </div>
      <div class="rm-phone"><div class="rm-phone-in"><span class="rm-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b>You’re in!</b><span>Waiting for the teacher…</span></div></div>
    </div>
    <figcaption class="frag-cap mono">${esc(f.caption)}</figcaption>
  </figure>`;
}

/* ── NeurochessAI: переписка в Telegram на партии Морфи (Париж, 1858) ── */
const MORPHY = [
  ['e4', 'e5'], ['Кf3', 'd6'], ['d4', 'Сg4'], ['d:e5', 'С:f3'], ['Ф:f3', 'd:e5'], ['Сc4', 'Кf6'], ['Фb3', 'Фe7'],
  ['Кc3', 'c6'], ['Сg5', 'b5'], ['К:b5', 'c:b5'], ['С:b5+', 'Кbd7'], ['0-0-0', 'Лd8'], ['Л:d7', 'Л:d7'],
  ['Лd1', 'Фe6'], ['С:d7+', 'К:d7'], ['Фb8+', 'К:b8'], ['Лd8#', ''],
];
/** Бланк записи партии: почерк — Caveat (`Hand` в case.css; SVG встроен, шрифты страницы работают). Ход 10 — с кляксой. */
function scoresheet() {
  const rnd = rng(1858);
  const rows = MORPHY.map(([w, b], i) => {
    const y = 78 + i * 25.5, j = () => r1((rnd() - 0.5) * 3);
    const blot = i === 9 ? '<ellipse class="ss-blot" cx="92" cy="' + r1(y - 6) + '" rx="13" ry="7"/>' : '';
    return `<text class="ss-n" x="22" y="${r1(y)}">${i + 1}</text><text class="ss-h" x="${r1(70 + j())}" y="${r1(y + j())}">${w}</text>${blot}`
      + (b ? `<text class="ss-h" x="${r1(170 + j())}" y="${r1(y + j())}">${b}</text>` : '');
  }).join('');
  const lines = MORPHY.map((_, i) => `M14 ${r1(84 + i * 25.5)}H256`).join('');
  return `<svg class="ss" viewBox="0 0 270 530" aria-hidden="true"><rect class="ss-paper" width="270" height="530" rx="4"/>`
    + `<text class="ss-t" x="135" y="28">БЛАНК ЗАПИСИ ПАРТИИ</text><text class="ss-c" x="96" y="56">Белые</text><text class="ss-c" x="196" y="56">Чёрные</text>`
    + `<path class="ss-l" d="M14 62H256${lines}M50 62V${r1(84 + 16 * 25.5)}M150 62V${r1(84 + 16 * 25.5)}"/>${rows}</svg>`;
}

export function chatFrag(f, c, root, { esc }) {
  const msg = (body, cls = '') => `<li class="tg-m${cls}"><span class="sr">Бот:</span>${body}</li>`;
  return `<figure class="frag frag--chat" data-frag="chat">
    <div class="ch">
      <div class="ch-sheet">${scoresheet()}</div>
      <div class="tg">
        <div class="tg-head"><span class="tg-ava" aria-hidden="true"><svg viewBox="4 5 36 36"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3"/></svg></span><p><b>NeurochessAI</b><span>бот</span></p></div>
        <ol class="tg-feed">
          <li class="tg-m tg-me"><span class="sr">Игрок:</span><span class="tg-photo" aria-hidden="true">${scoresheet()}</span><span class="tg-cap">Фото бланка</span></li>
          ${msg('<p>Прочитал партию: 17 ходов. Один ход записан неразборчиво.</p>')}
          ${msg('<p>10-й ход белых: как было?</p><p class="tg-btns"><span class="tg-b is-on">10. К:b5</span><span class="tg-b">10. Кd5</span></p>', ' tg-ask')}
          ${msg('<p>Принято. Все ходы легальны, партия до мата. Разбор:</p>')}
          ${msg(`<img class="tg-board" src="${root}assets/img/morphy-16.svg" width="360" height="360" alt="Позиция перед 16-м ходом белых: стрелка ферзя с b3 на b8" loading="lazy" decoding="async"><p><b>16. Фb8+!!</b> Ферзь отдаётся, чтобы увести коня с d7: 16…К:b8 17. Лd8#.</p><p class="tg-sub">Угроза соперника: 14…Фe6 предлагал размен ферзей на b3.</p>`, ' tg-last')}
        </ol>
      </div>
    </div>
    <figcaption class="frag-cap mono">${esc(f.caption)}</figcaption>
  </figure>`;
}

/* ── ассистент продаж (ревью 25.10: экран продукта, а не схема): телефон с чатом магазина и окно amoCRM,
   где видно, что получила модель — имя и телефон на глазах закрываются метками — и как заполняется карточка ── */
export function maskFrag(f, c, root, { esc }) {
  const phone = '+375&nbsp;29&nbsp;000-12-34';
  const tag = (orig, label) => `<span class="tag"><s aria-hidden="true">${orig}</s><b>${label}</b></span>`;
  const fields = [['Количество', '2'], ['Срок', 'к 15 декабря'], ['Доставка', 'Минск'], ['Покупатель', `Ольга, ${phone}`], ['Модель и цвет', 'уточнит менеджер']];
  return `<figure class="frag frag--mask" data-frag="mask">
    <div class="as">
      <div class="as-crm">
        <div class="frag-bar" aria-hidden="true"><i></i><i></i><i></i><span>amoCRM · сделка</span></div>
        <div class="as-crm-in">
          <p class="as-k">Что получила модель</p>
          <p class="as-prompt">Хочу заказать два изделия к 15 декабря. Меня зовут ${tag('Ольга', 'ИМЯ')}, телефон ${tag(phone, 'ТЕЛЕФОН')}, доставка в Минск.</p>
          <p class="as-k as-k--card"><b>Параметры изделия</b><span>18 полей</span></p>
          <dl>${fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          <p class="as-hand"><i aria-hidden="true"></i>Передано менеджеру</p>
        </div>
      </div>
      <div class="as-phone">
        <div class="as-head"><span class="as-ava" aria-hidden="true">AI</span><p><b>Консультант магазина</b><span>онлайн</span></p></div>
        <ol class="as-feed">
          <li class="as-m"><span class="sr">Ассистент:</span>Здравствуйте! Я консультант магазина: помогу подобрать изделие и оформить заказ.</li>
          <li class="as-m as-me"><span class="sr">Покупатель:</span>Здравствуйте! Хочу заказать два изделия к 15 декабря. Меня зовут Ольга, телефон ${phone}, доставка в Минск.</li>
          <li class="as-m"><span class="sr">Ассистент:</span>Спасибо! Записал: два изделия к 15 декабря, доставка в Минск. Модель и цвет уточнит менеджер&nbsp;— передаю ему заказ.</li>
        </ol>
        <p class="as-input" aria-hidden="true"><span>Сообщение…</span><i></i></p>
      </div>
    </div>
    <figcaption class="frag-cap mono">${esc(f.caption)}</figcaption>
  </figure>`;
}

/* ── ML: шлиф металла кодом — диаграмма Вороного с релаксацией Ллойда (равноосные зёрна) ── */
function clip(poly, nx, ny, d) {   // оставить часть многоугольника, где nx*x + ny*y <= d
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const da = nx * ax + ny * ay - d, db = nx * bx + ny * by - d;
    if (da <= 0) out.push([ax, ay]);
    if ((da < 0) !== (db < 0) && da !== db) { const t = da / (da - db); out.push([ax + (bx - ax) * t, ay + (by - ay) * t]); }
  }
  return out;
}
function voronoi(seeds, W, H) {
  return seeds.map(([sx, sy], i) => {
    let poly = [[0, 0], [W, 0], [W, H], [0, H]];
    seeds.forEach(([tx, ty], j) => {
      if (j === i || !poly.length) return;
      const nx = tx - sx, ny = ty - sy;
      poly = clip(poly, nx, ny, (nx * (sx + tx) + ny * (sy + ty)) / 2);
    });
    return poly;
  });
}
const centroid = (p) => {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length], k = x0 * y1 - x1 * y0;
    a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : p[0];
};

export function grainsFrag(f, c, root, { esc }) {
  const S = 600, rnd = rng(7032);
  let seeds = Array.from({ length: 150 }, () => [rnd() * S, rnd() * S]);
  for (let k = 0; k < 2; k++) seeds = voronoi(seeds, S, S).map(centroid);
  const cells = voronoi(seeds, S, S).map((p, i) => {
    const d = 'M' + p.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';
    return `<path class="gr-c t${Math.floor(rnd() * 5)}" d="${d}" data-o="${r1(seeds[i][0])} ${r1(seeds[i][1])}"/>`;
  }).join('');
  const inc = Array.from({ length: 14 }, () => `<circle cx="${r1(rnd() * S)}" cy="${r1(rnd() * S)}" r="${r1(1.2 + rnd() * 2.4)}"/>`).join('');
  return `<figure class="frag frag--grains" data-frag="grains">
    <div class="gr">
      <svg class="gr-svg" viewBox="0 0 600 760" role="img" aria-label="Иллюстрация: зёрна металлического шлифа под микроскопом; химсостав, металлография и микротвёрдость сходятся в модель прогноза свойств">
        <defs><clipPath id="gr-field"><circle cx="300" cy="300" r="282"/></clipPath>
          <radialGradient id="gr-vig"><stop offset=".72" stop-color="#1A1512" stop-opacity="0"/><stop offset="1" stop-color="#1A1512" stop-opacity=".34"/></radialGradient></defs>
        <g clip-path="url(#gr-field)"><rect class="gr-bg" width="600" height="600"/><g class="gr-cells">${cells}</g><g class="gr-inc">${inc}</g>
          <circle cx="300" cy="300" r="282" fill="url(#gr-vig)"/></g>
        <circle class="gr-ring" cx="300" cy="300" r="282"/>
        <path class="gr-ret" d="M300 30V70M300 530V570M30 300H70M530 300H570"/>
        <path class="gr-bar" d="M412 528H500"/>
        <g class="gr-flow">
          <path class="gr-ln" pathLength="1" d="M300 582C300 612 110 604 110 636"/><path class="gr-ln" pathLength="1" d="M300 582V636"/><path class="gr-ln" pathLength="1" d="M300 582C300 612 490 604 490 636"/>
          <g class="gr-in"><rect x="38" y="636" width="144" height="40" rx="20"/><text x="110" y="662">Химсостав</text></g>
          <g class="gr-in"><rect x="218" y="636" width="164" height="40" rx="20"/><text x="300" y="662">Металлография</text></g>
          <g class="gr-in"><rect x="408" y="636" width="164" height="40" rx="20"/><text x="490" y="662">Микротвёрдость</text></g>
          <path class="gr-ln" pathLength="1" d="M110 676C110 704 300 696 300 718"/><path class="gr-ln" pathLength="1" d="M300 676V718"/><path class="gr-ln" pathLength="1" d="M490 676C490 704 300 696 300 718"/>
          <g class="gr-model"><rect x="190" y="718" width="220" height="40" rx="20"/><text x="300" y="744">Модель → свойства</text></g>
        </g>
      </svg>
    </div>
    <figcaption class="frag-cap mono">${esc(f.caption)}</figcaption>
  </figure>`;
}

export const fragments = { video: videoFrag, room: roomFrag, chat: chatFrag, mask: maskFrag, grains: grainsFrag };
