/* ══════════════════════════════════════════════════════════════
   Заглушка сервера для демонстрации.
   На боевом сайте виджет обращается к настоящему бэкенду (PHP + база).
   Здесь запросы перехватываются и обрабатываются в браузере, чтобы
   демо работало на статическом хостинге без сервера.
   Сам виджет (widget.js / widget.css) взят из рабочего проекта без изменений.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Сценарий повторяет config/scenario.json рабочего проекта.
  // Это предварительный вариант: финальную схему подбора задаёт Заказчик.
  var SCENARIO = {
    greeting: 'Здравствуйте! Я ассистент ТД «Спаркс». Помогу подобрать оборудование из каталога, подскажу по разделам сайта или соединю с менеджером.',
    start: 'root',
    nodes: {
      root: { type: 'menu', text: 'С чего начнём?', chips: [
        { label: 'Подобрать оборудование', next: 'type' },
        { label: 'Вопрос по сайту', next: 'faq' },
        { label: 'Связаться с менеджером', next: 'handoff' } ] },
      type: { type: 'menu', text: 'Что подбираем?', chips: [
        { label: 'Мотор-редуктор', next: 'power', set: { type: 'motor_gear' } },
        { label: 'Частотный преобразователь', next: 'power', set: { type: 'vfd' } },
        { label: 'Редуктор цилиндрический', next: 'power', set: { type: 'gear' } },
        { label: 'Нестандартная позиция', next: 'manager_only' } ] },
      power: { type: 'menu', text: 'Укажите нужную мощность, кВт:', chips: [
        { label: 'до 1.5 кВт', next: 'mount', set: { power: '0-1.5' } },
        { label: '1.5 – 5.5 кВт', next: 'mount', set: { power: '1.5-5.5' } },
        { label: '5.5 – 15 кВт', next: 'mount', set: { power: '5.5-15' } },
        { label: 'больше 15 кВт', next: 'mount', set: { power: '15+' } } ] },
      mount: { type: 'menu', text: 'Тип монтажа / исполнение:', chips: [
        { label: 'Фланцевый', next: 'result', set: { mount: 'flange' } },
        { label: 'На лапах', next: 'result', set: { mount: 'foot' } },
        { label: 'Комбинированный', next: 'result', set: { mount: 'combo' } },
        { label: 'Не знаю, помогите', next: 'help' } ] },
      result: { type: 'table', text: 'По вашим параметрам подберу позицию из каталога.',
        placeholder_note: 'Позиции ниже настоящие, из вашего каталога. В демонстрации показан фиксированный пример: на сайте список будет пересчитываться под выбранные параметры.',
        chips: [
          { label: 'Оставить заявку', next: 'handoff' },
          { label: 'Уточнить параметры', next: 'power' },
          { label: 'Связаться с менеджером', next: 'handoff' } ] },
      help: { type: 'menu', text: 'Опишите задачу: что нужно вращать, какая мощность и обороты. По этим данным подберём вариант или подключим инженера.', chips: [
        { label: 'Позвать менеджера', next: 'handoff' },
        { label: 'В начало', next: 'root' } ] },
      manager_only: { type: 'menu', text: 'По этой позиции в каталоге пока нет полных характеристик, такой подбор ведёт инженер вручную, чтобы не ошибиться.', chips: [
        { label: 'Передать инженеру', next: 'handoff' },
        { label: 'В начало', next: 'root' } ] },
      faq: { type: 'menu', text: 'Задавайте: отвечу по каталогу, доставке и разделам сайта.',
        placeholder_note: 'Список вопросов и ответов заполняет Заказчик.',
        chips: [
          { label: 'Сроки доставки', next: 'faq_delivery' },
          { label: 'Как устроен каталог', next: 'faq_catalog' },
          { label: 'Назад', next: 'root' } ] },
      faq_delivery: { type: 'answer', text: 'Доставка по России транспортными компаниями, возможен самовывоз со склада. Точные сроки и условия подставим из ваших материалов.', chips: [
        { label: 'Другой вопрос', next: 'faq' },
        { label: 'Подобрать оборудование', next: 'type' } ] },
      faq_catalog: { type: 'answer', text: 'Каталог разбит по типам оборудования и параметрам. Подскажу нужный раздел или подберу позицию по фильтрам.', chips: [
        { label: 'Подобрать оборудование', next: 'type' },
        { label: 'Другой вопрос', next: 'faq' } ] },
      handoff: { type: 'handoff',
        text_work: 'Сейчас рабочее время, менеджер на связи. Как удобнее?',
        text_offhours: 'Сейчас нерабочее время. Оставьте заявку, менеджер свяжется в ближайший рабочий день.',
        chips: [
          { label: 'Оставить заявку', next: 'lead', kind: 'lead' },
          { label: 'Обратный звонок', next: 'lead', kind: 'call' } ] }
    }
  };

  // Реальные позиции из каталога Заказчика: те самые четыре, что дают мощность
  // 1,5 кВт и обороты 140 в согласованной схеме подбора. Нужны, чтобы демонстрация
  // показывала настоящий результат, а не пустую таблицу.
  var DEMO_ITEMS = [
    {
        "id": 7979,
        "sku": "1038101",
        "name": "Мотор-редуктор червячный NMRV-S63-20-140-1,5-M1-AM90-MS-2081-2P sf=1,13",
        "url": "https://sparks.su/product/nmrv-s63-20-140-00-1-5-pam90-2p-sf-1-13/",
        "specs": [
            {
                "label": "Мощность",
                "value": "1.5 кВт"
            },
            {
                "label": "Обороты на выходе",
                "value": "140 об/мин"
            },
            {
                "label": "Передаточное число",
                "value": "20"
            },
            {
                "label": "Крутящий момент",
                "value": "89 Н·м"
            }
        ],
        "disclaimer": "Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер."
    },
    {
        "id": 7978,
        "sku": "1038100",
        "name": "Мотор-редуктор червячный NMRV-S63-10-140-1,5-M1-AM90-MS-2081-4P sf=1,47",
        "url": "https://sparks.su/product/nmrv-s63-10-140-00-1-5-pam90-4p-sf-1-47/",
        "specs": [
            {
                "label": "Мощность",
                "value": "1.5 кВт"
            },
            {
                "label": "Обороты на выходе",
                "value": "140 об/мин"
            },
            {
                "label": "Передаточное число",
                "value": "10"
            },
            {
                "label": "Крутящий момент",
                "value": "89 Н·м"
            }
        ],
        "disclaimer": "Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер."
    },
    {
        "id": 6873,
        "sku": "1038189",
        "name": "Мотор-редуктор червячный NMRV-S75-10-140-1,5-M1-AM90-MS-2081-4P sf=2,11",
        "url": "https://sparks.su/product/nmrv-s75-10-140-00-1-5-pam90-4p-sf-2-11/",
        "specs": [
            {
                "label": "Мощность",
                "value": "1.5 кВт"
            },
            {
                "label": "Обороты на выходе",
                "value": "140 об/мин"
            },
            {
                "label": "Передаточное число",
                "value": "10"
            },
            {
                "label": "Крутящий момент",
                "value": "90 Н·м"
            }
        ],
        "disclaimer": "Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер."
    },
    {
        "id": 7026,
        "sku": "1038345",
        "name": "Мотор-редуктор червячный NMRV-S90-10-140-1,5-M1-AM90-MS-2081-4P sf=3,35",
        "url": "https://sparks.su/product/nmrv-s90-10-140-00-1-5-pam90-4p-sf-3-35/",
        "specs": [
            {
                "label": "Мощность",
                "value": "1.5 кВт"
            },
            {
                "label": "Обороты на выходе",
                "value": "140 об/мин"
            },
            {
                "label": "Передаточное число",
                "value": "10"
            },
            {
                "label": "Крутящий момент",
                "value": "91 Н·м"
            }
        ],
        "disclaimer": "Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер."
    }
]
;

  var DISCLAIMER = 'Подбор носит справочный характер, итоговую конфигурацию подтверждает менеджер.';
  /* Рабочее время считается по Новосибирску, как на боевом сервере,
     а не по часам посетителя. */
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
    return workday && hour >= 9 && hour < 18;
  }

  function render(id) {
    var node = SCENARIO.nodes[id] || SCENARIO.nodes[SCENARIO.start];
    if (node.type === 'handoff') {
      var work = isWorkHours();
      return { id: id, type: 'handoff', text: work ? node.text_work : node.text_offhours,
               is_work_hours: work, chips: node.chips };
    }
    var out = { id: id, type: node.type, text: node.text, chips: node.chips || [] };
    // Таблица подбора: отдаём реальные позиции и подсказки для сужения,
    // как это делает боевой сервер.
    if (node.type === 'table') {
      out.items = DEMO_ITEMS;
      out.total = DEMO_ITEMS.length;
      out.shown = DEMO_ITEMS.length;
      out.disclaimer = DISCLAIMER;
      out.text = 'Подходящих позиций: ' + DEMO_ITEMS.length + '.';
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
      return delay({ session_id: 'demo-' + Date.now(), is_work_hours: isWorkHours(),
                     greeting: SCENARIO.greeting, node: render(SCENARIO.start) });
    }
    if (path.indexOf('/api/chat') !== -1) {
      if (body.message) {
        return delay({ type: 'degraded', mode: 'buttons',
                       text: 'Помогу подобрать по шагам, так точнее. Что подбираем?',
                       chips: SCENARIO.nodes.type.chips });
      }
      return delay(render(body.next));
    }
    if (path.indexOf('/api/lead') !== -1) {
      // В демонстрации заявка никуда не отправляется.
      return delay({ status: 'accepted', lead_ref: 0, demo: true });
    }
    return realFetch.apply(window, arguments);
  };
})();
