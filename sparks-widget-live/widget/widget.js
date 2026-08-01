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
  var state = { session: null, started: false, open: false, busy: false, mounted: false, selection: [], lastRequest: null };

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
    var link = item.url
      ? '<a class="pos-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">Открыть карточку на сайте</a>'
      : '<span class="pos-nolink">Карточка на сайте: уточните у менеджера</span>';

    c.innerHTML =
      '<div class="pos-name">' + esc(item.name) + '</div>' +
      (specs ? '<div class="pos-specs">' + specs + '</div>' : '') +
      link;
    return c;
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
                         '. Уточните параметр ниже, чтобы сузить выбор.';
      els.body.appendChild(more);
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
    if (node.text) { botMsg(esc(node.text)); }
    if (node.type === 'table') { resultTable(node); }
    if (node.placeholder_note) { botMsg('<small>' + esc(node.placeholder_note) + '</small>'); }
    chips(node.chips);
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

  /* Быстрые темы ведут к узлам сценария — состав задаётся сценарием, не кодом. */
  function buildTopics() {
    [
      { label: 'Подобрать', next: 'type' },
      { label: 'Каталог', next: 'faq' },
      { label: 'Доставка', next: 'faq_delivery' },
      { label: 'Менеджер', next: 'handoff' }
    ].forEach(function (t) {
      var el = h('div', 'cw-t', t.label);
      el.onclick = function () {
        if (!state.session || state.busy) { return; }
        // Убираем кнопки предыдущего шага: иначе они остаются кликабельными
        // и пользователь может увести подбор в несогласованное состояние.
        var stale = els.body.querySelectorAll('.chips');
        for (var i = 0; i < stale.length; i++) { stale[i].remove(); }
        userMsg(t.label);
        sendStep({ next: t.next, label: t.label });
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
