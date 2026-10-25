// Сборка статики без зависимостей: страницы кейсов из content/cases.json + templates/case.html,
// «Индекс работ», общие навигация и футер в index.html по маркерам, sitemap.xml.
// Запуск из корня репозитория: node scripts/build.mjs. Результат коммитится — у GitHub Pages сборки нет.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fragments } from './fragments.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://andrrreyiv.github.io/portfolio-andrey/';
const TG = 'https://t.me/Guru_Blockchain';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// тире не открывает строку: пробел перед ним неразрывный (владелец 18.10, «— предложу» в начале строки)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/ — /g, '&nbsp;— ');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
const pad = (i) => String(i).padStart(2, '0');
// Цифра в Playfair: пробелы внутри чисел неразрывные, а стрелку рисует текстовый шрифт —
// своя стрелка Playfair похожа на «»» и читается как кавычка (замер 10.10).
const figure = (s) => esc(s).replace(/(\d) (?=\d)/g, '$1 ').replace(/→/g, '<span class="ar">→</span>');

export function loadCases() {
  return JSON.parse(read('content/cases.json')).cases;
}
export function loadIndex() {
  return JSON.parse(read('content/index.json'));
}

/* ── картинка: WebP нескольких ширин, размеры заданы — без скачков вёрстки ── */
function img({ img: name, widths, w, h, alt }, root, sizes, eager = false) {
  const src = (x) => `${root}assets/img/${name}-${x}.webp`;
  const srcset = widths.length > 1 ? ` srcset="${widths.map((x) => `${src(x)} ${x}w`).join(', ')}" sizes="${sizes}"` : '';
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${src(widths[0])}"${srcset} width="${w}" height="${h}" alt="${esc(alt)}"${load} decoding="async">`;
}

/* ── видео работы: без звука по кругу, грузится только когда видно (core.js → loopVideos),
   при reduced-motion и saveData остаётся постер ── */
export function video({ name, w, h, alt }, root, cls = '') {
  const base = `${root}assets/video/${name}`;
  return `<video class="loop${cls ? ' ' + cls : ''}" muted loop playsinline preload="none" poster="${base}.webp" width="${w}" height="${h}" aria-label="${esc(alt)}">`
    + `<source src="${base}.webm" type="video/webm"><source src="${base}.mp4" type="video/mp4"></video>`;
}

/** Схема diagram-design прямо в разметку: без пролога и комментариев, id с префиксом файла, role="img" и подпись. */
export function inlineSvg(file, label) {
  const path = `assets/diagrams/${file}.svg`;
  if (!existsSync(join(ROOT, path))) throw new Error(`нет схемы ${path}`);
  let s = read(path).replace(/<\?xml[\s\S]*?\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/gi, '').replace(/@import[^;]*;/g, '').trim();
  for (const [, id] of s.matchAll(/\bid="([^"]+)"/g)) {
    if (id.startsWith(`${file}-`)) continue;
    const to = `${file}-${id}`;
    s = s.split(`id="${id}"`).join(`id="${to}"`).split(`#${id})`).join(`#${to})`).split(`"#${id}"`).join(`"#${to}"`);
  }
  return s.replace(/<svg\b([^>]*)>/, (m, a) => `<svg${a.replace(/\s(?:width|height|role|aria-label|xmlns:xlink)="[^"]*"/g, '')} role="img" aria-label="${esc(label)}">`)
    .replace(/ — /g, ' — ');
}

const ext = (href, label, cls) =>
  `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;
// подзаголовок главы («Глава 2 · продвижение») над заголовком блока
const head = (b, extra = '') => (b.kicker
  ? `<div class="c-hd${extra}"><p class="c-chap mono">${esc(b.kicker)}</p><h2 class="c-h">${esc(b.title)}</h2></div>`
  : `<h2 class="c-h${extra}">${esc(b.title)}</h2>`);
const sec = (b, cls, inner) => `
<section class="c-block${cls} wrap"${b.id ? ` id="${b.id}"` : ''}>
  ${inner}
</section>`;

const blocks = {
  text: (b) => sec(b, '', `${head(b)}
  <div class="c-body">${b.paras.map((p) => `<p data-reveal>${esc(p)}</p>`).join('')}</div>`),

  products: (b, root) => sec(b, ' c-block--wide', `${head(b)}
  <div class="c-prods">${b.items.map((it, i) => `
    <article class="c-prod${it.h > it.w ? ' c-prod--tall' : ''}" data-reveal>
      <figure class="shot">${img(it, root, '(min-width:1024px) 50vw, 92vw')}</figure>
      <div class="c-prod-body">
        <p class="mono">${pad(i + 1)}</p>
        <h3>${esc(it.name)}</h3>
        <ul class="did">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${ext(it.href, 'Открыть на сайте', 'link-arrow')}
      </div>
    </article>`).join('')}
  </div>`),

  split: (b, root) => sec(b, '', `${head(b)}
  <div class="c-split">
    <figure class="shot c-split-shot" data-reveal>${img(b, root, '400px')}</figure>
    <ul class="did c-split-list">${b.points.map((p) => `<li data-reveal>${esc(p)}</li>`).join('')}</ul>
  </div>`),

  metrics: (b) => sec(b, '', `${head(b)}
  <dl class="c-metrics">${b.items.map((m) => `<div data-reveal><dt>${figure(m.v)}</dt><dd>${esc(m.k)}</dd></div>`).join('')}</dl>`),

  list: (b) => sec(b, '', `${head(b)}
  <ol class="c-list">${b.items.map((t, i) => `<li data-reveal><span class="mono">${pad(i + 1)}</span><p>${esc(t)}</p></li>`).join('')}</ol>`),

  // логика по шагам: линия слева дорисовывается прокруткой (case.js), шаг загорается, когда линия до него дошла
  steps: (b) => sec(b, '', `${head(b)}
  <ol class="c-steps">${b.items.map((s, i) => `<li data-reveal><span class="c-step-n mono">${pad(i + 1)}</span><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></li>`).join('')}</ol>`),

  // схема: широкая для экрана, высокая для телефона (CSS показывает одну); узлы и связи дорисовываются один раз
  diagram: (b) => {
    const tall = existsSync(join(ROOT, `assets/diagrams/${b.svg}-tall.svg`));
    return sec(b, ' c-block--wide', `${head(b)}
  <figure class="c-dg">
    <div class="dg dg--wide">${inlineSvg(b.svg, b.alt)}</div>${tall ? `
    <div class="dg dg--tall">${inlineSvg(`${b.svg}-tall`, b.alt)}</div>` : ''}
    <figcaption class="mono">${esc(b.caption)}</figcaption>
  </figure>`);
  },

  // настоящие экраны продукта: широкий кадр и телефоны рядом
  screens: (b, root) => sec(b, ' c-block--wide', `${head(b)}
  <div class="c-screens">${b.items.map((it) => `
    <figure class="shot${it.h > it.w ? ' shot--tall' : ''}" data-reveal>${img(it, root, it.h > it.w ? '320px' : '(min-width:1024px) 62vw, 92vw')}</figure>`).join('')}
  </div>`),

  video: (b, root) => sec(b, ' c-block--wide', `${head(b)}
  <div class="c-videos c-videos--${b.items.length}">${b.items.map((v) => `
    <figure class="c-video${v.h > v.w ? ' c-video--tall' : ''}" data-reveal>
      <div class="shot">${video(v, root)}</div>
      <figcaption class="mono">${esc(v.caption)}</figcaption>
    </figure>`).join('')}
  </div>`),

  gallery: (b, root) => `
<section class="c-gallery wrap" aria-label="Галерея">${b.items.map((it) =>
    `<figure class="shot${it.h > it.w ? ' shot--tall' : ''}" data-reveal>${img(it, root, '(min-width:1024px) 60vw, 92vw')}</figure>`).join('')}
</section>`,
};
// цифры и отмеченные блоки — на бежевой полосе во всю ширину: главы идут вперемежку (tokens.css, «Тона секций»)
const isBand = (b) => b.type === 'metrics' || b.band === true;
const renderBlock = (b, root) => (isBand(b) ? `<div class="c-band tone-paper">${blocks[b.type](b, root)}</div>` : blocks[b.type](b, root));

/* ── проверка контента до сборки: падаем громко, а не собираем полуправду ── */
const NDA_OK = /1-SE|ГОСТ 7\.32|\b2026\b/g;
export function validate(cases) {
  const err = [];
  const slugs = new Set();
  for (const c of cases) {
    if (slugs.has(c.slug)) err.push(`${c.slug}: slug повторяется`);
    slugs.add(c.slug);
    for (const k of ['dir', 'year', 'title', 'titleHtml', 'description', 'lead', 'cover', 'fragment', 'row', 'updated']) if (!c[k]) err.push(`${c.slug}: нет поля ${k}`);
    if (c.fragment && !fragments[c.fragment.type]) err.push(`${c.slug}: неизвестный фрагмент ${c.fragment.type}`);
    c.blocks.forEach((b, i) => {
      if (!blocks[b.type]) err.push(`${c.slug}: неизвестный блок ${b.type}`);
      if (i && isBand(b) && isBand(c.blocks[i - 1])) err.push(`${c.slug}: две бежевые полосы подряд (${c.blocks[i - 1].type}, ${b.type})`);
      if (b.type === 'diagram' && (!b.alt || b.alt.length < 30)) err.push(`${c.slug}: у схемы ${b.svg} нет описания`);
    });
    if (c.nda) {
      if (c.blocks.some((b) => b.type === 'metrics')) err.push(`${c.slug}: у NDA-кейса не бывает цифр (metrics)`);
      const text = JSON.stringify({ ...c, cover: c.cover.alt, row: { ...c.row, shot: '' }, slug: '', updated: '', blocks: c.blocks.map((b) => ({ ...b, svg: '' })) });
      const digits = text.replace(NDA_OK, '').match(/.{0,24}\d.{0,12}/);
      if (digits) err.push(`${c.slug}: цифра в NDA-кейсе — «${digits[0]}»`);
    }
  }
  for (const c of cases) if (!slugs.has(c.next)) err.push(`${c.slug}: следующий кейс ${c.next} не найден`);
  // кольцо «следующий кейс» обходит все кейсы ровно по разу
  const seen = new Set();
  for (let c = cases[0]; c && !seen.has(c.slug); c = cases.find((x) => x.slug === c.next)) seen.add(c.slug);
  if (seen.size !== cases.length) err.push(`кольцо «следующий кейс» обходит ${seen.size} из ${cases.length}`);
  if (err.length) throw new Error('content/cases.json:\n  ' + err.join('\n  '));
}

export function renderMain(c, all, root) {
  const next = all.find((x) => x.slug === c.next);
  const links = c.links.map((l) => (l.primary
    ? `<a class="btn btn-accent" data-magnet href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} <span class="arr ne" aria-hidden="true">↗</span></a>`
    : ext(l.href, l.label, 'chip'))).join('\n      ');
  // у закрытых работ (бот у заказчика, NDA) основное действие — обсудить похожую задачу
  const acts = links || `<a class="btn btn-accent" data-magnet href="${TG}" target="_blank" rel="noopener">Обсудить похожую задачу <span class="arr ne" aria-hidden="true">↗</span></a>`;
  const num = c.hero ? `
    <p class="c-num" data-reveal><span class="c-num-v" data-odo>${figure(c.hero.v)}</span><span class="c-num-k">${esc(c.hero.k)}</span></p>` : '';
  const frag = fragments[c.fragment.type](c.fragment, c, root, { esc, video });
  return `<main id="main" class="case-main">
<header class="c-hero wrap">
  <div class="c-hero-txt">
    <a class="c-back mono" href="${root}#more"><span aria-hidden="true">←</span> Все работы</a>
    <p class="c-kicker mono">${esc(c.dir)} · ${esc(c.year)}</p>
    <h1 class="c-title" data-split>${c.titleHtml.replace(/ — /g, '&nbsp;— ')}</h1>
    <p class="c-task" data-reveal>${esc(c.task || c.lead)}</p>${num}
    <div class="c-acts" data-reveal>
      ${acts}
    </div>
  </div>
  <div class="c-frag vt-${c.slug}">${frag}</div>
</header>
<section class="c-intro wrap" aria-label="Коротко о проекте">
  ${c.task ? `<p class="c-lead" data-reveal>${esc(c.lead)}</p>` : '<span></span>'}
  <dl class="c-meta" data-reveal>${c.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
</section>
${c.blocks.map((b) => renderBlock(b, root)).join('\n')}
<section class="c-cta wrap" aria-labelledby="cta-h">
  <p class="mono">Нужно похожее?</p>
  <h2 id="cta-h" class="c-cta-h">Расскажите задачу&nbsp;— <em>предложу решение</em></h2>
  <a class="btn btn-accent" data-magnet href="${TG}" target="_blank" rel="noopener">Обсудить в Telegram <span class="arr ne" aria-hidden="true">↗</span></a>
</section>
<nav class="c-next" aria-label="Следующий кейс">
  <a class="wrap c-next-in" href="../${next.slug}/">
    <span class="mono">Следующий кейс · ${esc(next.dir)}</span>
    <span class="c-next-title">${esc(next.title)}</span>
    <span class="c-next-arr" aria-hidden="true">→</span>
    <span class="shot c-next-shot${next.cover.center ? ' is-center' : ''}">${img({ ...next.cover, alt: '' }, root, '(min-width:1320px) 1224px, 92vw')}</span>
  </a>
</nav>
</main>`;
}

export function renderCase(c, all, parts) {
  const root = '../../';
  const url = `${SITE}cases/${c.slug}/`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: c.title, description: c.description, url,
    image: `${SITE}assets/og/${c.slug}.png`, inLanguage: 'ru', dateModified: c.updated,
    creator: { '@type': 'Person', '@id': `${SITE}#person`, name: 'Андрей Брыкун' },
  };
  return fill(parts.tpl, {
    root, url,
    pageTitle: esc(`${c.title} — кейс Андрея Брыкуна`),
    description: esc(c.description),
    ogImage: `${SITE}assets/og/${c.slug}.png`,
    jsonld: JSON.stringify(jsonld).replace(/</g, '\\u003c'),
    nav: fill(parts.nav, { root }),
    footer: fill(parts.footer, { root }),
    main: renderMain(c, all, root),
  });
}

/* ── «Индекс работ» на главной: группы по задачам, строка ведёт в кейс; кадр выбранной работы — справа
   (home.js → workIndex), на телефоне у каждой строки своя миниатюра ── */
export function renderIndex(cases, index) {
  const rows = [
    // у кейсов без скриншота свой кадр 4:3 под индекс (row.shot), у остальных — обложка
    ...cases.map((c) => ({ ...c.row, year: c.year, href: `cases/${c.slug}/`, shot: c.row.shot || c.cover })),
    ...index.items,
  ];
  for (const r of rows) if (!index.groups.includes(r.group)) throw new Error(`индекс: неизвестная группа «${r.group}»`);
  const row = (r) => {
    const src = `assets/img/${r.shot.img}-800.webp`;
    const th = `<img class="ix-th" src="${src}" width="${r.shot.w}" height="${r.shot.h}" alt="" loading="lazy" decoding="async">`;
    const body = `${th}<span class="ix-t">${esc(r.t)}</span><span class="ix-d">${esc(r.did)}${r.note ? ` <em>· ${esc(r.note)}</em>` : ''}</span>`
      + `<span class="ix-s mono">${esc(r.stack)}${r.year ? ` · ${esc(r.year)}` : ''}</span>`;
    const outer = /^https?:/.test(r.href || '');
    const a = r.href
      ? `<a class="ix-a" href="${esc(r.href)}"${outer ? ' target="_blank" rel="noopener"' : ''}>${body}<span class="ix-ar" aria-hidden="true">${outer ? '↗' : '→'}</span></a>`
      : `<div class="ix-a ix-a--off">${body}</div>`;
    return `<li class="ix-row" data-shot="${src}">${a}</li>`;
  };
  const groups = index.groups.map((g) => {
    const list = rows.filter((r) => r.group === g);
    return list.length ? `<div class="ix-group"><h3 class="ix-g mono">${esc(g)}</h3><ul class="ix-list">${list.map(row).join('')}</ul></div>` : '';
  }).join('\n      ');
  const first = rows.find((r) => r.group === index.groups[0]);
  return `    <div class="ix">
      <div class="ix-groups">
      ${groups}
      </div>
      <figure class="ix-view" aria-hidden="true"><span class="ix-frame shot"><img src="assets/img/${first.shot.img}-800.webp" width="${first.shot.w}" height="${first.shot.h}" alt="" loading="lazy" decoding="async"></span></figure>
    </div>`;
}

/** Вставляет кусок между <!--#имя--> и <!--/#имя-->. Без маркеров — ошибка, а не тихий пропуск. */
export function inject(html, name, chunk) {
  const re = new RegExp(`(<!--#${name}-->)[\\s\\S]*?(<!--\\/#${name}-->)`);
  if (!re.test(html)) throw new Error(`нет маркеров <!--#${name}--> в index.html`);
  return html.replace(re, `$1\n${chunk.trimEnd()}\n$2`);
}

export function build({ write = true, cases = loadCases() } = {}) {
  validate(cases);
  const parts = { tpl: read('templates/case.html'), nav: read('partials/nav.html'), footer: read('partials/footer.html') };
  const out = {};
  for (const c of cases) out[`cases/${c.slug}/index.html`] = renderCase(c, cases, parts);
  let home = read('index.html');
  home = inject(home, 'nav', fill(parts.nav, { root: './' }));
  home = inject(home, 'footer', fill(parts.footer, { root: './' }));
  home = inject(home, 'index', renderIndex(cases, loadIndex()));
  out['index.html'] = home;
  const last = cases.map((c) => c.updated).sort().pop();
  out['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${last}</lastmod></url>
${cases.map((c) => `  <url><loc>${SITE}cases/${c.slug}/</loc><lastmod>${c.updated}</lastmod></url>`).join('\n')}
</urlset>
`;
  if (write) {
    for (const [p, s] of Object.entries(out)) {
      mkdirSync(dirname(join(ROOT, p)), { recursive: true });
      writeFileSync(join(ROOT, p), s);
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = build();
  console.log('собрано:', Object.keys(out).join(', '));
}
