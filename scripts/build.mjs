// Сборка статики без зависимостей: страницы кейсов из content/cases.json + templates/case.html,
// общие навигация и футер в index.html по маркерам, sitemap.xml.
// Запуск из корня репозитория: node scripts/build.mjs. Результат коммитится — у GitHub Pages сборки нет.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://andrrreyiv.github.io/portfolio-andrey/';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// тире не открывает строку: пробел перед ним неразрывный (владелец 18.10, «— предложу» в начале строки)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/ — /g, '&nbsp;— ');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
// Цифра в Playfair: пробелы внутри чисел неразрывные, а стрелку рисует текстовый шрифт —
// своя стрелка Playfair похожа на «»» и читается как кавычка (замер 10.10).
const figure = (s) => esc(s).replace(/(\d) (?=\d)/g, '$1 ').replace(/→/g, '<span class="ar">→</span>');

export function loadCases() {
  return JSON.parse(read('content/cases.json')).cases;
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

const ext = (href, label, cls) =>
  `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;

const blocks = {
  text: (b) => `
<section class="c-block wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <div class="c-body">${b.paras.map((p) => `<p data-reveal>${esc(p)}</p>`).join('')}</div>
</section>`,

  products: (b, root) => `
<section class="c-block c-block--wide wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <div class="c-prods">${b.items.map((it, i) => `
    <article class="c-prod${it.h > it.w ? ' c-prod--tall' : ''}" data-reveal>
      <figure class="shot">${img(it, root, '(min-width:1024px) 50vw, 92vw')}</figure>
      <div class="c-prod-body">
        <p class="mono">${String(i + 1).padStart(2, '0')}</p>
        <h3>${esc(it.name)}</h3>
        <ul class="did">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${ext(it.href, 'Открыть на сайте', 'link-arrow')}
      </div>
    </article>`).join('')}
  </div>
</section>`,

  split: (b, root) => `
<section class="c-block wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <div class="c-split">
    <figure class="shot c-split-shot" data-reveal>${img(b, root, '400px')}</figure>
    <ul class="did c-split-list">${b.points.map((p) => `<li data-reveal>${esc(p)}</li>`).join('')}</ul>
  </div>
</section>`,

  // цифры — на бежевой полосе во всю ширину, «как устроено» — снова на чёрном: главы идут вперемежку (tokens.css, «Тона секций»)
  metrics: (b) => `
<div class="c-band tone-paper"><section class="c-block wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <dl class="c-metrics">${b.items.map((m) => `<div data-reveal><dt>${figure(m.v)}</dt><dd>${esc(m.k)}</dd></div>`).join('')}</dl>
</section></div>`,

  list: (b) => `
<section class="c-block wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <ol class="c-list">${b.items.map((t, i) => `<li data-reveal><span class="mono">${String(i + 1).padStart(2, '0')}</span><p>${esc(t)}</p></li>`).join('')}</ol>
</section>`,

  video: (b, root) => `
<section class="c-block c-block--wide wrap">
  <h2 class="c-h">${esc(b.title)}</h2>
  <div class="c-videos c-videos--${b.items.length}">${b.items.map((v) => `
    <figure class="c-video${v.h > v.w ? ' c-video--tall' : ''}" data-reveal>
      <div class="shot">${video(v, root)}</div>
      <figcaption class="mono">${esc(v.caption)}</figcaption>
    </figure>`).join('')}
  </div>
</section>`,

  gallery: (b, root) => `
<section class="c-gallery wrap" aria-label="Галерея">${b.items.map((it) =>
    `<figure class="shot${it.h > it.w ? ' shot--tall' : ''}" data-reveal>${img(it, root, '(min-width:1024px) 60vw, 92vw')}</figure>`).join('')}
</section>`,
};

export function renderMain(c, all, root) {
  const next = all.find((x) => x.slug === c.next);
  const links = c.links.map((l) => (l.primary
    ? `<a class="btn btn-accent" data-magnet href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} <span class="arr ne" aria-hidden="true">↗</span></a>`
    : ext(l.href, l.label, 'chip'))).join('\n      ');
  return `<main id="main" class="case-main">
<header class="c-hero wrap">
  <a class="c-back mono" href="${root}#work"><span aria-hidden="true">←</span> Все работы</a>
  <p class="c-kicker mono"><span>${esc(c.index)}</span>${esc(c.kicker)}</p>
  <h1 class="c-title" data-split>${c.titleHtml.replace(/ — /g, '&nbsp;— ')}</h1>
  <div class="c-acts" data-reveal>
      ${links}
  </div>
</header>
<figure class="c-cover wrap"><div class="shot vt-${c.slug}">${img(c.cover, root, '(min-width:1320px) 1224px, 92vw', true)}</div></figure>
<section class="c-intro wrap" aria-label="Коротко о проекте">
  <p class="c-lead" data-reveal>${esc(c.lead)}</p>
  <dl class="c-meta" data-reveal>${c.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
</section>
${c.blocks.map((b) => blocks[b.type](b, root)).join('\n')}
<nav class="c-next" aria-label="Следующий кейс">
  <a class="wrap c-next-in" href="../${next.slug}/">
    <span class="mono">Следующий кейс · ${esc(next.index)}</span>
    <span class="c-next-title">${esc(next.title)}</span>
    <span class="c-next-arr" aria-hidden="true">→</span>
    <span class="shot c-next-shot">${img({ ...next.cover, alt: '' }, root, '(min-width:1320px) 1224px, 92vw')}</span>
  </a>
</nav>
</main>`;
}

export function renderCase(c, all, parts) {
  const root = '../../';
  const url = `${SITE}cases/${c.slug}/`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: c.title, description: c.description, url,
    image: `${SITE}assets/og/${c.slug}.png`, inLanguage: 'ru', dateModified: '2026-10-10',
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

/** Вставляет кусок между <!--#имя--> и <!--/#имя-->. Без маркеров — ошибка, а не тихий пропуск. */
export function inject(html, name, chunk) {
  const re = new RegExp(`(<!--#${name}-->)[\\s\\S]*?(<!--\\/#${name}-->)`);
  if (!re.test(html)) throw new Error(`нет маркеров <!--#${name}--> в index.html`);
  return html.replace(re, `$1\n${chunk.trimEnd()}\n$2`);
}

export function build({ write = true } = {}) {
  const cases = loadCases();
  const parts = { tpl: read('templates/case.html'), nav: read('partials/nav.html'), footer: read('partials/footer.html') };
  const out = {};
  for (const c of cases) out[`cases/${c.slug}/index.html`] = renderCase(c, cases, parts);
  let home = read('index.html');
  home = inject(home, 'nav', fill(parts.nav, { root: './' }));
  home = inject(home, 'footer', fill(parts.footer, { root: './' }));
  out['index.html'] = home;
  out['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>2026-10-10</lastmod></url>
${cases.map((c) => `  <url><loc>${SITE}cases/${c.slug}/</loc><lastmod>2026-10-10</lastmod></url>`).join('\n')}
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
