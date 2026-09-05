/* Проверка заглушки публичного демо `sparks-widget-live/demo-mock.js`.
 *
 * Зачем: демо открыто наружу и его смотрит Заказчик, а заглушка отставала
 * от продукта — показывала отменённые им же формулировки и не отдавала полей,
 * без которых виджет рисует карточку без согласованных кнопок. Глазами это
 * не ловится: расхождение видно только рядом с config/*.json рабочего проекта.
 *
 * Запуск: node --test tests/*.test.mjs
 * (просто `node --test tests/` на Node 22.22 падает с MODULE_NOT_FOUND — каталог
 *  без package.json он пытается разрешить как модуль, а не обойти как папку.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'sparks-widget-live', 'demo-mock.js');

/* Заглушка перехватывает window.fetch, поэтому поднимаем минимальный контекст
   с окном и отдаём готовую функцию запроса. Настоящий fetch не нужен: все пути
   перехватываются до него. */
function boot() {
  const win = {
    fetch: () => { throw new Error('запрос ушёл мимо заглушки'); },
    location: { href: 'https://example.test/' }
  };
  const ctx = vm.createContext({ window: win, setTimeout, Promise, Intl, Date, console, JSON });
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx, { filename: 'demo-mock.js' });
  return (url, body) => win.fetch(url, { body: JSON.stringify(body || {}) }).then((r) => r.json());
}

test('шапку задаёт сценарий, а не запасной список виджета', async () => {
  const api = boot();
  const res = await api('/api/session', {});
  assert.ok(Array.isArray(res.header), 'сессия обязана отдать header');
  /* Сравниваем строкой: объекты приходят из другого контекста vm, и strict-сравнение
     валится на несовпадении прототипов, а не на содержимом. */
  assert.equal(res.header.map((t) => t.label).join(' · '), 'Подобрать · Контакты');
});

test('карточка несёт кнопки, согласованные Заказчиком, а не одну ссылку', async () => {
  const api = boot();
  await api('/api/session', {});
  const res = await api('/api/chat', { next: 'mr_table' });
  const act = (res.items && res.items[0] && res.items[0].actions) || {};
  /* Значения дословно из боевого config/presentation.json → card_actions.
     Счётчики выключены: показывать «0 в сравнении» на витрине Заказчик отменил. */
  assert.equal(act.lead_enabled, true, 'кнопка заявки обязана быть включена');
  assert.equal(act.lead_label, 'Оставить заявку');
  assert.equal(act.open_label, 'Открыть');
  assert.equal(act.show_counters, false, 'счётчики Заказчик отменил');
  assert.equal((act.items || []).map((i) => i.key).join(','), 'compare,favorite,cart');
});

test('«Новый подбор» появляется только на таблице после уточнения', async () => {
  const api = boot();
  await api('/api/session', {});
  /* Комм. 3 от 21.08 убрал «Начать подбор заново» из первой таблицы,
     комм. 6 вернул кнопку под именем «Новый подбор», но ТОЛЬКО после уточнения. */
  const first = await api('/api/chat', { next: 'mr_table' });
  assert.equal(first.chips.map((c) => c.label).join(' · '),
    'Уточнить · Написать менеджеру · Обратный звонок');
  const after = await api('/api/chat', { next: 'mr_table', set: { refined: true } });
  assert.equal(after.chips.map((c) => c.label).join(' · '),
    'Уточнить · Написать менеджеру · Обратный звонок · Новый подбор');
});

test('уточнение показывает только те поля, где в выборке есть из чего выбирать', async () => {
  const api = boot();
  await api('/api/session', {});
  const res = await api('/api/chat', { next: 'mr_refine' });
  assert.equal(res.type, 'multiselect');
  /* Правило Заказчика (комм. 6): поле, у которого в текущей выборке остался один
     вариант, не показывается вовсе. Все четыре позиции демо — NMRV, поэтому «Вид»
     скрыт; габариты 63/75/90 и полюса 2P/4P выбор дают. */
  assert.equal((res.fields || []).map((f) => f.title).join(' · '), 'Габарит · Число полюсов');
  const frame = res.fields.find((f) => f.field === 'frame_size');
  /* Виджет читает options[j].value и .label (widget.js:303-306), голую строку
     он нарисовал бы как undefined — поэтому форма варианта важнее содержимого. */
  assert.equal(frame.options.map((o) => o.value).join(','), '63,75,90');
  assert.equal(res.submit.label, 'показать');
});

test('отмеченные значения сужают таблицу, а не украшают экран', async () => {
  const api = boot();
  await api('/api/session', {});
  /* Виджет складывает отмеченное в submit.set: {refined:true, frame_size:['63'], …}
     (widget.js:326-332). Из четырёх позиций демо габарит 63 у двух. */
  const res = await api('/api/chat',
    { next: 'mr_table', set: { refined: true, frame_size: ['63'] } });
  assert.equal(res.items.length, 2, 'после уточнения по габариту 63 остаются две позиции');
  assert.equal(res.items.map((i) => i.sku).join(','), '1038186,1038187');
});

test('после уточнения фраза про запас надёжности снимается', async () => {
  const api = boot();
  await api('/api/session', {});
  await api('/api/chat', { next: 'sf_starts', set: { sf_load: 'smooth' } });
  await api('/api/chat', { next: 'sf_hours', set: { sf_starts: 'lt10' } });
  const before = await api('/api/chat', { next: 'mr_table', set: { sf_hours: 'lt2' } });
  assert.match(before.text, /не ниже/, 'до уточнения расчёт запаса покупателю показываем');
  /* Комментарий Заказчика 5 от 21.08: «после уточнения фраза про запас
     надёжности больше не нужна» (DialogService.php:668-677). */
  const after = await api('/api/chat', { next: 'mr_table', set: { refined: true } });
  assert.doesNotMatch(after.text, /не ниже/);
});

test('слова в строке расчёта те же, что на боевом', async () => {
  const api = boot();
  await api('/api/session', {});
  await api('/api/chat', { next: 'sf_starts', set: { sf_load: 'smooth' } });
  await api('/api/chat', { next: 'sf_hours', set: { sf_starts: 'lt10' } });
  const res = await api('/api/chat', { next: 'mr_table', set: { sf_hours: 'lt2' } });
  /* DialogService.php:675 печатает «Нужен запас надёжности не ниже 0,75.»
     Заглушка звала это «сервис-фактором» — термин из внутренней переписки,
     а покупателю на боевом показывают другое слово. */
  assert.equal(res.text, 'Нужен запас надёжности не ниже 0,75. Подходящих позиций: 4.');
});

test('габарита в карточке нет — Заказчик убрал его 06.08', async () => {
  const api = boot();
  await api('/api/session', {});
  const res = await api('/api/chat', { next: 'mr_table' });
  /* presentation.json → card_fields_hidden: series, frame_size, poles, mount_im,
     shaft_d. Выбирая вариант Б 06.08, Заказчик сказал дословно «то же плюс
     сервис-фактор НО БЕЗ габарита». Демо показывало ему же то, что он вычеркнул. */
  const labels = res.items.map((i) => i.specs.map((s) => s.label).join(',')).join(';');
  assert.doesNotMatch(labels, /Габарит/);
});
