/* ══════════════════════════════════════════════════════════════
   Заглушка сервера для демонстрации.
   На боевом сайте виджет обращается к настоящему бэкенду (PHP + база),
   здесь запросы перехватываются в браузере, чтобы демо работало
   на статическом хостинге. Сам виджет (widget.js / widget.css)
   взят из рабочего проекта без изменений.

   Сценарий и значения ниже сняты с РАБОЧЕГО сервера на тестовом стенде
   Заказчика: шаги подбора те же, что согласованы в схеме от 31.07,
   мощности и обороты — настоящие, с реальным числом позиций за каждым.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DISCLAIMER = 'Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер.';

  // Мощности мотор-редукторов и число позиций за каждой (из каталога).
  var POWER = [
    ['0.06', 1], ['0.09', 36], ['0.12', 41], ['0.18', 55], ['0.25', 90],
    ['0.37', 74], ['0.55', 121], ['0.75', 109], ['1.1', 127], ['1.5', 86],
    ['2.2', 146], ['3', 88], ['4', 68], ['5.5', 103], ['7.5', 61],
    ['11', 40], ['15', 8]
  ];

  // Обороты на выходе для 1,5 кВт (демонстрационная ветка примера из схемы).
  var RPM_1_5 = [
    ['9', 2], ['11', 4], ['14', 3], ['15', 2], ['18', 6], ['23', 5], ['28', 5],
    ['30', 2], ['35', 5], ['36', 4], ['45', 3], ['47', 8], ['56', 5], ['60', 2],
    ['70', 6], ['90', 2], ['93', 3], ['112', 2], ['120', 2], ['140', 4],
    ['187', 7], ['280', 3], ['373', 1]
  ];

  function chipsFrom(pairs, unit, nextId, field) {
    return pairs.map(function (p) {
      var c = { label: p[0] + ' ' + unit, next: nextId, count: p[1], set: {} };
      c.set[field] = p[0];
      return c;
    });
  }

  // Сценарий повторяет config/scenario.json рабочего проекта.
  var SCENARIO = {
    greeting: 'Здравствуйте! Я ассистент ТД «Спаркс». Помогу подобрать оборудование из каталога, отвечу на вопросы или соединю с менеджером.',
    start: 'root',
    nodes: {
      root: { type: 'menu', text: 'С чего начнём?', chips: [
        { label: 'Подобрать оборудование', next: 'equipment' },
        { label: 'Вопрос по сайту', next: 'faq' },
        { label: 'Связаться с менеджером', next: 'handoff' } ] },

      equipment: { type: 'menu', text: 'Что подбираем?', chips: [
        { label: 'Мотор-редуктор', next: 'mr_entry', set: { type: 'мотор-редуктор' } },
        { label: 'Редуктор', next: 'demo_other', set: { type: 'редуктор' } },
        { label: 'Электродвигатель', next: 'demo_other', set: { type: 'электродвигатель' } },
        { label: 'Преобразователь частоты', next: 'demo_other', set: { type: 'преобразователь частоты' } },
        { label: 'Устройство плавного пуска', next: 'demo_other', set: { type: 'устройство плавного пуска' } } ] },

      mr_entry: { type: 'menu', text: 'Знаете нужную мощность или будем считать от крутящего момента?', chips: [
        { label: 'Знаю мощность', next: 'mr_power' },
        { label: 'Знаю крутящий момент', next: 'mr_torque' },
        { label: 'Не знаю ни того, ни другого', next: 'handoff' } ] },

      mr_power: { type: 'options', field: 'power_kw', text: 'Выберите мощность:',
        chips: chipsFrom(POWER, 'кВт', 'mr_rpm', 'power_kw') },

      mr_torque: { type: 'menu', text: 'В демонстрации ветка по крутящему моменту показана коротко: на сервере она устроена так же, как по мощности, и ведёт к той же таблице.', chips: [
        { label: 'Перейти к выбору мощности', next: 'mr_power' },
        { label: 'Связаться с менеджером', next: 'handoff' } ] },

      mr_rpm: { type: 'options', field: 'n2_rpm', text: 'Какие обороты на выходе нужны? Подберу с допуском, точное совпадение не обязательно.',
        chips: chipsFrom(RPM_1_5, 'об/мин', 'mr_sf', 'n2_rpm') },

      mr_sf: { type: 'menu', text: 'Уточним запас надёжности? От него зависит, какой габарит подойдёт.', chips: [
        { label: 'Рассчитать за меня', next: 'sf_load' },
        { label: 'Показать всё, что подходит', next: 'mr_table' } ] },

      sf_load: { type: 'menu', text: 'Что за оборудование будет работать от привода?', chips: [
        { label: 'Насос, конвейер, вентилятор', next: 'sf_starts', set: { sf_load: 'smooth' } },
        { label: 'Смеситель, подъёмник', next: 'sf_starts', set: { sf_load: 'moderate' } },
        { label: 'Пресс, компрессор, станок', next: 'sf_starts', set: { sf_load: 'heavy' } } ] },

      sf_starts: { type: 'menu', text: 'Сколько запусков и остановок в час?', chips: [
        { label: 'менее 10', next: 'sf_hours', set: { sf_starts: 'lt10' } },
        { label: 'от 10 до 50', next: 'sf_hours', set: { sf_starts: '10_50' } },
        { label: 'от 80 до 100', next: 'sf_hours', set: { sf_starts: '80_100' } },
        { label: 'от 100 до 200', next: 'sf_hours', set: { sf_starts: '100_200' } } ] },

      sf_hours: { type: 'menu', text: 'Сколько часов в сутки работает?', chips: [
        { label: 'менее 2', next: 'mr_table', set: { sf_hours: 'lt2' } },
        { label: 'от 2 до 8', next: 'mr_table', set: { sf_hours: '2_8' } },
        { label: 'от 9 до 16', next: 'mr_table', set: { sf_hours: '9_16' } },
        { label: 'круглосуточно', next: 'mr_table', set: { sf_hours: '17_24' } } ] },

      mr_table: { type: 'table', chips: [
        { label: 'Оставить заявку', next: 'handoff' },
        { label: 'Начать подбор заново', next: 'equipment' } ] },

      demo_other: { type: 'menu', text: 'В демонстрации подробно показана ветка мотор-редукторов. Остальные типы на сервере уже работают так же: свои шаги подбора и своя таблица результатов.', chips: [
        { label: 'Показать мотор-редукторы', next: 'mr_entry' },
        { label: 'Связаться с менеджером', next: 'handoff' } ] },

      faq: { type: 'menu', text: 'Задавайте: отвечу по каталогу, доставке и разделам сайта.',
        placeholder_note: 'Список вопросов и ответов заполняет Заказчик.',
        chips: [
          { label: 'Сроки доставки', next: 'faq_delivery' },
          { label: 'Как устроен каталог', next: 'faq_catalog' },
          { label: 'Назад', next: 'root' } ] },

      faq_delivery: { type: 'answer', text: 'Доставка по России транспортными компаниями, возможен самовывоз со склада. Точные сроки и условия подставим из ваших материалов.', chips: [
        { label: 'Другой вопрос', next: 'faq' },
        { label: 'Подобрать оборудование', next: 'equipment' } ] },

      faq_catalog: { type: 'answer', text: 'Каталог разбит по типам оборудования и параметрам. Подскажу нужный раздел или подберу позицию по фильтрам.', chips: [
        { label: 'Подобрать оборудование', next: 'equipment' },
        { label: 'Другой вопрос', next: 'faq' } ] },

      handoff: { type: 'handoff',
        text_work: 'Соединю с менеджером. Оставьте контакты, специалист свяжется в ближайшее время.',
        text_offhours: 'Сейчас нерабочее время. Оставьте заявку — менеджер свяжется в ближайший рабочий день.',
        chips: [] }
    }
  };

  // Реальные позиции каталога под пример из схемы: 1,5 кВт и 140 об/мин.
  var DEMO_ITEMS = [
    { sku: '1038186', sf: 1.13, size: 63, pol: '2P',
      name: 'Мотор-редуктор червячный NMRV-S63-20-140-1,5-M1-AM90-MS-2081-2P sf=1,13',
      url: 'https://sparks.su/product/nmrv-s63-20-140-00-1-5-pam90-2p-sf-1-13/',
      specs: [ { label: 'Мощность', value: '1.5 кВт' }, { label: 'Обороты на выходе', value: '140 об/мин' },
               { label: 'Передаточное число', value: '20' }, { label: 'Сервис-фактор', value: '1,13' },
               { label: 'Габарит', value: '63' } ] },
    { sku: '1038187', sf: 1.47, size: 63, pol: '4P',
      name: 'Мотор-редуктор червячный NMRV-S63-10-140-1,5-M1-AM90-MS-2081-4P sf=1,47',
      url: 'https://sparks.su/product/nmrv-s63-10-140-00-1-5-pam90-4p-sf-1-47/',
      specs: [ { label: 'Мощность', value: '1.5 кВт' }, { label: 'Обороты на выходе', value: '140 об/мин' },
               { label: 'Передаточное число', value: '10' }, { label: 'Сервис-фактор', value: '1,47' },
               { label: 'Габарит', value: '63' } ] },
    { sku: '1038189', sf: 2.11, size: 75, pol: '4P',
      name: 'Мотор-редуктор червячный NMRV-S75-10-140-1,5-M1-AM90-MS-2081-4P sf=2,11',
      url: 'https://sparks.su/product/nmrv-s75-10-140-00-1-5-pam90-4p-sf-2-11/',
      specs: [ { label: 'Мощность', value: '1.5 кВт' }, { label: 'Обороты на выходе', value: '140 об/мин' },
               { label: 'Передаточное число', value: '10' }, { label: 'Сервис-фактор', value: '2,11' },
               { label: 'Габарит', value: '75' } ] },
    { sku: '1038345', sf: 3.35, size: 90, pol: '4P',
      name: 'Мотор-редуктор червячный NMRV-S90-10-140-1,5-M1-AM90-MS-2081-4P sf=3,35',
      url: 'https://sparks.su/product/nmrv-s90-10-140-00-1-5-pam90-4p-sf-3-35/',
      specs: [ { label: 'Мощность', value: '1.5 кВт' }, { label: 'Обороты на выходе', value: '140 об/мин' },
               { label: 'Передаточное число', value: '10' }, { label: 'Сервис-фактор', value: '3,35' },
               { label: 'Габарит', value: '90' } ] }
  ];

  // Таблица сервис-фактора Заказчика: нагрузка → запусков в час → часов в сутки.
  var SF_TABLE = {
    smooth:   { lt10: [0.75, 1, 1.25, 1.5], '10_50': [1, 1.25, 1.5, 1.75], '80_100': [1.25, 1.5, 1.75, 2], '100_200': [1.5, 1.75, 2, 2.2] },
    moderate: { lt10: [1, 1.25, 1.5, 1.75], '10_50': [1.25, 1.5, 1.75, 2], '80_100': [1.5, 1.75, 2, 2.2], '100_200': [1.75, 2, 2.2, 2.5] },
    heavy:    { lt10: [1.25, 1.5, 1.75, 2], '10_50': [1.5, 1.75, 2, 2.2], '80_100': [1.75, 2, 2.2, 2.5], '100_200': [2, 2.2, 2.5, 3] }
  };
  var HOURS_IDX = { lt2: 0, '2_8': 1, '9_16': 2, '17_24': 3 };

  // Состояние диалога: накапливаем выбор, как это делает сервер в сессии.
  var state = {};

  function requiredSf() {
    var row = SF_TABLE[state.sf_load];
    if (!row) { return null; }
    var cells = row[state.sf_starts];
    if (!cells) { return null; }
    var idx = HOURS_IDX[state.sf_hours];
    return (idx === undefined) ? null : cells[idx];
  }

  /* Рабочее время считается по Новосибирску, как на боевом сервере.
     Часы 9–20 подтверждены Заказчиком 29.07 (раньше в демо стояло 9–18). */
  function isWorkHours() {
    var parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Novosibirsk', weekday: 'short', hour: '2-digit', hour12: false
    }).formatToParts(new Date());
    var hour = 0, weekday = '';
    parts.forEach(function (p) {
      if (p.type === 'hour') { hour = parseInt(p.value, 10); }
      if (p.type === 'weekday') { weekday = p.value.toLowerCase(); }
    });
    var workday = ['пн', 'вт', 'ср', 'чт', 'пт'].indexOf(weekday.slice(0, 2)) !== -1;
    return workday && hour >= 9 && hour < 20;
  }

  function render(id) {
    var node = SCENARIO.nodes[id] || SCENARIO.nodes[SCENARIO.start];

    if (node.type === 'handoff') {
      var work = isWorkHours();
      return { id: id, type: 'handoff', text: work ? node.text_work : node.text_offhours,
               is_work_hours: work, chips: node.chips };
    }

    var out = { id: id, type: node.type, text: node.text, chips: node.chips || [] };
    if (node.field) { out.field = node.field; }

    // Таблица подбора: отдаём позиции, отфильтрованные по рассчитанному запасу надёжности,
    // как это делает боевой сервер.
    if (node.type === 'table') {
      var need = requiredSf();
      var items = (need === null) ? DEMO_ITEMS : DEMO_ITEMS.filter(function (i) { return i.sf >= need; });
      out.items = items;
      out.total = items.length;
      out.shown = items.length;
      out.disclaimer = DISCLAIMER;
      out.text = need === null
        ? 'Подходящих позиций: ' + items.length + '.'
        : 'Нужен сервис-фактор не ниже ' + String(need).replace('.', ',') + '. Подходящих позиций: ' + items.length + '.';
      if (items.length === 0) {
        out.text = 'Под такие условия в демонстрационной выборке позиций нет. На сервере в этом случае бот предлагает расширить допуск или передаёт менеджеру.';
      }
    }

    if (node.placeholder_note) { out.placeholder_note = node.placeholder_note; }
    return out;
  }

  function reply(data) {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(data); } });
  }

  var realFetch = window.fetch;
  window.fetch = function (url, options) {
    var path = String(url);
    var body = {};
    try { body = JSON.parse((options && options.body) || '{}'); } catch (e) { body = {}; }

    // Небольшая задержка, чтобы поведение совпадало с реальным сервером
    var delay = function (data) {
      return new Promise(function (res) { setTimeout(function () { res(); }, 260); })
        .then(function () { return reply(data); });
    };

    if (path.indexOf('/api/session') !== -1) {
      state = {};
      return delay({ session_id: 'demo-' + Date.now(), is_work_hours: isWorkHours(),
                     greeting: SCENARIO.greeting, node: render(SCENARIO.start) });
    }
    if (path.indexOf('/api/chat') !== -1) {
      if (body.message) {
        return delay({ type: 'degraded', mode: 'buttons',
                       text: 'Помогу подобрать по шагам, так точнее. Что подбираем?',
                       chips: SCENARIO.nodes.equipment.chips });
      }
      if (body.set) { Object.keys(body.set).forEach(function (k) { state[k] = body.set[k]; }); }
      if (body.next === 'equipment' || body.next === 'root') { state = {}; }
      return delay(render(body.next));
    }
    if (path.indexOf('/api/lead') !== -1) {
      // В демонстрации заявка никуда не отправляется.
      return delay({ status: 'accepted', lead_ref: 0, demo: true });
    }
    return realFetch.apply(window, arguments);
  };
})();
