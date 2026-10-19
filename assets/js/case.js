// Сценарий страницы кейса: заголовок по словам сразу, блоки пачками по прокрутке, обложка плывёт медленнее страницы.
import { gsap, reduce, ready, splitHeading, batchReveal, countUp, loopVideos } from './core.js';

ready(() => {
  splitHeading(document.querySelector('.c-title'), { trigger: false });
  batchReveal('main [data-reveal]');
  loopVideos();
  countUp('.c-metrics dt');
  if (reduce) return;
  // обложка следующего кейса раскрывается из карточки тем же языком, что бежевые листы и финал главной;
  // на тач-экранах без анимации: clip-path по прокрутке перерисовывает картинку в каждом кадре
  if (matchMedia('(pointer: fine)').matches) {
    gsap.fromTo('.c-next-shot', { clipPath: 'inset(10% 8% 10% 8% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none',
      scrollTrigger: { trigger: '.c-next', start: 'top 85%', end: 'bottom bottom', scrub: true },
    });
  }
  // Обложку не «раскрываем»: при переходе с главной она уже прилетела общим элементом View Transition.
  gsap.fromTo('.c-cover img', { yPercent: -4, scale: 1.08 }, {
    yPercent: 4, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '.c-cover', start: 'top bottom', end: 'bottom top', scrub: true },
  });
});
