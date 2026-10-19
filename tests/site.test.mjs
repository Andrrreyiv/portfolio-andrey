// Сборка, ссылки и честность цифр. Запуск: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { build, loadCases, inject, ROOT } from '../scripts/build.mjs';

const out = build({ write: false });
const pages = Object.entries(out).filter(([p]) => p.endsWith('.html'));

test('сборка: у каждого кейса своя страница, метки шаблона заменены', () => {
  for (const c of loadCases()) assert.ok(out[`cases/${c.slug}/index.html`], `нет страницы ${c.slug}`);
  for (const [p, html] of pages) assert.doesNotMatch(html, /\{\{\w+\}\}/, `незаменённая метка в ${p}`);
});

test('сборка совпадает с закоммиченными файлами (не забыли node scripts/build.mjs)', () => {
  // git на Windows (autocrlf) отдаёт рабочую копию с CRLF — сравниваем без учёта переводов строк
  const lf = (s) => s.replace(/\r\n/g, '\n');
  for (const [p, html] of Object.entries(out)) {
    assert.equal(lf(readFileSync(join(ROOT, p), 'utf8')), lf(html), `${p} устарел — запустите node scripts/build.mjs`);
  }
});

test('inject без маркеров падает, а не пропускает молча', () => {
  assert.throws(() => inject('<body></body>', 'nav', 'x'), /нет маркеров/);
});

test('все локальные ссылки и картинки существуют', () => {
  for (const [p, html] of pages) {
    const dir = join(ROOT, p, '..');
    const refs = [...html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' ')[0]));
    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
      const path = ref.split('#')[0];
      if (!path) continue;
      const file = join(dir, path.endsWith('/') ? path + 'index.html' : path);
      assert.ok(existsSync(file) || existsSync(join(ROOT, file.replace(dir, ''))), `${p}: нет файла для ${ref}`);
    }
  }
});

test('запрещённые ссылки: демо конструкторов на Pages, рабочий стенд Спаркса, демо-папка', () => {
  for (const [p, html] of pages) {
    assert.doesNotMatch(html, /andrrreyiv\.github\.io\/(jetron|tshirt|poster)-constructor/, `${p}: ссылка на Pages-демо конструктора`);
    assert.doesNotMatch(html, /widget\.sparks\.su/, `${p}: рабочий стенд Спаркса`);
    assert.doesNotMatch(html, /sparks-widget-live/, `${p}: ссылка на демо-папку`);
  }
});

test('боевые ссылки jetronsport.ru на месте', () => {
  const home = out['index.html'];
  for (const u of ['https://jetronsport.ru/', 'https://jetronsport.ru/onlajn-konstruktor-formy/',
    'https://jetronsport.ru/onlajn-konstruktor-futbolok/', 'https://jetronsport.ru/onlajn-konstruktor-posterov/', 'https://sparks.su/']) {
    assert.ok(home.includes(`href="${u}"`), `на главной нет ${u}`);
  }
});

test('честность: у каждой цифры реального кейса есть источник', () => {
  for (const c of loadCases()) {
    for (const b of c.blocks.filter((x) => x.type === 'metrics')) {
      for (const m of b.items) assert.ok(m.source && m.source.length > 8, `${c.slug}: у «${m.v}» нет source`);
    }
  }
});

test('честность: цифры первого экрана взяты из кейсов с источником', () => {
  const cases = loadCases();
  const sourced = new Set(cases.flatMap((c) => c.blocks.filter((b) => b.type === 'metrics')
    .flatMap((b) => b.items.filter((m) => m.source).map((m) => m.v))));
  // Число сайтов и кейсов не показываем вовсе (владелец 17.10), поэтому «N = число кейсов» больше не источник.
  const stats = out['index.html'].match(/<dl class="hero-stats"[\s\S]*?<\/dl>/)[0];
  for (const [, v] of stats.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)) {
    assert.ok(sourced.has(v.replace(/&nbsp;/g, ' ').trim()), `первый экран: у «${v}» нет источника в content/cases.json`);
  }
});

test('видео работ: постер, оба формата и вес до 1 МБ', () => {
  const vids = pages.flatMap(([p, html]) => [...html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/g)].map(([tag]) => [p, tag]));
  assert.ok(vids.length >= 5, 'видео пропали со страниц');
  for (const [p, tag] of vids) {
    assert.match(tag, /^<video class="loop" muted loop playsinline preload="none" poster="[^"]+\.webp"/, `${p}: видео без постера или автозагрузка`);
    assert.match(tag, /aria-label="[^"]{12,}"/, `${p}: у видео нет описания`);
    const dir = join(ROOT, p, '..');
    const files = [...tag.matchAll(/(?:poster|src)="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(files.some((f) => f.endsWith('.webm')) && files.some((f) => f.endsWith('.mp4')), `${p}: нужны webm и mp4`);
    for (const f of files) {
      const file = join(dir, f);
      assert.ok(existsSync(file), `${p}: нет файла ${f}`);
      assert.ok(statSync(file).size <= 1024 * 1024, `${p}: ${f} тяжелее 1 МБ`);
    }
  }
});

test('andrianov: только о новом сайте, без закрытых тем клиента', () => {
  // Темы, которые клиент просил не публиковать, открытым текстом не пишем: репозиторий публичный.
  // Список и причины — andrianov-site/CLAUDE.md; здесь только корни слов в base64.
  const banned = ['0YLRjtC80LXQvQ==', '0LDQtNC80LjQvdC40YHRgtGA0LDRhg=='].map((b) => Buffer.from(b, 'base64').toString('utf8'));
  for (const [p, html] of pages) {
    const low = html.toLowerCase();
    for (const w of banned) assert.ok(!low.includes(w), `${p}: закрытая тема клиента`);
  }
  const andr = [out['cases/andrianov/index.html'], out['index.html'].match(/<article class="scene"[^>]*aria-labelledby="s4-h"[\s\S]*?<\/article>/)[0]];
  for (const html of andr) {
    assert.doesNotMatch(html, /стар(ый|ого|ом) сайт|было\s*\/\s*стало|5,5\s*МБ/i, 'andrianov: речь о старом сайте');
    // владелец 18.10: «с использованием макета в Figma», без «макета клиента»
    assert.doesNotMatch(html, /макет[а-яё]*(&nbsp;|\s)+клиента/i, 'andrianov: «макет клиента»');
  }
});

test('главы главной идут вперемежку — чёрная, бежевая, чёрная… — и петроля нет (владелец 18.10)', () => {
  const secs = [...out['index.html'].matchAll(/<section class="([^"]*)" id="([^"]+)"/g)].map(([, cls, id]) => [id, /\btone-paper\b/.test(cls)]);
  assert.ok(secs.length >= 8, 'главы главной не нашлись');
  for (let i = 1; i < secs.length; i++) assert.notEqual(secs[i][1], secs[i - 1][1], `«${secs[i - 1][0]}» и «${secs[i][0]}» одного цвета`);
  for (const [p, html] of pages) assert.doesNotMatch(html, /tone-ink/, `${p}: петроль снят`);
});

test('тире не открывает строку: в видимом тексте перед ним неразрывный пробел (владелец 18.10)', () => {
  for (const [p, html] of pages) {
    const text = html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
    const bad = text.match(/.{0,30} — .{0,20}/);
    assert.equal(bad, null, `${p}: обычный пробел перед тире — «${bad && bad[0].trim()}»`);
  }
});

test('разбиваемые заголовки в одну строку и без двойных пробелов (SplitText с reduceWhiteSpace: false)', () => {
  // reduceWhiteSpace: false держит «задачу&nbsp;—» одним словом, но перенос строки в разметке дал бы слово «\n»
  for (const [p, html] of pages) {
    for (const [, , body] of html.matchAll(/<(h[12])\b[^>]*(?:data-split|hero-title|c-title)[^>]*>([\s\S]*?)<\/\1>/g)) {
      assert.doesNotMatch(body, /\n| {2}/, `${p}: заголовок «${body.slice(0, 40)}» с переносом строки или двойным пробелом`);
    }
  }
});

test('у картинок есть размеры и alt', () => {
  for (const [p, html] of pages) {
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag, /\bwidth="\d+"/, `${p}: ${tag.slice(0, 80)} без width`);
      assert.match(tag, /\bheight="\d+"/, `${p}: ${tag.slice(0, 80)} без height`);
      assert.match(tag, /\balt="/, `${p}: ${tag.slice(0, 80)} без alt`);
    }
  }
});
