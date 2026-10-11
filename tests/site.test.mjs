// Сборка, ссылки и честность цифр. Запуск: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  sourced.add(String(cases.length)); // «N сайтов клиентов» = число кейсов с боевыми ссылками
  const stats = out['index.html'].match(/<dl class="hero-stats"[\s\S]*?<\/dl>/)[0];
  for (const [, v] of stats.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)) {
    assert.ok(sourced.has(v.replace(/&nbsp;/g, ' ').trim()), `первый экран: у «${v}» нет источника в content/cases.json`);
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
