/* ══════════════════════════════════════════════════════════════
   AI-ассистент ТД «Спаркс» — виджет (продакшн).
   Весь UI живёт в Shadow DOM: стили сайта не протекают внутрь, наши — наружу.
   Диалог ведёт сервер: клиент отправляет шаг, получает следующий узел.
   Без внешних библиотек, анимации на CSS. Грузится лениво по клику (loader.js).
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.SparksWidget && window.SparksWidget.__ready) { return; }

  var CFG = { apiBase: '', version: '', policyUrl: '#' };
  var root = null;
  var els = {};
  var state = { session: null, started: false, open: false, busy: false, mounted: false, selection: [], lastRequest: null, header: null };

  /* Значки действий карточки. Ключи совпадают с config/presentation.json, card_actions.
     Свои контуры, а не шрифт значков: сторонний файл замедлил бы загрузку страницы
     Заказчика ради трёх картинок. */
  var ICONS = {
    compare:  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 15V8M10 15V4M16 15v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    favorite: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5 4.2 11a3.4 3.4 0 0 1 4.8-4.8l1 1 1-1A3.4 3.4 0 0 1 15.8 11z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg>',
    cart:     '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h2l2 8h8l2-6H6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="16" r="1.3" fill="currentColor"/><circle cx="14.5" cy="16" r="1.3" fill="currentColor"/></svg>'
  };

  /* ── утилиты ── */
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (txt != null) { e.textContent = txt; }
    return e;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function api(path, body) {
    return fetch(CFG.apiBase + '/api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function scrollDown() { if (els.body) { els.body.scrollTop = els.body.scrollHeight; } }

  /* Прокрутка к сообщению, а не в конец ленты. Нужна там, где после текста идёт
     блок карточек: иначе текст уезжает за верхний край и остаётся непрочитанным. */
  function scrollToMessage(el) {
    if (!els.body || !el) { scrollDown(); return; }
    /* Считаем смещение относительно самой ленты, а не через offsetTop:
       offsetTop меряется от ближайшего позиционированного предка, и если это
       не лента, сообщение уезжает выше края (проверено, промах был 111 пикселей). */
    var delta = el.getBoundingClientRect().top - els.body.getBoundingClientRect().top;
    var top = els.body.scrollTop + delta - 8;
    els.body.scrollTop = top > 0 ? top : 0;
  }

  /* ── примитивы ленты ── */
  function botMsg(html) {
    var d = h('div', 'msg bot');
    d.innerHTML = html;
    els.body.appendChild(d); scrollDown();
    return d;
  }
  function userMsg(text) {
    els.body.appendChild(h('div', 'msg user', text));   // только textContent: защита от XSS
    scrollDown();
  }
  function typing() {
    var t = h('div', 'typing-row');
    t.innerHTML = '<span></span><span></span><span></span>';
    els.body.appendChild(t); scrollDown();
    return t;
  }
  /* «печатает…» держится минимум 480 мс, иначе ответ мигает и диалог кажется механическим */
  function withTyping(promise, render) {
    var t = typing();
    var minDelay = new Promise(function (res) { setTimeout(res, 480); });
    Promise.all([promise, minDelay]).then(function (arr) {
      t.remove(); render(arr[0]);
    }).catch(function () {
      t.remove();
      // Сбрасываем busy и здесь, иначе после единственной сетевой ошибки виджет
      // остаётся заблокированным навсегда и помогает только перезагрузка страницы.
      state.busy = false;
      botMsg('Не удалось связаться с сервером. Попробуйте ещё раз или свяжитесь с менеджером.');
      retryChip();
    });
  }
  /* Кнопка повтора: без неё после сбоя сети диалог оказывается в тупике. */
  function retryChip() {
    if (!state.lastRequest) { return; }
    chips([{ label: 'Повторить', __retry: true }]);
  }
  /* Группа кнопок удаляется сразу после выбора: иначе кнопки прошлых шагов
     остаются кликабельными и пользователь может сломать логику подбора. */
  function chips(list) {
    if (!list || !list.length) { return; }
    var w = h('div', 'chips');
    list.forEach(function (c, i) {
      var b = h('button', 'chip', c.label);
      b.style.animationDelay = (i * 0.06) + 's';
      b.onclick = function () {
        if (state.busy) { return; }
        w.remove();
        onChip(c);
      };
      w.appendChild(b);
    });
    els.body.appendChild(w); scrollDown();
  }

  /* Карточка найденной позиции. Состав характеристик задаёт сервер (config/presentation.json),
     клиент только рисует: правки состава не должны требовать выката виджета. */
  function positionCard(item) {
    var c = h('div', 'pos-card');
    var specs = '';
    for (var i = 0; i < (item.specs || []).length; i++) {
      specs += '<div class="pos-spec"><span>' + esc(item.specs[i].label) + '</span>' +
               '<b>' + esc(item.specs[i].value) + '</b></div>';
    }
    // Ссылка есть не у всех позиций: у редукторов её нельзя собрать из выгрузки.
    // Показываем кнопку только когда ссылка реально пришла, а не ведём в никуда.
    var acts = item.actions || {};
    var link = item.url
      ? '<a class="pos-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">' +
        esc(acts.open_label || 'Открыть') + '</a>'
      : '<span class="pos-nolink">Карточка на сайте: уточните у менеджера</span>';

    c.innerHTML =
      '<div class="pos-name">' + esc(item.name) + '</div>' +
      (specs ? '<div class="pos-specs">' + specs + '</div>' : '') +
      '<div class="pos-actions">' + link + '<div class="pos-icons"></div></div>';

    if (acts.enabled && (acts.items || []).length) {
      c.querySelector('.pos-icons').appendChild(cardIcons(item, acts));
    }
    return c;
  }

  /* Иконки сравнения, избранного и корзины. Виджет живёт в Shadow DOM на странице
     Заказчика, а не в iframe, поэтому своих корзины и избранного у него нет и быть
     не может: он лишь сообщает сайту о нажатии событием на window. Сайт ловит его
     своим скриптом и вызывает уже собственные механизмы.
     Признак «сайт обработал» — preventDefault(). Если обработчика нет, молча
     ничего не делать хуже всего: открываем карточку, там всё это есть на сайте. */
  function cardIcons(item, acts) {
    var frag = document.createDocumentFragment();
    (acts.items || []).forEach(function (a) {
      var b = h('button', 'pos-act');
      b.type = 'button';
      b.title = a.title || '';
      b.setAttribute('aria-label', a.title || a.key);
      b.innerHTML = ICONS[a.key] || '';
      b.onclick = function () {
        var ev = new CustomEvent(acts.event, {
          bubbles: true,
          cancelable: true,
          detail: { action: a.key, id: item.id, sku: item.sku, name: item.name, url: item.url }
        });
        var handled = !window.dispatchEvent(ev);
        if (!handled && item.url) { window.open(item.url, '_blank', 'noopener'); }
      };
      frag.appendChild(b);
    });
    return frag;
  }

  /* Таблица подбора. Приходит с сервера в середине разговора: сначала несколько
     позиций, затем подсказки, чем сузить выбор. */
  function resultTable(node) {
    var items = node.items || [];
    if (!items.length) { return; }

    var wrap = h('div', 'pos-list');
    for (var i = 0; i < items.length; i++) {
      wrap.appendChild(positionCard(items[i]));
    }
    els.body.appendChild(wrap);

    if (node.total && node.shown && node.total > node.shown) {
      var more = h('div', 'pos-more');
      more.textContent = 'Показаны ' + node.shown + ' из ' + node.total +
                         '. Уточним параметры, чтобы сузить выбор.';
      els.body.appendChild(more);

      /* Второй выход из большой выдачи: каталог сайта с уже проставленным фильтром.
         Адрес собирает сервер и присылает не всегда: раздел на сайте может быть
         не описан, серия не выбрана, или ни один ответ покупателя в фильтр сайта
         не переносится. Поэтому рисуем только когда адрес пришёл. Обычная ссылка,
         а не кнопка сценария: кнопки ведут диалог дальше и исчезают после нажатия,
         а эта уводит на сайт и должна пережить нажатие. */
      if (node.catalog_url) {
        var all = h('div', 'pos-more-link');
        all.innerHTML = '<a href="' + esc(node.catalog_url) + '" target="_blank" rel="noopener">' +
                        'Посмотреть все ' + node.total + ' в каталоге</a>';
        els.body.appendChild(all);
      }
    }
    if (node.disclaimer) {
      var d = h('div', 'pos-note');
      d.textContent = node.disclaimer;
      els.body.appendChild(d);
    }
    scrollDown();
  }

  /* ── рендер узла, пришедшего с сервера ── */
  function renderNode(node) {
    if (!node) { return; }
    var msgEl = node.text ? botMsg(esc(node.text)) : null;

    /* Таблица подбора показывается с паузой после текста. Без неё список
       прокручивается мгновенно, покупатель оказывается внизу и не успевает
       прочитать, какой запас надёжности ему рассчитали (замечание Заказчика 07.08).
       Во время паузы держим «печатает…», чтобы ожидание выглядело осмысленным. */
    if (node.type === 'table') {
      var delay = node.delay_ms || 0;
      if (delay > 0 && (node.items || []).length) {
        var t = typing();
        setTimeout(function () {
          if (t && t.parentNode) { t.parentNode.removeChild(t); }
          resultTable(node);
          if (node.placeholder_note) { botMsg('<small>' + esc(node.placeholder_note) + '</small>'); }
          chips(node.chips);
          /* Ставим ленту так, чтобы сообщение «нужен запас не ниже …» осталось
             наверху экрана. Без этого лента прокручивается в самый низ, покупатель
             оказывается на последней карточке и не видит, что ему рассчитали:
             ровно на это жаловался Заказчик 07.08. Одной паузы мало, потому что
             карточки всё равно уводят ленту вниз. */
          scrollToMessage(msgEl);
        }, delay);
        return;
      }
      resultTable(node);
      scrollToMessage(msgEl);
    }

    if (node.placeholder_note) { botMsg('<small>' + esc(node.placeholder_note) + '</small>'); }
    chips(node.chips);

    /* Шаг, который ждёт число в чат (ветка «Мне известен запас прочности»).
       Подсказываем прямо в поле и ставим туда курсор: иначе человек ищет кнопку,
       которой на этом шаге нет. На остальных шагах подпись возвращаем обычную. */
    if (els.input) {
      els.input.placeholder = node.type === 'input'
        ? (node.placeholder || 'Напишите число…')
        : 'Напишите вопрос…';
      if (node.type === 'input') { els.input.focus(); }
    }
  }

  function onChip(c) {
    if (state.busy) { return; }
    if (c.__retry) { sendStep(state.lastRequest); return; }
    userMsg(c.label);

    if (c.kind || c.next === 'lead') {          // форма заявки рисуется на клиенте
      withTyping(Promise.resolve(null), function () { leadForm(c.kind || 'lead'); });
      return;
    }
    if (c.reset) { state.selection = []; }         // новый подбор — прошлые параметры не тянем
    if (c.set) { state.selection.push(c.label); }   // копим, что подбирал — уйдёт в CRM

    sendStep({ next: c.next, set: c.set || {}, label: c.label, reset: !!c.reset });
  }

  /* Единая точка отправки шага: label нужен серверу для транскрипта диалога в CRM. */
  function sendStep(payload) {
    state.lastRequest = payload;
    state.busy = true;
    var body = payload.message
      ? { session_id: state.session, message: payload.message }
      : { session_id: state.session, next: payload.next, set: payload.set || {}, label: payload.label || '', reset: !!payload.reset };
    withTyping(api('chat', body), function (node) {
      state.busy = false;
      state.lastRequest = null;
      renderNode(node);
    });
  }

  /* ── форма заявки (152-ФЗ: чекбокс непредзаполнен, без него отправка невозможна) ── */
  function leadForm(kind) {
    var isCall = kind === 'call';
    var openedAt = Date.now();
    var wrap = h('div', 'lead');
    wrap.innerHTML =
      '<h4>' + (isCall ? 'Обратный звонок' : 'Заявка менеджеру') + '</h4>' +
      '<input type="text" name="cw-name" placeholder="Ваше имя" autocomplete="name">' +
      '<input type="tel" name="cw-phone" placeholder="Телефон" autocomplete="tel">' +
      '<input class="cw-hp" type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="consent"><input type="checkbox">' +
      '<span>Согласен на обработку персональных данных ' +
      '<a href="' + esc(CFG.policyUrl) + '" target="_blank" rel="noopener">(152-ФЗ)</a></span></label>' +
      '<div class="form-note"></div>' +
      '<button class="btn-cta">' + (isCall ? 'Жду звонка' : 'Отправить заявку') + '</button>';
    els.body.appendChild(wrap); scrollDown();

    var nameEl = wrap.querySelector('[name=cw-name]');
    var phoneEl = wrap.querySelector('[name=cw-phone]');
    var hpEl = wrap.querySelector('[name=company_url]');
    var consentEl = wrap.querySelector('.consent input');
    var noteEl = wrap.querySelector('.form-note');
    var btn = wrap.querySelector('.btn-cta');

    btn.onclick = function () {
      noteEl.textContent = '';
      nameEl.classList.remove('err'); phoneEl.classList.remove('err');

      if (nameEl.value.trim().length < 2) {
        nameEl.classList.add('err'); noteEl.textContent = 'Укажите имя.'; return;
      }
      if (!validPhone(phoneEl.value)) {
        phoneEl.classList.add('err'); noteEl.textContent = 'Проверьте номер телефона.'; return;
      }
      if (!consentEl.checked) {
        var box = wrap.querySelector('.consent');
        box.classList.add('shake');
        setTimeout(function () { box.classList.remove('shake'); }, 320);
        noteEl.textContent = 'Нужно согласие на обработку данных.';
        return;
      }

      btn.disabled = true; btn.textContent = 'Отправляем…';
      api('lead', {
        session_id: state.session,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        consent: true,
        hp: hpEl.value,
        form_ts: openedAt,
        what_selected: state.selection.join(' · ')
      }).then(function (res) {
        wrap.remove();
        if (res && res.status === 'accepted') {
          withTyping(Promise.resolve(null), function () {
            botMsg('Готово, заявка принята.<br>Менеджер свяжется с вами в рабочее время.' +
                   '<small>Контакт и история диалога сохранены.</small>');
          });
        } else {
          botMsg('Не получилось отправить заявку. Попробуйте ещё раз или позвоните нам.');
        }
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = isCall ? 'Жду звонка' : 'Отправить заявку';
        noteEl.textContent = 'Ошибка сети. Попробуйте ещё раз.';
      });
    };
  }
  function validPhone(v) { var d = String(v || '').replace(/\D/g, ''); return d.length === 10 || d.length === 11; }

  /* ── свободный текст ── */
  function send() {
    var v = els.input.value.trim();
    if (!v || state.busy || !state.session) { return; }
    userMsg(v); els.input.value = '';
    state.lastRequest = { message: v };
    state.busy = true;
    withTyping(api('chat', { session_id: state.session, message: v }), function (node) {
      state.busy = false;
      state.lastRequest = null;
      renderNode(node);
    });
  }

  /* ── старт диалога при первом открытии ── */
  function startDialog() {
    if (state.started) { return; }
    state.started = true;
    var t = typing();
    api('session', { page_url: location.href }).then(function (res) {
      t.remove();
      if (!res || !res.session_id) {
        botMsg('Сервис временно недоступен. Свяжитесь с менеджером — поможем.');
        return;
      }
      state.session = res.session_id;
      if (res.header && res.header.length) { state.header = res.header; buildTopics(); }
      if (res.greeting) { botMsg(esc(res.greeting)); }
      if (res.node) { setTimeout(function () { renderNode(res.node); }, 350); }
    }).catch(function () {
      t.remove();
      botMsg('Не удалось запустить ассистента. Обновите страницу или свяжитесь с менеджером.');
    });
  }

  function openPanel() {
    state.open = true;
    els.panel.classList.add('open');
    els.panel.setAttribute('aria-hidden', 'false');
    if (els.notif) { els.notif.style.display = 'none'; }
    startDialog();
    setTimeout(function () { els.input.focus(); }, 300);
  }
  function closePanel() {
    state.open = false;
    els.panel.classList.remove('open');
    els.panel.setAttribute('aria-hidden', 'true');
    els.btn.focus();
  }

  /* ── построение UI внутри Shadow DOM ── */
  function build() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CFG.apiBase + '/widget/widget.css' + (CFG.version ? '?v=' + CFG.version : '');
    root.appendChild(link);

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<button class="cw-btn" aria-label="Открыть чат с ассистентом">' +
      '<span class="cw-ring"></span><span class="cw-notif">1</span>' +
      '<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>' +

      '<div class="cw-panel" role="dialog" aria-modal="false" aria-label="AI-ассистент ТД Спаркс" aria-hidden="true">' +
      '<div class="cw-head"><div class="cw-head-row">' +
      '<div style="position:relative"><div class="cw-avatar">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M9 11V7a3 3 0 0 1 6 0v4"/>' +
      '<circle cx="9.5" cy="16.5" r="1" fill="rgba(255,255,255,.92)" stroke="none"/>' +
      '<circle cx="14.5" cy="16.5" r="1" fill="rgba(255,255,255,.92)" stroke="none"/>' +
      '<line x1="12" y1="3" x2="12" y2="5" stroke-width="2"/></svg></div>' +
      '<div class="ai-badge">AI</div></div>' +
      '<div class="cw-name"><h3>Ассистент Спаркс</h3>' +
      '<div class="cw-online"><span class="cw-dot"></span>онлайн · sparks.su</div></div>' +
      '<button class="cw-x" aria-label="Закрыть"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div></div>' +
      '<div class="cw-topics"></div>' +
      '<div class="cw-body"></div>' +
      '<div class="cw-foot"><div class="cw-field">' +
      '<input type="text" placeholder="Напишите вопрос…" autocomplete="off" aria-label="Сообщение"></div>' +
      '<button class="cw-go" aria-label="Отправить"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>' +
      '<div class="cw-powered">Работает на базе ИИ · ТД Спаркс</div>' +
      '</div>';
    root.appendChild(wrap);

    els.btn = root.querySelector('.cw-btn');
    els.notif = root.querySelector('.cw-notif');
    els.panel = root.querySelector('.cw-panel');
    els.body = root.querySelector('.cw-body');
    els.input = root.querySelector('.cw-field input');
    els.topics = root.querySelector('.cw-topics');

    els.btn.onclick = function () { if (state.open) { closePanel(); } else { openPanel(); } };
    root.querySelector('.cw-x').onclick = closePanel;
    root.querySelector('.cw-go').onclick = send;
    els.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { send(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { closePanel(); } });

    buildTopics();
  }

  /* Быстрые темы ведут к узлам сценария — состав задаётся сценарием, не кодом.
     Список приходит с сервера (scenario.json, ключ header), поэтому переименование
     кнопки это правка конфига. Запасной список нужен ровно до ответа /api/session:
     шапка рисуется при монтировании, а сессия начинается при первом открытии. */
  function buildTopics() {
    var fallback = [
      { label: 'Подобрать', next: 'equipment', reset: true },
      { label: 'Каталог', next: 'faq' },
      { label: 'Доставка', next: 'faq_delivery' },
      { label: 'Менеджер', next: 'handoff' }
    ];
    els.topics.innerHTML = '';
    (state.header && state.header.length ? state.header : fallback).forEach(function (t) {
      var el = h('div', 'cw-t', t.label);
      el.onclick = function () {
        if (!state.session || state.busy) { return; }
        // Убираем кнопки предыдущего шага: иначе они остаются кликабельными
        // и пользователь может увести подбор в несогласованное состояние.
        var stale = els.body.querySelectorAll('.chips');
        for (var i = 0; i < stale.length; i++) { stale[i].remove(); }
        if (t.reset) { state.selection = []; }
        userMsg(t.label);
        sendStep({ next: t.next, label: t.label, reset: !!t.reset });
      };
      els.topics.appendChild(el);
    });
  }

  /* ── публичная точка входа, вызывается из loader.js ── */
  window.SparksWidget = {
    __ready: true,
    boot: function (config) {
      if (state.mounted) { if (!state.open) { openPanel(); } return; }
      state.mounted = true;
      CFG.apiBase = (config && config.apiBase) || '';
      CFG.version = (config && config.version) || '';
      CFG.policyUrl = (config && config.policyUrl) || '#';

      var host = document.createElement('div');
      host.id = 'sparks-widget-host';
      document.body.appendChild(host);
      root = host.attachShadow({ mode: 'open' });
      build();
      openPanel();
    }
  };
})();
