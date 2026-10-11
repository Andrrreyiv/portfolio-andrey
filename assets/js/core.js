// Общее для главной и страниц кейсов: тема, плавная прокрутка, навигация, появления, магнит, счётчики.
// GSAP, ScrollTrigger, SplitText и Lenis подключены обычными <script defer> перед модулем.
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
window.__siteOk = true;   // страховка в <head> не снимет класс .js

export { gsap, ScrollTrigger, SplitText };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;

/* ── плавная прокрутка. Lenis крутит тот же тик, что и GSAP: один кадр — одно обновление.
   На тач-экранах Lenis сам отдаёт прокрутку системе (syncTouch выключен по умолчанию). ── */
export const lenis = reduce ? null : new Lenis({ lerp: 0.1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target) {
  const offset = -(document.getElementById('nav')?.offsetHeight || 0) + 1;
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
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
if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

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
    paintMeta();
    window.dispatchEvent(new Event('themechange'));
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
  const split = SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w' });
  gsap.set(el, { visibility: 'visible' });
  const tween = gsap.from(split.words, {
    yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: 0.05, delay,
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
export function countUp(scope = document) {
  if (reduce) return;
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    let shown = null;
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, {
        v: end, duration: 1.1, ease: 'power3.out',
        onUpdate: () => { const n = Math.round(o.v); if (n !== shown) el.textContent = shown = n; },
      }),
    });
  });
}

/* Запуск после шрифтов: от них зависят переносы, а значит и все отметки ScrollTrigger. */
export function ready(fn) {
  const go = () => { fn(); ScrollTrigger.refresh(); };
  (document.fonts?.ready || Promise.resolve()).then(go);
  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
