// Пятый круг (24.10): кейсы v2, «Индекс работ», NDA и обезличенные кейсы в ПУБЛИЧНОМ репозитории.
// Запуск: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { build, loadCases, validate, ROOT } from '../scripts/build.mjs';

const out = build({ write: false });
const pages = Object.entries(out).filter(([p]) => p.endsWith('.html'));
const cases = loadCases();
const clone = () => JSON.parse(JSON.stringify(cases));

test('кольцо «следующий кейс» обходит все кейсы ровно по разу', () => {
  const seen = [];
  for (let c = cases[0]; !seen.includes(c.slug); c = cases.find((x) => x.slug === c.next)) seen.push(c.slug);
  assert.equal(seen.length, cases.length);
  const broken = clone();
  broken[1].next = broken[0].slug;   // короткое кольцо: часть кейсов выпадает
  assert.throws(() => validate(broken), /кольцо/);
});

test('validate ловит неизвестный блок, две бежевые полосы подряд и цифры у NDA', () => {
  const a = clone(); a[0].blocks.push({ type: 'carousel' });
  assert.throws(() => validate(a), /неизвестный блок/);
  const b = clone(); const i = b[0].blocks.findIndex((x) => x.type === 'metrics');
  b[0].blocks.splice(i, 0, { type: 'steps', band: true, title: 'x', items: [] });
  assert.throws(() => validate(b), /две бежевые полосы/);
  const c = clone(); const nda = c.find((x) => x.nda);
  nda.blocks.push({ type: 'metrics', title: 'Цифры', items: [{ v: '0,93', k: 'x', source: 'xxxxxxxxx' }] });
  assert.throws(() => validate(c), /NDA/);
  const d = clone(); d.find((x) => x.nda).lead += ' Ошибка 12 %.';
  assert.throws(() => validate(d), /цифра в NDA/);
});

test('NDA-кейс: ни metrics, ни цифр в тексте, заказчик не назван', () => {
  const nda = cases.filter((c) => c.nda);
  assert.ok(nda.length >= 1, 'NDA-кейс пропал');
  for (const c of nda) {
    assert.ok(!c.blocks.some((b) => b.type === 'metrics'));
    assert.match(c.description + c.lead + c.task, /нефтян/, 'формулировка заказчика — «крупная нефтяная компания»');
  }
});

test('«Индекс работ»: каждый кейс и внешние работы, без вложенных глав и нумерации', () => {
  const home = out['index.html'];
  const more = home.match(/<section class="more tone-paper" id="more"[\s\S]*?<\/section>/)[0];
  for (const c of cases) assert.ok(more.includes(`href="cases/${c.slug}/"`), `в индексе нет кейса ${c.slug}`);
  for (const ext of JSON.parse(readFileSync(join(ROOT, 'content/index.json'), 'utf8')).items) assert.ok(more.includes(ext.t), `в индексе нет «${ext.t}»`);
  assert.doesNotMatch(more.slice(10), /<section|class="scene/, 'внутри #more не должно быть глав');
  assert.doesNotMatch(more, /ix-n|>\s*0\d\s*</, 'строки индекса не нумеруем (число работ не показываем)');
  for (const [p, html] of pages.filter(([x]) => x.startsWith('cases/'))) {
    assert.match(html, /class="c-back mono" href="\.\.\/\.\.\/#more"/, `${p}: «Все работы» ведёт не в индекс`);
  }
});

test('схемы: встроенный SVG без внешних шрифтов, с role и подписью, id на странице уникальны', () => {
  let n = 0;
  for (const [p, html] of pages) {
    for (const [svg] of html.matchAll(/<svg\b[^>]*class="[^"]*"?[^>]*>[\s\S]*?<\/svg>/g)) {
      assert.doesNotMatch(svg, /fonts\.googleapis|@import|<\?xml/, `${p}: внешний шрифт или пролог в SVG`);
    }
    for (const [tag] of html.matchAll(/<div class="dg dg--(?:wide|tall)"><svg\b[^>]*>/g)) {
      n++;
      assert.match(tag, /role="img"/, `${p}: у схемы нет role="img"`);
      assert.match(tag, /aria-label="[^"]{30,}"/, `${p}: у схемы нет описания`);
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dup, [], `${p}: повтор id ${dup.join(', ')}`);
  }
  assert.ok(n >= 6, 'схемы пропали со страниц');
});

test('бот: переписка подписана как реконструкция на открытой партии, без фото учеников', () => {
  const html = out['cases/neurochessai/index.html'];
  assert.match(html, /Реконструкция интерфейса на партии из открытого доступа/);
  assert.doesNotMatch(html, /foto\/|vidframes\/|\.jpe?g"/, 'в кейсе бота не должно быть снимков бланков');
});

test('публичный репозиторий: закрытые имена не встречаются ни в файлах, ни в их именах', () => {
  // корни в base64, чтобы сам тест их не публиковал: название и домен магазина, заказчик ML,
  // люди и проект заказчицы бота, номер договора ML
  const roots = ['Zm9yaGlt', '0L7QvNC40LrQvtC9', 'b21pY29u', '0LfQvtGA0LjQvQ==', '0LLQtdGA0L7QvdC40Lo=', '0LrQstC10YLQug==',
    'a3ZldGth', '0LTQtdC70L7QstGL0LUg0L/QvtC00LDRgNC60Lg=', 'MDgvMjYtMDY=']
    .map((b) => Buffer.from(b, 'base64').toString('utf8'));
  const files = execSync('git ls-files && git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const f of files) {
    const low = f.toLowerCase();
    for (const r of roots) assert.ok(!low.includes(r), `имя файла с закрытым словом: ${f}`);
    if (!/\.(html|md|json|mjs|js|css|py|svg|txt|xml)$/.test(f)) continue;
    const text = readFileSync(join(ROOT, f), 'utf8').toLowerCase();
    for (const r of roots) assert.ok(!text.includes(r), `${f}: закрытое слово (корень ${roots.indexOf(r) + 1})`);
  }
  for (const [p, html] of Object.entries(out)) {
    const low = html.toLowerCase();
    for (const r of roots) assert.ok(!low.includes(r), `${p}: закрытое слово`);
  }
});

test('кейсы не пишут, что результата ещё нет (владелец 24.10)', () => {
  for (const [p, html] of pages) {
    assert.doesNotMatch(html, /результат[а-я]* (ещё |пока )?нет|пилот не начат|замер «?после»?|ещё не запущ/i, `${p}: «результата нет»`);
  }
});

test('сборка выдерживает худший контент: длинный заголовок, одна цифра, без ссылок', () => {
  const w = clone();
  w[0].title = w[0].titleHtml = 'Очень длинный заголовок кейса, который не помещается ни в одну, ни в две, ни в три строки на телефоне';
  w[0].links = [];
  w[0].blocks = w[0].blocks.filter((b) => b.type !== 'video').map((b) => (b.type === 'metrics' ? { ...b, items: b.items.slice(0, 1) } : b));
  delete w[0].hero;
  const res = build({ write: false, cases: w });
  assert.match(res[`cases/${w[0].slug}/index.html`], /Обсудить похожую задачу/);
});
