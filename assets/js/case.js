// Сценарий страницы кейса: заголовок по словам сразу, блоки пачками по прокрутке, обложка плывёт медленнее страницы.
import { gsap, reduce, ready, splitHeading, batchReveal } from './core.js';

ready(() => {
  splitHeading(document.querySelector('.c-title'), { trigger: false });
  batchReveal('main [data-reveal]');
  if (reduce) return;
  // Обложку не «раскрываем»: при переходе с главной она уже прилетела общим элементом View Transition.
  gsap.fromTo('.c-cover img', { yPercent: -4, scale: 1.08 }, {
    yPercent: 4, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '.c-cover', start: 'top bottom', end: 'bottom top', scrub: true },
  });
});
