// Сценарий главной страницы.
import { gsap, ScrollTrigger, SplitText, reduce, ready, splitHeading, batchReveal, countUp } from './core.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

ready(() => {
  hero();
  $$('main [data-split]').forEach((h) => { if (!h.closest('.hero')) splitHeading(h); });
  batchReveal('main [data-reveal]:not(.hero [data-reveal])');
  countUp($('.hero'));
  ticker('.ticker-track', 34);
  ticker('.contact-track', 26);
  manifesto();
  work();
  bars();
  processLine();
  principles();
  startGL();
});

/* ── первый экран: заголовок по словам, потом подводка лесенкой ── */
function hero() {
  if (reduce) return;
  const title = $('.hero-title');
  const { words } = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'w' });
  gsap.set(title, { visibility: 'visible' });
  gsap.timeline({ delay: 0.15 })
    .from(words, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.06 }, 0)
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
  gsap.ticker.add(() => { boost *= 0.93; loop.timeScale(dir * (1 + boost)); });
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
let work01 = null;   // { st, dist() } для привязки частиц к ленте
function work() {
  const pin = $('.work-pin'), track = $('.work-track');
  if (!pin) return;
  const scenes = $$('.scene:not(.scene-end)', track);
  const mm = gsap.matchMedia();

  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('has-pin');
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: pin, pin: true, scrub: 0.8, end: () => '+=' + dist(), invalidateOnRefresh: true, anticipatePin: 1 },
    });
    work01 = { st: tween.scrollTrigger, dist };
    scenes.forEach((sc) => {
      const st = { trigger: sc, containerAnimation: tween, start: 'left 78%', once: true };
      gsap.from($$('.shot', sc), { clipPath: 'inset(100% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', stagger: 0.12, scrollTrigger: st });
      gsap.from($$('.shot img', sc), { scale: 1.18, duration: 1.8, ease: 'expo.out', scrollTrigger: st });
      gsap.from($$('.scene-text > *', sc), { x: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: st });
    });
    return () => { root.classList.remove('has-pin'); work01 = null; };
  });

  mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
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
  gsap.to(line, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.proc', start: 'top 75%', end: 'bottom 60%', scrub: 0.6 } });
}

/* ── принципы: слайдер со стрелками, точками, клавишами и свайпом ── */
function principles() {
  const track = $('#ttrack');
  if (!track) return;
  const slides = [...track.children], dotsBox = $('#tdots'), car = $('#tcar');
  let i = 0, timer = 0;
  const dots = slides.map((_, n) => {
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'tdot' + (n ? '' : ' on');
    d.setAttribute('aria-label', 'Принцип ' + (n + 1));
    d.addEventListener('click', () => go(n, true));
    dotsBox.appendChild(d);
    return d;
  });
  slides.forEach((s, n) => s.setAttribute('aria-hidden', n ? 'true' : 'false'));
  function go(n, user) {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-i * 100}%)`;
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    slides.forEach((s, k) => s.setAttribute('aria-hidden', k === i ? 'false' : 'true'));
    if (user) restart();
  }
  const start = () => { if (!reduce) timer = setInterval(() => go(i + 1), 7000); };
  const restart = () => { clearInterval(timer); start(); };
  $('#tprev').addEventListener('click', () => go(i - 1, true));
  $('#tnext').addEventListener('click', () => go(i + 1, true));
  car.addEventListener('pointerenter', () => clearInterval(timer));
  car.addEventListener('pointerleave', start);
  car.addEventListener('focusin', () => clearInterval(timer));
  car.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(i - 1, true); if (e.key === 'ArrowRight') go(i + 1, true); });
  let x0 = null;
  car.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  car.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1), true);
    x0 = null;
  }, { passive: true });
  start();
}

/* ══ облако частиц ══════════════════════════════════════════════════════════
   Порядок по странице: «АБ» → пыль → форма (Jetron) → чат (Спаркс) → панели (Стенариум)
   → пыль → снова «АБ» у финального призыва. Фаза — кусочно-линейная функция прокрутки
   по опорным точкам, которые пересчитываются при каждом refresh ScrollTrigger. */
const SEQ = [0, 1, 2, 3, 4, 1, 0];

function canGL() {
  if (reduce || navigator.connection?.saveData) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

function layout(aspect) {
  const wide = aspect >= 1.2;
  return wide
    ? { anchors: [[aspect * 0.6, 0.1, 0.74], [0, 0, 1], [-aspect * 0.44, -0.04, 0.82], [-aspect * 0.44, -0.04, 0.82], [-aspect * 0.44, -0.04, 0.82]],
        alphas: [0.82, 0.3, 0.34, 0.34, 0.34], size: 2.2 }
    : { anchors: [[aspect * 0.2, 0.56, aspect * 0.78], [0, 0, 1], [0, 0.18, aspect * 0.9], [0, 0.18, aspect * 0.9], [0, 0.18, aspect * 0.9]],
        alphas: [0.3, 0.26, 0.24, 0.24, 0.24], size: 1.8 };
}

function startGL() {
  if (!canGL()) return;
  const go = () => import('./gl.js').then(({ createGL }) => {
    const mobile = innerWidth < 768;
    const count = mobile ? 3600 : (navigator.hardwareConcurrency || 4) >= 8 ? 11000 : 7500;
    let api;
    try { api = createGL($('#gl'), { count, layout }); } catch (e) { console.warn('[gl]', e); return; }
    if (!api) return;
    root.classList.add('gl-on');
    driveGL(api);
  });
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 600);
}

function driveGL(api) {
  let keys = [];
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  function build() {
    const vh = innerHeight;
    const hero = $('.hero'), scenes = $$('.scene:not(.scene-end)'), contact = $('#contact');
    const centers = scenes.map((sc) => {
      if (work01) {
        const { st, dist } = work01;
        const p = (sc.offsetLeft + sc.offsetWidth / 2 - innerWidth / 2) / dist();
        return st.start + Math.max(0, Math.min(1, p)) * (st.end - st.start);
      }
      return docTop(sc) + sc.offsetHeight / 2 - vh / 2;
    });
    const last = centers[centers.length - 1];
    const ct = docTop(contact) - vh * 0.35;
    keys = [
      [0, 0], [hero.offsetHeight * 0.8, 1],
      [centers[0] - vh * 0.7, 1], [centers[0], 2], [centers[1], 3], [last, 4],
      [last + vh * 0.9, 5], [ct - vh * 0.5, 5], [ct, 6],
    ];
    // опоры строго по возрастанию: на коротких экранах соседние точки могут налезть друг на друга
    for (let k = 1; k < keys.length; k++) keys[k][0] = Math.max(keys[k][0], keys[k - 1][0] + 1);
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
  function update() {
    const p = Math.max(0, Math.min(SEQ.length - 1, phase(scrollY)));
    const seg = Math.min(Math.floor(p), SEQ.length - 2);
    api.set(SEQ[seg], SEQ[seg + 1], p - seg);
  }
  // Опоры строятся до триггера: create() сразу зовёт onUpdate.
  build(); update();
  ScrollTrigger.addEventListener('refresh', () => { build(); update(); });
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
}
