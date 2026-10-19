// Сценарий главной страницы.
import { gsap, ScrollTrigger, SplitText, reduce, ready, splitHeading, batchReveal, countUp, counter, loopVideos } from './core.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

ready(() => {
  const intro = hero();
  $$('main [data-split]').forEach((h) => { if (!h.closest('.hero')) splitHeading(h); });
  batchReveal('main [data-reveal]:not(.hero [data-reveal])');
  countUp('.hero-stats dt');
  loopVideos();
  ticker('.ticker-track', 34);
  ticker('.contact-track', 26);
  manifesto();
  work();
  bars();
  processLine();
  servicePreview();
  finale();
  startGLAfter(intro);
  // раскрытый вопрос меняет высоту «Вопросов», а ScrollTrigger сам этого не замечает: без пересчёта лист бумаги
  // оставался прежней высоты (низ главы — тёмным по чёрному) и сдвигались отметки финала
  let faqT = 0;
  $$('#faq details').forEach((d) => d.addEventListener('toggle', () => { clearTimeout(faqT); faqT = setTimeout(() => ScrollTrigger.refresh(), 60); }));
});

/* ── первый экран: заголовок по словам, потом подводка лесенкой ── */
function hero() {
  if (reduce) return null;
  const title = $('.hero-title');
  const { words } = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w', reduceWhiteSpace: false });
  gsap.set(title, { visibility: 'visible' });
  return gsap.timeline({ delay: 0.15 })
    .from(words, { yPercent: 125, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, 0)
    .to($$('.hero [data-reveal]'), { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09 }, 0.4);
}

/* ── бегущие строки: бесконечная петля; рывок прокрутки разгоняет её и задаёт направление,
   разгон гаснет сам в общем тике (без новых твинов на каждое событие прокрутки) ── */
function ticker(sel, dur) {
  const track = $(sel);
  if (!track || reduce) return;
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: dur, repeat: -1 });
  let dir = 1, boost = 0;
  ScrollTrigger.create({
    onUpdate(self) {
      const v = self.getVelocity();
      if (v) dir = Math.sign(v);
      boost = Math.max(boost, Math.min(Math.abs(v) / 350, 5));
    },
  });
  // скорость подтягивается к цели, а не прыгает: смена направления прокрутки разворачивает строку плавно, через ноль;
  // затухания по времени (deltaRatio), иначе на экране 144 Гц всё гасло в 2,4 раза быстрее
  let ts = 1, on = true;
  gsap.ticker.add(() => {
    if (!on) return;
    const k = gsap.ticker.deltaRatio(60);
    boost *= 0.93 ** k; ts += (dir * (1 + boost) - ts) * (1 - 0.92 ** k); loop.timeScale(ts);
  });
  // вне экрана строка стоит: зачем двигать то, чего не видно
  ScrollTrigger.create({ trigger: track, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; loop.paused(!on); } });
}

/* ── манифест: слова «загораются» по мере прокрутки ── */
function manifesto() {
  const el = $('[data-scrub]');
  // При «больше контраста» приглушённый текст недопустим даже на время прокрутки.
  if (!el || reduce || matchMedia('(prefers-contrast: more)').matches) return;
  // aria: 'none' — на <p> aria-label запрещён (Lighthouse 10.10), а слова и так остаются текстом.
  const { words } = SplitText.create(el, { type: 'words', wordsClass: 'w', aria: 'none' });
  gsap.fromTo(words, { opacity: 0.22 }, {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 42%', scrub: true },
  });
}

/* ── 01: закреплённая горизонтальная лента на десктопе, вертикальные сцены на телефоне ── */
let work01 = null;   // { center(k) } — прокрутка, при которой сцена k в центре (опора частиц)
function work() {
  const pin = $('.work-pin'), track = $('.work-track');
  if (!pin) return;
  const scenes = $$('.scene:not(.scene-end)', track);
  const mm = gsap.matchMedia();

  // Горизонтальная лента — только с мышью или тачпадом: на планшете ≥1024 px с тачем нативная прокрутка
  // и закрепление шли бы рывками, там сцены идут столбиком, как на телефоне.
  mm.add('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('has-pin');
    const dist = () => track.scrollWidth - innerWidth;
    // где стоит дорожка, когда сцена k в кадре: сцена по центру экрана (первая — у своего края)
    const restX = (k) => () => -Math.min(dist(), Math.max(0, scenes[k].offsetLeft - (innerWidth - scenes[k].offsetWidth) / 2));
    const cur = $('.work-count b'), bar = $('.wc-bar i');
    // Лента — таймлайн «переезд → пауза»: сцена доезжает до центра и стоит, пока человек листает дальше, и в любой
    // точке покоя кадр законченный. Прокрутку не перехватываем: автодоводку (lenis.scrollTo после остановки)
    // владелец 18.10 ощутил как «дёргается резко», а паузы зашиты в саму ленту. scrub: true — сглаживает один Lenis.
    // Прокрутки на ленту в 1,6 раза больше её ширины: рывок тачпада (~3000 px) раньше проносил 1,5–2 сцены
    // («сразу Андрианов»). anticipatePin убран: с Lenis он закреплял заранее и лента прыгала на ~75 px;
    // pinType 'transform' — закрепление без смены position, иначе каждый проход давал CLS ≈ 2 (замер 18.10).
    const HOLD = 0.5, MOVE = 1;
    // ScrollTrigger зовёт onUpdate прямо при создании — до того, как метки посчитаны: sync() до этого молчит
    let at = [], T = 0, shown = '';
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: pin, pin: true, pinType: 'transform', scrub: true, invalidateOnRefresh: true,
        end: () => '+=' + dist() * 1.6,
        onUpdate: (self) => sync(self.progress),
      },
    });
    tl.addLabel('s0').to({}, { duration: HOLD });
    scenes.slice(1).forEach((sc, k) => { tl.to(track, { x: restX(k + 1), duration: MOVE }).addLabel(`s${k + 1}`).to({}, { duration: HOLD }); });
    tl.to(track, { x: () => -dist(), duration: MOVE * 0.6 });     // к «Ещё проекты ниже»
    at = scenes.map((sc, k) => tl.labels[`s${k}`]);
    T = tl.duration();
    // огромный номер сцены плывёт медленнее ленты — глубина без 3D; живёт от въезда сцены до её ухода
    scenes.forEach((sc, k) => {
      const t0 = k ? at[k] - MOVE : 0, t1 = k < scenes.length - 1 ? at[k + 1] : T;
      tl.fromTo($('.scene-big', sc), { xPercent: 40 }, { xPercent: -40, ease: 'none', duration: t1 - t0 }, t0);
    });
    // появление сцены — обычной анимацией по времени, когда сцена въехала наполовину; первая — ещё до закрепления,
    // иначе низ экрана перед лентой полсекунды пустой («арт-директор» 18.10)
    const rv = scenes.map((sc) => gsap.timeline({ paused: true })
      .from($$('.shot', sc), { clipPath: 'inset(100% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0)
      .from($$('.shot img, .shot video', sc), { scale: 1.18, duration: 1.8, ease: 'expo.out' }, 0)
      .from($$('.scene-text > *', sc), { x: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, 0));
    const done = scenes.map(() => false), warmed = scenes.map((sc, k) => k < 2);
    // цифры сцены считаются вместе с её появлением: по вертикали сцены 2–4 «на экране» задолго до того, как въедут
    const cnt = scenes.map((sc) => $$('.scene-metrics dt', sc).map(counter).filter(Boolean));
    const show = (k) => { if (!done[k]) { done[k] = true; rv[k].play(); cnt[k].forEach((play) => play()); } };
    ScrollTrigger.create({ trigger: pin, start: 'top 70%', once: true, onEnter: () => show(0) });
    // Лента лежит под overflow:hidden у .work-pin: ленивая загрузка видит картинку, лишь когда та уже на экране,
    // и снимок делит канал с видео своей сцены (замер 18.10: 72 КБ шли 5,9 с). Поэтому грузим заранее:
    // картинки и видео первых двух сцен — за экран до ленты, остальные видео — когда начинает въезжать предыдущая сцена.
    const warm = (sc) => {
      if (navigator.connection?.saveData) return;
      $$('video.loop', sc).forEach((v) => { if (v.preload === 'none') { v.preload = 'auto'; v.load(); } });
    };
    ScrollTrigger.create({
      trigger: pin, start: 'top bottom+=100%', once: true,
      onEnter: () => { $$('img[loading="lazy"]', track).forEach((i) => { i.loading = 'eager'; }); scenes.slice(0, 2).forEach(warm); },
    });
    function sync(p) {
      if (!T) return;
      const t = p * T;
      scenes.forEach((sc, k) => {
        if (k && t >= at[k] - MOVE * 0.55) show(k);
        if (!warmed[k] && t >= at[k - 1] - MOVE) { warmed[k] = true; warm(sc); }
      });
      let n = 0;
      at.forEach((a, k) => { if (t >= a - MOVE / 2) n = k; });
      const txt = String(n + 1).padStart(2, '0');
      if (cur && txt !== shown) cur.textContent = shown = txt;
      if (bar) bar.style.transform = `scaleX(${p})`;
    }
    sync(tl.scrollTrigger.progress);   // страница открыта посреди ленты — сцены, мимо которых уже проехали, показаны
    const st = tl.scrollTrigger;
    // прокрутка, при которой сцена k стоит в центре (середина её паузы) — опора фаз частиц в driveGL
    work01 = { center: (k) => st.start + (at[k] + HOLD / 2) / T * (st.end - st.start) };
    return () => { root.classList.remove('has-pin'); work01 = null; };
  });

  mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference), (pointer: coarse) and (prefers-reduced-motion: no-preference)', () => {
    countUp('.scene-metrics dt');
    scenes.forEach((sc) => {
      const st = { trigger: sc, start: 'top 82%', once: true };
      gsap.from($$('.shot', sc), { clipPath: 'inset(100% 0% 0% 0% round 18px)', duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: st });
      gsap.from($$('.scene-text > *', sc), { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: st });
    });
  });
}

/* ── график SEO: столбцы растут через scaleY, не через height ── */
function bars() {
  $$('.bars').forEach((b) => {
    if (reduce) { $$('.bar', b).forEach((x) => (x.style.transform = 'none')); return; }
    gsap.to($$('.bar', b), { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: b, start: 'top 80%', once: true } });
  });
}

/* ── линия процесса прорисовывается вместе с прокруткой ── */
function processLine() {
  const line = $('.proc-line');
  if (!line) return;
  if (reduce) { line.style.transform = 'none'; return; }
  gsap.to(line, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.proc', start: 'top 75%', end: 'bottom 60%', scrub: true } });
}

/* ── услуги: при наведении у курсора всплывает кадр живой работы (только мышь, без reduced-motion) ── */
function servicePreview() {
  const rows = $$('.svc[data-preview]');
  if (!rows.length || reduce || !matchMedia('(pointer: fine) and (min-width: 1024px)').matches) return;
  const box = document.createElement('figure');
  box.className = 'svc-pv';
  box.setAttribute('aria-hidden', 'true');
  const img = new Image();
  img.alt = ''; img.decoding = 'async';
  box.appendChild(img);
  document.body.appendChild(box);
  // по горизонтали кадр идёт за курсором, по вертикали встаёт над строкой: наведённая строка читается целиком
  gsap.set(box, { xPercent: -50, yPercent: -100, rotation: -3, scale: 0.86, transformOrigin: '50% 100%' });
  const x = gsap.quickTo(box, 'x', { duration: 0.55, ease: 'power3' });
  const y = gsap.quickTo(box, 'y', { duration: 0.55, ease: 'power3' });
  let on = false;
  const show = (src) => {
    if (img.getAttribute('src') !== src) img.src = src;
    if (on) return;
    on = true;
    gsap.to(box, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
  };
  const hide = () => {
    on = false;
    gsap.to(box, { autoAlpha: 0, scale: 0.86, rotation: -3, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
  };
  // кадры подгружаются, когда список услуг на подходе, а не при первом наведении
  ScrollTrigger.create({
    trigger: '.svc-list', start: 'top bottom', once: true,
    onEnter: () => rows.forEach((r) => { new Image().src = r.dataset.preview; }),
  });
  rows.forEach((r) => {
    r.addEventListener('pointerenter', (e) => {
      const top = r.getBoundingClientRect().top + 18;
      if (!on) gsap.set(box, { x: e.clientX, y: top }); else y(top);
      show(r.dataset.preview);
    });
    r.addEventListener('pointerleave', hide);
  });
  addEventListener('pointermove', (e) => { if (on) x(e.clientX); }, { passive: true });
  addEventListener('scroll', () => { if (on) hide(); }, { passive: true });
}

/* ── финал: акцентная сцена раскрывается из скруглённой карточки по мере подхода ── */
function finale() {
  const el = $('#contact');
  // на телефоне clip-path перерисовывал всю сцену в каждом кадре (замер 18.10, ×4: медиана 15,4 → 8,0 мс без него)
  if (!el || reduce || matchMedia('(max-width: 767px), (pointer: coarse)').matches) return;
  gsap.fromTo(el, { clipPath: 'inset(0% 5% 0% 5% round 48px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 25%', scrub: true },
  });
}

/* ══ облако частиц ══════════════════════════════════════════════════════════
   Чёрные и бежевые главы идут вперемежку, и частицы живут на обеих. Порядок по странице:
   «АБ» первого экрана уезжает вверх вместе с экраном и рассыпается → на бумаге «Обо мне» собирается снова,
   чернилами (один человек на всём пути) → пыль → форма (Jetron) → чат (Спаркс) → панели (Стенариум)
   → окно сайта (andrianov-agency.ru) → лупа («Ещё проекты») → пыль («Услуги») → сеть («Примеры решений»)
   → пыль («Как работаю») → вопрос («Вопросы») → снова «АБ» у финала.
   Фаза — кусочно-линейная функция прокрутки по опорным точкам, пересчёт при каждом refresh ScrollTrigger. */
const SEQ_WIDE = [0, 1, 0, 1, 2, 3, 4, 5, 6, 1, 7, 1, 8, 0];
// на телефоне манифест в одну колонку и «АБ» лёг бы прямо на крупный текст — там остаётся пыль
const SEQ_NARROW = SEQ_WIDE.map((s, i) => (i === 2 ? 1 : s));
let SEQ = SEQ_WIDE;

function canGL() {
  if (reduce || navigator.connection?.saveData) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

function layout(aspect) {
  const wide = aspect >= 1.2;
  // формы сцен (2–5) стоят призраком за текстом: слева на десктопе, по центру на телефоне
  const scene = wide ? [-aspect * 0.44, -0.04, 0.82] : [0, 0.18, aspect * 0.9];
  // фигуры бежевых глав встают в свободное поле главы: лупа — слева над карточками, напротив
  // заголовка; сеть — справа от шапки, выше первого примера; вопрос — под заголовком слева; на телефоне призраком по центру
  const ghost = [0, 0.2, aspect * 0.86];
  // «АБ» крупнее и выше (низ знака над цифрами первого экрана); альфы на чёрном ниже, чем были: точки теперь
  // светятся и складываются, свет не должен спорить с текстом. На телефоне «?» — у заголовка, а не на ответах.
  return wide
    ? { anchors: [[aspect * 0.54, 0.16, 0.9], [0, 0, 1], scene, scene, scene, scene,
        [-aspect * 0.5, 0.22, 0.52], [aspect * 0.5, 0.2, 0.55], [-aspect * 0.62, -0.62, 0.46]],
        alphas: [0.72, 0.3, 0.26, 0.26, 0.26, 0.26, 0.45, 0.4, 0.5], size: 2.2 }
    : { anchors: [[aspect * 0.2, 0.56, aspect * 0.78], [0, 0, 1], scene, scene, scene, scene, ghost, ghost, [0, 0.62, aspect * 0.5]],
        alphas: [0.3, 0.26, 0.24, 0.24, 0.24, 0.24, 0.24, 0.22, 0.26], size: 1.8 };
}

function startGL() {
  if (!canGL()) return;
  const go = () => import('./gl.js').then(async ({ createGL }) => {
    const mobile = innerWidth < 768;
    const count = mobile ? 3600 : (navigator.hardwareConcurrency || 4) >= 8 ? 11000 : 7500;
    let api;
    try { api = await createGL($('#gl'), { count, layout }); } catch (e) { console.warn('[gl]', e); return; }
    if (!api) return;
    root.classList.add('gl-on');
    driveGL(api, paperBands(api));
  });
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 600);
}
// WebGL стартует после вступления первого экрана: импорт, компиляция и выборка фигур на телефоне ×4 давали
// кадры 160/55/38 мс прямо посреди выезда заголовка (замер 18.10)
function startGLAfter(intro) {
  if (intro) intro.eventCallback('onComplete', startGL); else startGL();
}

/* ══ бумага под частицами ═══════════════════════════════════════════════════
   Холст частиц лежит под main, и непрозрачный фон бежевой главы прятал их. Поэтому фон главы
   переезжает в слой .tone-bands ПОД холстом, глава становится прозрачной, и те же частицы летят
   по бумаге (шейдер печатает их чернилами и терракотой по зонам uZone). Без WebGL слой не строится,
   и у главы остаётся свой фон. Лист входит карточкой со скруглёнными углами и раскрывается
   во всю ширину, уходя — снова собирается в карточку. */
function paperBands(api) {
  const secs = $$('main > .tone-paper');
  if (!secs.length) return { measure() {}, shape() {} };
  const host = document.createElement('div');
  host.className = 'tone-bands';
  host.setAttribute('aria-hidden', 'true');
  $('#gl').before(host);
  // Скругление делают четыре угла-«заплатки» цвета страницы, а не border-radius: радиус на полосе высотой
  // до 4000 px перерисовывал бы её целиком в каждом кадре. Так в кадре меняется только transform — работа композитора.
  const bands = secs.map(() => {
    const b = host.appendChild(Object.assign(document.createElement('div'), { className: 'tone-band tone-paper' }));
    b.innerHTML = '<i class="cap tl"></i><i class="cap tr"></i><i class="cap bl"></i><i class="cap br"></i>';
    return { b, top: [...b.querySelectorAll('.tl,.tr')], bot: [...b.querySelectorAll('.bl,.br')], last: '' };
  });
  root.classList.add('has-bands');
  let geo = [], IN = 0.04;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  function shape(y = scrollY) {
    const vh = innerHeight;
    geo.forEach(([t, h], i) => {
      const top = t - y, bot = top + h;
      if (bot < -vh || top > vh * 2) return;              // далеко от экрана — не трогаем стиль
      // вход и уход по ease-in-out на 78 % экрана: карточка читается, пока верх листа не дойдёт до середины,
      // и раскрывается без рывка в начале (прежний out-cubic тратил весь эффект в нижней пятой экрана)
      const enter = smooth(clamp((vh * 0.98 - top) / (vh * 0.78)));
      const leave = smooth(clamp((vh * 0.8 - bot) / (vh * 0.78)));
      const s = 1 - 2 * IN * Math.max(1 - enter, leave);
      geo[i][2] = s;                                       // шейдер красит точки бумагой только внутри листа
      const key = `${s.toFixed(4)}|${(1 - enter).toFixed(3)}|${leave.toFixed(3)}`;
      const B = bands[i];
      if (key === B.last) return;
      B.last = key;
      B.b.style.transform = `scaleX(${s.toFixed(4)})`;
      B.top.forEach((c) => { c.style.transform = `scale(${(1 - enter).toFixed(3)})`; });
      B.bot.forEach((c) => { c.style.transform = `scale(${leave.toFixed(3)})`; });
    });
  }
  function measure() {
    geo = secs.map((s) => [s.getBoundingClientRect().top + scrollY, s.offsetHeight, 1]);
    // поле карточки не глубже отступа текста минус 24 px: на узких экранах 4 % ширины резали бы строки
    const wrap = $('.wrap', secs[0]);
    const left = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft);
    IN = Math.min(0.04, Math.max(8, left - 24) / innerWidth);
    geo.forEach(([t, h], i) => { bands[i].b.style.top = `${t}px`; bands[i].b.style.height = `${h}px`; bands[i].last = ''; });
    api.zones(geo);
    shape();
  }
  return { measure, shape };
}

function driveGL(api, paper) {
  let keys = [];
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  function build() {
    const vh = innerHeight;
    const scenes = $$('.scene:not(.scene-end)'), contact = $('#contact');
    const about = $('#about'), more = $('#more'), svc = $('#services'), sol = $('#solutions'), proc = $('#process'), faq = $('#faq');
    const centers = scenes.map((sc, k) => (work01 ? work01.center(k) : docTop(sc) + sc.offsetHeight / 2 - vh / 2));
    const ct = docTop(contact) - vh * 0.35;
    const end = (el) => docTop(el) + el.offsetHeight;
    const mid = (el) => docTop(el) + el.offsetHeight / 2 - vh / 2;
    const head = (el) => { const h = $('.sec-head, .more-head', el); return docTop(h) + h.offsetHeight; };
    // Фигура бежевой главы собрана, когда верх главы на 20 % экрана, и держится, пока видна шапка главы
    // (её низ выше 30 % экрана), а потом за 0,7 экрана рассыпается в пыль: дальше текст и карточки,
    // фигура под ними только мешала бы читать. «Вопросы» короткие, левая колонка пустая — держим до финала.
    const hold = (el, p) => [[docTop(el) - vh * 0.2, p], [head(el) - vh * 0.3, p], [head(el) + vh * 0.4, p + 1]];
    const cols = $('.manifest-cols', about), hero = $('.hero');
    SEQ = innerWidth / vh >= 1.2 ? SEQ_WIDE : SEQ_NARROW;   // тот же порог, что у раскладки фигур layout()
    keys = [
      [0, 0], [hero.offsetHeight * 0.5, 1],          // «АБ» первого экрана уезжает с ним и рассыпается
      [docTop(about) - vh * 0.12, 2],                 // на бумаге собирается снова, справа от манифеста
      [docTop(cols) - vh * 0.6, 2], [docTop(cols) - vh * 0.2, 3], // и рассыпается до карточек 01–04
      [centers[0] - vh * 0.7, 3],                     // пыль перед лентой
      ...centers.map((c, k) => [c, k + 4]),           // сцена k ленты ↔ позиция k+4 (форма, чат, панели, сайт)
      ...hold(more, 8), [mid(svc), 9], ...hold(sol, 10), [mid(proc), 11],
      [docTop(faq) - vh * 0.2, 12], [ct - vh * 0.45, 12], [ct, SEQ.length - 1],
    ];
    // опоры строго по возрастанию: на коротких экранах соседние точки могут налезть друг на друга
    for (let k = 1; k < keys.length; k++) keys[k][0] = Math.max(keys[k][0], keys[k - 1][0] + 1);
    // откуда отсчитывать параллакс: момент, когда фигура собрана
    from6 = { 6: docTop(more) - vh * 0.2, 7: docTop(sol) - vh * 0.2, 8: docTop(faq) - vh * 0.2 };
    fromAB = docTop(about) - vh * 0.12;
  }
  let from6 = {}, fromAB = 0;
  // Высота холста (100lvh), а не innerHeight: на телефоне адресная строка меняет innerHeight при прокрутке,
  // ScrollTrigger такие ресайзы пропускает, и «АБ» прыгал на ~20 px в момент, когда строка пряталась.
  let ch = innerHeight;
  const fine = matchMedia('(pointer: fine)').matches;
  // Вступление: если страница открыта сверху, «АБ» собирается из пыли — у первого экрана появляется событие.
  // Первая же прокрутка отдаёт фазу прокрутке, без борьбы двух анимаций.
  let intro = scrollY < innerHeight * 0.3 ? 0 : 1, introTw = null;
  const endIntro = () => { if (intro < 1) { introTw?.kill(); intro = 1; update(); } };
  if (intro < 1) {
    const o = { v: 0 };
    introTw = gsap.to(o, { v: 1, duration: 2.6, ease: 'power3.out', onUpdate: () => { intro = o.v; update(); } });
    ['wheel', 'touchmove', 'keydown'].forEach((t) => addEventListener(t, endIntro, { passive: true, once: true }));
  }
  function phase(y) {
    if (!keys.length) return 0;
    if (y <= keys[0][0]) return keys[0][1];
    for (let k = 1; k < keys.length; k++) {
      const [y1, p1] = keys[k], [y0, p0] = keys[k - 1];
      if (y <= y1) return y1 === y0 ? p1 : p0 + (p1 - p0) * (y - y0) / (y1 - y0);
    }
    return keys[keys.length - 1][1];
  }
  function update(self) {
    // позиция из прохода ScrollTrigger (кэш), а не scrollY: чтение scrollY после записи стилей — пересчёт стиля в кадре
    const y = self && self.scroll ? self.scroll() : scrollY;
    if (intro < 1 && y > 40) endIntro();
    const p = Math.max(0, Math.min(SEQ.length - 1, phase(y)));
    const seg = Math.min(Math.floor(p), SEQ.length - 2);
    if (intro < 1) api.set(1, 0, intro);   // пыль → «АБ»
    else api.set(SEQ[seg], SEQ[seg + 1], p - seg);
    api.scroll(y);
    // фигура бежевой главы едет вверх вместе с главой втрое медленнее текста — она «в глубине» листа.
    // «АБ» первого экрана (сегмент 0) едет ровно со страницей: цифры под ним не проезжают сквозь точки
    // (на тач-экране — нет: fixed-холст из главного потока отставал бы от нативной прокрутки, знак рассыпается на месте);
    // «АБ» на бумаге (сегменты 1–2) — с тем же параллаксом, что фигуры глав; у финала — на месте.
    const par = (from) => Math.max(-0.8, Math.min(0.8, (y - from) / ch * 2 * 0.3));
    const s = SEQ[seg + 1] >= 6 ? SEQ[seg + 1] : SEQ[seg] >= 6 ? SEQ[seg] : 0;
    api.shift(s ? par(from6[s]) : 0, seg === 0 ? (fine ? y / ch * 2 : 0) : seg <= 2 ? par(fromAB) : 0);
    paper.shape(y);
  }
  // Опоры строятся до триггера: create() сразу зовёт onUpdate.
  const remeasure = () => { ch = $('#gl').clientHeight || innerHeight; paper.measure(); build(); update(); };
  remeasure();
  ScrollTrigger.addEventListener('refresh', remeasure);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
}
