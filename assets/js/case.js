// Сценарий страницы кейса: заголовок по словам, живой фрагмент разыгрывает действие продукта (один раз),
// цифра-табло перекатывается по разрядам, схемы и шаги дорисовываются прокруткой.
// Разметку сборка отдаёт в финальном состоянии: без JS и при reduced-motion всё видно сразу.
import { gsap, ScrollTrigger, reduce, ready, splitHeading, batchReveal, countUp, loopVideos } from './core.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

ready(() => {
  splitHeading($('.c-title'), { trigger: false });
  // первый экран целиком: подводка, табло и кнопка выходят лесенкой сразу, а не по порогу прокрутки
  // (низ левой колонки на 900 px высоты лежал ниже порога batchReveal и кнопка не появлялась)
  if (!reduce) gsap.to('.c-hero [data-reveal]', { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09, delay: 0.35 });
  batchReveal('main [data-reveal]:not(.c-hero [data-reveal])');
  loopVideos();
  countUp('.c-metrics dt');
  if (reduce) return;
  odometer($('.c-num-v'));
  const frag = $('.c-frag [data-frag]');
  const play = frag && players[frag.dataset.frag]?.(frag);
  // на компьютере фрагмент уже на экране — ждём, пока заголовок выедет; на телефоне он ниже — по прокрутке
  if (play) ScrollTrigger.create({ trigger: frag, start: 'top 80%', once: true, onEnter: () => play.delay(0.55).play() });
  $$('.c-dg').forEach(diagram);
  $$('.c-steps').forEach(steps);
  // обложка следующего кейса раскрывается из карточки тем же языком, что бежевые листы и финал главной;
  // на тач-экранах без анимации: clip-path по прокрутке перерисовывает картинку в каждом кадре
  if (matchMedia('(pointer: fine)').matches) {
    gsap.fromTo('.c-next-shot', { clipPath: 'inset(10% 8% 10% 8% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none',
      scrollTrigger: { trigger: '.c-next', start: 'top 85%', end: 'bottom bottom', scrub: true },
    });
  }
});

/* ── цифра-табло: каждая цифра — барабан 0…9 0…9, крутится на полный круг и встаёт на свою ──
   Читалке остаётся исходный текст, барабаны скрыты от неё. */
function odometer(el) {
  if (!el) return;
  const text = el.textContent;
  const vis = el.cloneNode(true);
  const walk = document.createTreeWalker(vis, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  const cols = [];
  for (const node of nodes) {
    if (!/\d/.test(node.data)) continue;
    const frag = document.createDocumentFragment();
    for (const ch of node.data) {
      if (!/\d/.test(ch)) { frag.append(ch); continue; }
      const d = document.createElement('span');
      d.className = 'odo';
      const reel = document.createElement('span');
      reel.innerHTML = '0123456789'.repeat(2).split('').map((x) => `<span>${x}</span>`).join('');
      d.append(reel);
      frag.append(d);
      cols.push([reel, +ch]);
    }
    node.replaceWith(frag);
  }
  if (!cols.length) return;
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = text;
  const box = document.createElement('span');
  box.setAttribute('aria-hidden', 'true');
  box.append(...vis.childNodes);
  el.replaceChildren(sr, box);
  // правый разряд крутится дольше — табло «доезжает» справа налево, как механическое
  cols.forEach(([reel, d], i) => gsap.fromTo(reel, { yPercent: 0 }, {
    yPercent: -(10 + d) * 5, duration: 1.5 + (i / cols.length) * 0.9, ease: 'expo.out', delay: 0.5,
  }));
}

/* ── живые фрагменты: каждый возвращает остановленный таймлайн, стартует по появлению ── */
const players = {
  // старые кейсы: видео играет само (loopVideos), а второй предмет той же работы въезжает к окну
  video(fig) {
    const sub = $('.frag-sub', fig);
    if (!sub || getComputedStyle(sub).display === 'none') return null;
    return gsap.timeline({ paused: true }).from(sub, { autoAlpha: 0, y: 70, rotation: 5, duration: 1.2, ease: 'expo.out' });
  },

  // englishgamematters: телефон подносят к QR, луч сканирует, ученики входят, счётчик растёт, кнопка старта загорается
  room(fig) {
    const n = $('.rm-n', fig), qr = $('.rm-qr', fig), beam = $('.rm-beam', fig), btn = $('.rm-btn', fig), phone = $('.rm-phone', fig);
    const people = $$('.rm-players li', fig);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    gsap.set(people, { autoAlpha: 0, scale: 0.6 });
    gsap.set(btn, { autoAlpha: 0.3 });
    n.textContent = '0';
    if (getComputedStyle(phone).display !== 'none') {
      gsap.set(phone, { yPercent: 70, rotation: -16, autoAlpha: 0 });
      tl.to(phone, { yPercent: 0, rotation: -7, autoAlpha: 1, duration: 1.1 });
    }
    beam.style.top = `${qr.offsetTop}px`;
    tl.fromTo(beam, { autoAlpha: 1, y: 0 }, { y: qr.offsetHeight, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '-=0.5')
      .to(beam, { autoAlpha: 0, duration: 0.25 });
    people.forEach((p, i) => tl.to(p, {
      autoAlpha: 1, scale: 1, duration: 0.7,
      onStart: () => { n.textContent = String(i + 1); gsap.fromTo(n, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out' }); },
    }, i ? '>-0.45' : '>-0.1'));
    tl.to(btn, { autoAlpha: 1, duration: 0.5 }).to(btn, { scale: 1.06, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 });
    return tl;
  },

  // NeurochessAI: фото бланка → бот печатает → вопрос с кнопками → игрок жмёт К:b5 → разбор с доской
  chat(fig) {
    const feed = $('.tg-feed', fig), items = $$('.tg-feed > li', fig), sheet = $('.ch-sheet', fig);
    const pick = $('.tg-b.is-on', fig);
    pick.classList.remove('is-on');
    items.forEach((li) => { li.style.display = 'none'; });
    const typing = document.createElement('li');
    typing.className = 'tg-m tg-typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<i></i><i></i><i></i>';
    typing.style.display = 'none';
    feed.append(typing);
    // новое сообщение снизу выталкивает прежние вверх — как в настоящем чате, без скачка
    const push = (li) => {
      li.style.display = '';
      feed.append(li);
      const h = li.offsetHeight + 8;
      gsap.fromTo(feed, { y: h }, { y: 0, duration: 0.55, ease: 'expo.out', overwrite: true });
      gsap.fromTo(li, { autoAlpha: 0, scale: 0.94, transformOrigin: li.classList.contains('tg-me') ? '100% 100%' : '0% 100%' },
        { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'expo.out' });
    };
    const tl = gsap.timeline({ paused: true });
    if (sheet && getComputedStyle(sheet).display !== 'none') {
      tl.from(sheet, { autoAlpha: 0, y: 40, rotation: -14, duration: 1.1, ease: 'expo.out' });
    }
    const say = (li, wait) => {
      tl.call(() => push(typing), null, '+=0.25').to({}, { duration: wait })
        .call(() => { typing.style.display = 'none'; push(li); });
    };
    tl.call(() => push(items[0]), null, sheet ? '-=0.6' : 0).to({}, { duration: 0.5 });
    say(items[1], 0.75);
    say(items[2], 0.7);
    tl.to({}, { duration: 0.9 })
      .to(pick, { scale: 0.94, duration: 0.12, ease: 'power2.in' })
      .call(() => pick.classList.add('is-on'))
      .to(pick, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    say(items[3], 0.6);
    say(items[4], 1.0);
    return tl;
  },

  // ассистент: покупатель пишет в телефоне → в CRM видно, что получила модель, метки на глазах закрывают имя и телефон →
  // поля карточки заполняются → ассистент отвечает → «передано менеджеру»
  mask(fig) {
    const msgs = $$('.as-m', fig), crm = $('.as-crm', fig), prompt = $('.as-prompt', fig), plates = $$('.as-prompt .tag b', fig);
    const dds = $$('.as-crm dd', fig), hand = $('.as-hand', fig), phone = $('.as-phone', fig);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    gsap.set(plates, { clipPath: 'inset(0 100% 0 0 round 5px)' });
    gsap.set(msgs.slice(1), { autoAlpha: 0, y: 18 });
    tl.from(phone, { autoAlpha: 0, y: 50, duration: 1 })
      .to(msgs[1], { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.3')
      .from(crm, { autoAlpha: 0, x: -30, duration: 1 }, '-=0.2')
      .from(prompt, { autoAlpha: 0, y: 12, duration: 0.6 }, '-=0.5');
    plates.forEach((p, i) => tl.to(p, { clipPath: 'inset(0 0% 0 0 round 5px)', duration: 0.55, ease: 'power3.inOut' }, i ? '+=0.2' : '+=0.3'));
    tl.from(dds, { autoAlpha: 0, x: -10, duration: 0.5, stagger: 0.2 }, '+=0.15')
      .to(msgs[2], { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.3')
      .from(hand, { autoAlpha: 0, x: -12, duration: 0.6 }, '+=0.1')
      .fromTo($('i', hand), { boxShadow: '0 0 0 0 rgba(30,138,94,.55)' }, { boxShadow: '0 0 0 10px rgba(30,138,94,0)', duration: 1.2, ease: 'power2.out', repeat: 1 }, '-=0.2');
    return tl;
  },

  // ML: зёрна прорастают из центров кристаллизации, потом три входа сходятся в модель
  grains(fig) {
    const cells = $$('.gr-c', fig), lines = $$('.gr-ln', fig);
    const tl = gsap.timeline({ paused: true });
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
    tl.from('.gr-ring, .gr-ret, .gr-bar', { autoAlpha: 0, duration: 0.8, ease: 'power2.out' })
      .from(cells, {
        scale: 0, svgOrigin: (i, el) => el.dataset.o, duration: 1.3, ease: 'expo.out',
        stagger: { each: 0.018, from: 'random' },
      }, 0.1)
      .from('.gr-inc circle', { autoAlpha: 0, duration: 0.6, stagger: 0.03 }, '-=0.6')
      .to(lines.slice(0, 3), { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.08 }, '-=0.2')
      .from($$('.gr-in', fig), { autoAlpha: 0, y: 14, duration: 0.6, ease: 'expo.out', stagger: 0.1 }, '-=0.35')
      .to(lines.slice(3), { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.08 }, '-=0.2')
      .from('.gr-model', { autoAlpha: 0, scale: 0.8, svgOrigin: '300 738', duration: 0.8, ease: 'back.out(2)' }, '-=0.3');
    return tl;
  },
};

/* ── схема: узлы проявляются по порядку чтения, связи прорисовываются (pathLength=1), один раз ── */
function diagram(fig) {
  const svg = [...fig.querySelectorAll('svg')].find((s) => s.getBoundingClientRect().width > 0);
  if (!svg) return;
  const nodes = $$('.dg-node', svg), edges = $$('.dg-edge[pathLength]', svg);
  if (!nodes.length) return;
  // наконечники стрелок живут в <marker> и иначе видны раньше своих линий — проявляются в конце
  const tips = $$('.dg-tip, .dg-alt', svg);
  gsap.set(nodes, { autoAlpha: 0, y: 14 });
  gsap.set(edges, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(tips, { autoAlpha: 0 });
  const tl = gsap.timeline({ paused: true });
  tl.to(nodes, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.11 })
    .to(edges, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut', stagger: 0.11 }, 0.25)
    .to(tips, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, '-=0.3');
  ScrollTrigger.create({ trigger: fig, start: 'top 72%', once: true, onEnter: () => tl.play() });
}

/* ── шаги: линия дорисовывается прокруткой, точка шага загорается, когда линия до неё дошла ── */
function steps(ol) {
  const items = $$('li', ol);
  ol.style.setProperty('--p', 0);
  ScrollTrigger.create({
    trigger: ol, start: 'top 72%', end: 'bottom 62%', scrub: true,
    onUpdate: ({ progress }) => {
      ol.style.setProperty('--p', progress.toFixed(3));
      const at = progress * ol.offsetHeight;
      items.forEach((li) => li.classList.toggle('on', li.offsetTop + 20 <= at + 1));
    },
  });
}
