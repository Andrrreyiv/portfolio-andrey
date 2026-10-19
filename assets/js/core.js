// Общее для главной и страниц кейсов: тема, плавная прокрутка, навигация, появления, магнит, счётчики.
// GSAP, ScrollTrigger, SplitText и Lenis подключены обычными <script defer> перед модулем.
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
window.__siteOk = true;   // страховка в <head> не снимет класс .js

export { gsap, ScrollTrigger, SplitText };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;

// Снимок пришёл (или не придёт) — гасим блик ожидания в рамке .shot (base.css).
document.querySelectorAll('.shot > img').forEach((img) => {
  const done = () => img.parentElement.classList.add('is-ready');
  if (img.complete) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
});

/* ── плавная прокрутка. Lenis крутит тот же тик, что и GSAP: один кадр — одно обновление.
   На тач-экранах Lenis сам отдаёт прокрутку системе (syncTouch выключен по умолчанию). ── */
export const lenis = reduce ? null : new Lenis({ lerp: 0.1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target) {
  // высота меню при прокрутке — 64 px; сверху страницы она 76, и цель уходила на 12 px
  const offset = -63;
  // плавный разгон и торможение (quart in-out): у Lenis по умолчанию expo-out, он срывается с места рывком
  const ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.5, easing: ease });
  else target.scrollIntoView({ block: 'start' });
}

// Якоря этой же страницы ведём через Lenis, иначе браузер прыгает мимо плавной прокрутки.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  scrollToTarget(target);
  history.replaceState(null, '', url.hash);
});

/* ── навигация: плотный фон после первого экрана, прячется при прокрутке вниз ── */
const nav = document.getElementById('nav');
if (nav) {
  let last = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('scrolled', y > 40);
      nav.classList.toggle('hide', y > 480 && y > last && !nav.contains(document.activeElement) && !nav.classList.contains('open'));
      last = y;
    },
  });

  /* меню перенимает тон главы под собой (tokens.css, «Тона секций»): над бумагой — бумажное.
     Наблюдатель смотрит на настоящую вёрстку, поэтому отступ закреплённой ленты ему не мешает. */
  // Бежевых глав несколько, поэтому тон считаем по всему набору под меню: иначе запоздалое «ушла»
  // от одной главы снимало класс, который поставила другая. Слой .tone-bands лежит вне main и не считается.
  const tones = document.querySelectorAll('main .tone-paper');
  if (tones.length) {
    const under = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => (isIntersecting ? under.add(target) : under.delete(target)));
      nav.classList.toggle('tone-paper', under.size > 0);
    }, { rootMargin: '0px 0px -95% 0px' });
    tones.forEach((sec) => io.observe(sec));
  }

  /* меню разделов на узких экранах: Esc, клик по пункту или поворот экрана закрывают его */
  const btn = document.getElementById('menu-btn');
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  if (btn) {
    btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }
}

/* ── прогресс прокрутки: одна линия scaleX, компоновщику — только transform ── */
const bar = document.querySelector('.progress');
if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });   // без своего сглаживания: его даёт Lenis

/* ── тема: новая вырастает кругом из кнопки. Радиус — до дальнего угла экрана,
   чтобы круг всегда закрывал страницу, где бы кнопка ни стояла. ── */
const themeBtn = document.getElementById('theme');
const meta = document.querySelector('meta[name="theme-color"]');
const paintMeta = () => meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
if (themeBtn) {
  const flip = () => {
    const light = root.dataset.theme === 'light';
    if (light) delete root.dataset.theme; else root.dataset.theme = 'light';
    try { localStorage.setItem('theme', light ? 'dark' : 'light'); } catch (e) { /* хранилище закрыто — тема живёт до перезагрузки */ }
    // чтение стилей для meta и частиц — следующим кадром: в колбэке перехода оно стоило 16–22 мс
    requestAnimationFrame(() => { paintMeta(); window.dispatchEvent(new Event('themechange')); });
  };
  themeBtn.addEventListener('click', () => {
    if (!document.startViewTransition || reduce) { flip(); return; }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    root.style.setProperty('--vt-x', x + 'px');
    root.style.setProperty('--vt-y', y + 'px');
    root.style.setProperty('--vt-r', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    document.startViewTransition(flip);
  });
  paintMeta();
}

/* ── магнит на главных кнопках: пишет только --tx/--ty, нажатие остаётся за CSS ── */
if (fine && !reduce) {
  document.querySelectorAll('[data-magnet]').forEach((b) => {
    let raf = 0, ev = null;
    const apply = () => {
      raf = 0;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--tx', ((ev.clientX - r.left - r.width / 2) * 0.2).toFixed(1) + 'px');
      b.style.setProperty('--ty', ((ev.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
    };
    b.addEventListener('pointermove', (e) => { ev = e; if (!raf) raf = requestAnimationFrame(apply); });
    b.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf); raf = 0;
      b.style.removeProperty('--tx'); b.style.removeProperty('--ty');
    });
  });
}

/* ── заголовки по словам: слово выезжает из-под маски. Режем после загрузки шрифтов,
   иначе переносы посчитаются по запасному шрифту и строки поедут. ── */
export function splitHeading(el, { delay = 0, trigger = true } = {}) {
  if (reduce) return null;
  const split = SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w', reduceWhiteSpace: false });
  gsap.set(el, { visibility: 'visible' });
  const tween = gsap.from(split.words, {
    yPercent: 125, duration: 1.15, ease: 'expo.out', stagger: 0.05, delay,
    scrollTrigger: trigger ? { trigger: el, start: 'top 86%', once: true } : undefined,
  });
  return { split, tween };
}

/* ── появления блоков пачками: соседи в одной пачке идут лесенкой ── */
export function batchReveal(selector) {
  if (reduce) return;
  ScrollTrigger.batch(selector, {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true }),
  });
}

/* ── счётчики: в разметке уже стоит итоговое число, анимация только поверх ── */
/* ── видео работ: играют только пока видны (экономия батареи и трафика), грузятся при первом показе.
   reduced-motion и saveData — только постер: видео не стартует вовсе. ── */
export function loopVideos(scope = document) {
  const vids = [...scope.querySelectorAll('video.loop')];
  if (!vids.length || reduce || navigator.connection?.saveData) return;
  // Играет одно видео за раз — самое крупное из видимых: два ролика разом вдвое резали частоту кадров
  // (замер 18.10, сцена Jetron: 15,4 → 7,8 мс на кадр). Где видимых два, они сменяют друг друга по кругу:
  // доиграл круг — пауза, играет соседний, так что и форма, и футболки остаются живыми.
  const area = new Map();
  let playing = null;
  const visible = () => [...area].filter(([, a]) => a > 0).sort((x, y) => y[1] - x[1]).map(([v]) => v);
  const start = (v) => {
    if (playing && playing !== v) playing.pause();
    playing = v;
    if (!v) return;
    if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
    v.play().catch(() => { /* автозапуск запрещён — остаётся постер */ });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting, intersectionRatio, intersectionRect: r }) =>
      area.set(target, isIntersecting && intersectionRatio >= 0.25 ? r.width * r.height : 0));
    const vis = visible();
    if (!vis.includes(playing)) start(vis[0] || null);
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  vids.forEach((v) => {
    io.observe(v);
    let last = 0;
    v.addEventListener('timeupdate', () => {
      const wrapped = v.currentTime < last - 0.5;   // loop не шлёт ended: круг узнаём по откату времени
      last = v.currentTime;
      if (!wrapped || v !== playing) return;
      const vis = visible();
      if (vis.length > 1) start(vis[(vis.indexOf(v) + 1) % vis.length]);
    });
  });
}

// Число ищем в тексте сами (разметку не трогаем, цифры по-прежнему из cases.json): «228 724», «700+», «−50%»,
// «0,13 → 0». Приставки и хвосты остаются как есть; у «было → стало» правое число считается от левого.
// В конце — ровно исходный текст. Ширину держим заранее, иначе соседние цифры ездили бы при счёте.
const NUM = /\d{1,3}(?:[\s  ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/;
const num = (s) => parseFloat(s.replace(/[\s  ]/g, '').replace(',', '.'));
/** Готовит счёт в элементе и возвращает запуск (повторный вызов — пустой), либо null, если считать нечего. */
export function counter(el) {
  if (reduce) return null;
  if (el._count) return el._count;   // уже подготовлен (смена раскладки десктоп ↔ телефон): второй раз от «0» не считать
  const nodes = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) if (/\d/.test(w.currentNode.data)) nodes.push(w.currentNode);
  if (!nodes.length) return null;
  const node = nodes[nodes.length - 1], orig = node.data, m = orig.match(NUM);
  const arrow = el.textContent.includes('→') && nodes.length > 1;
  const m0 = arrow ? nodes[0].data.match(NUM) : null;
  const to = num(m[0]), from = m0 ? num(m0[0]) : 0;
  const dec = Math.max((m[0].split(',')[1] || '').length, m0 ? (m0[0].split(',')[1] || '').length : 0);
  const fmt = (v) => v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/\s/g, ' ');
  const head = orig.slice(0, m.index), tail = orig.slice(m.index + m[0].length), o = { v: from };
  el.style.minWidth = `${Math.ceil(el.getBoundingClientRect().width)}px`;
  node.data = head + fmt(from) + tail;
  let started = false;
  return (el._count = () => {
    if (started) return;
    started = true;
    gsap.to(o, {
      v: to, duration: arrow ? 1.6 : 1.4, ease: 'expo.out', delay: 0.15,
      onUpdate: () => { node.data = head + fmt(o.v) + tail; },
      onComplete: () => { node.data = orig; },
    });
  });
}
/** Счёт при появлении на экране (по вертикальной прокрутке). */
export function countUp(selector) {
  document.querySelectorAll(selector).forEach((el) => {
    const play = counter(el);
    if (play) ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: play });
  });
}

/* Запуск после шрифтов: от них зависят переносы, а значит и все отметки ScrollTrigger. */
export function ready(fn) {
  const go = () => { fn(); ScrollTrigger.refresh(); };
  (document.fonts?.ready || Promise.resolve()).then(go);
  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
