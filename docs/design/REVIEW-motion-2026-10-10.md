# Ревью анимации — portfolio-andrey (2026-10-10)

Только чтение, правки не вносились. Область: `assets/js/{core,home,gl,case}.js`,
`assets/css/{base,home,case}.css`.

Чек-листы: `gsap-performance/SKILL.md`, `genjutsu-motion-principles/SKILL.md`
(Performance Checklist), `emil-design-eng/SKILL.md` (Performance Rules,
Accessibility), `improve-animations/AUDIT.md`. MotionScore/Motion+ недоступен —
не вызывался, оценки не выдуманы.

## Подтверждённое соответствие (не находки)

- `prefers-reduced-motion`: глобальный блок в `base.css:139-146` гасит все
  transition/animation, явные ветки `if (reduce) return` в каждой JS-функции
  core.js/home.js/case.js, WebGL отключается через `canGL()` (home.js:162).
- `prefers-contrast: more` отдельно гасит затемнение текста манифеста
  (home.js:55) — слов. текст не остаётся приглушённым ради моушена.
- `gsap.matchMedia()` в `work()` (home.js:70-96) с `return () => {...}` —
  корректный revert при смене брейкпоинта, `work01` безопасно обнуляется.
- Горячий путь `driveGL/update()` (home.js:223-227) не читает DOM каждый кадр:
  `getBoundingClientRect()` в `build()` вызывается только на старте и на
  событии `ScrollTrigger refresh`, не на каждый скролл-тик — layout thrash в
  `onUpdate` отсутствует.
- WebGL: один `drawArrays(POINTS)` на кадр, DPR зажат в 1.5 (gl.js:183), пауза
  рендера на `visibilitychange` (gl.js:228), gate по `hardwareConcurrency`/
  `webgl2`/`saveData` до динамического импорта модуля.
- Базовые tween'ы (SplitText, batchReveal, ticker xPercent, bars scaleY,
  proc-line scaleX) анимируют только transform/opacity — S-tier.

## Находки

### P1 · Манифест: scrub дерётся с CSS-transition на тех же словах
**Файл:** `assets/js/home.js:58-61` + `assets/css/home.css:44`
GSAP пишет `opacity` каждый кадр скролла (`scrollTrigger:{scrub:true}`), а
`.manifest-text .w{transition:opacity .2s linear}` на каждое это обновление
перезапускает собственный 200мс переход. Второй слой изи поверх уже
интерполированного scrub-значения — слова проявляются с задержкой относительно
фактической позиции прокрутки, вместо честного 1:1.
**Исправить:** убрать `transition` у `.w` (scrub должен писать конечное
значение без дополнительного сглаживания) либо развести класс на «только для
не-scrub использований» (manifesto использует SplitText с тем же `.w`, что и
`splitHeading()` — но там opacity не трогается, только yPercent, так что
удаление transition ничего не сломает).
**Проверить:** DevTools → Animations panel во время скролла манифеста:
сработавших transition-записей на `.w` быть не должно, подсветка слова должна
совпадать с позицией скролла без лага.

### P2 · countUp пишет textContent каждый кадр без дедупликации
**Файл:** `assets/js/core.js:119-127`
`onUpdate: () => { el.textContent = Math.round(o.v); }` — запись в DOM на
каждый тик (~60/с) даже когда округлённое значение не изменилось: лишний
layout+paint на счётчик ради одного и того же числа.
**Исправить:** кэшировать последнее отображённое значение и писать
`textContent` только при реальном изменении:
```js
let shown = -1;
onUpdate: () => { const v = Math.round(o.v); if (v !== shown) { shown = v; el.textContent = v; } }
```
**Проверить:** Performance-трейс на 1.1с анимации счётчика — число записей в
Layout/Recalc Style должно упасть примерно до числа реально разных значений
(обычно < 60).

### P2 · `.dot` анимирует box-shadow, не transform/opacity
**Файл:** `assets/css/home.css:6-7`
`@keyframes ping` крутит `box-shadow` бесконечно (`infinite`) — это paint, а не
compositor-путь, и работает вечно на каждой загрузке страницы, пока вкладка
открыта.
**Исправить:** перенести кольцо на `::after` с `transform:scale()` +
`opacity`, как в стандартном «pulse dot» паттерне:
```css
.dot{position:relative}
.dot::after{content:"";position:absolute;inset:-6px;border-radius:50%;
  border:2px solid var(--ok);animation:ping 2.6s var(--e-out) infinite}
@keyframes ping{0%{transform:scale(.4);opacity:.7}100%{transform:scale(1.6);opacity:0}}
```
**Проверить:** DevTools Rendering → «Paint flashing» — `.dot` не должен
подсвечиваться на каждый кадр анимации.

### P2 · Подчёркивание `.scene-title a` анимирует background-size вместо scaleX
**Файл:** `assets/css/home.css:60`
`transition:background-size .6s var(--e-out)` на hover — тот же эффект
«линия выезжает слева», который в этом же файле уже сделан правильно через
псевдоэлемент и `transform:scaleX()` (`.svc::after` строка 113-115,
`.nav-links a::after` строка 85-88 в base.css). Это единственное место,
застрявшее на paint-варианте — несогласованность внутри одной кодовой базы, а
не просто теоретический риск.
**Исправить:** заменить на `::after{transform:scaleX(0);transform-origin:left;
transition:transform .6s var(--e-out)}` по образцу `.svc::after`.
**Проверить:** Paint flashing при наведении на заголовок кейса в ленте работ —
подсветки быть не должно.

### P2 · Магнит пишет style на каждый pointermove без троттлинга
**Файл:** `assets/js/core.js:85-93`
Два `style.setProperty('--tx'/'--ty', …)` на каждое событие `pointermove`,
без `requestAnimationFrame`-группировки и без `gsap.quickTo()`, который
`gsap-performance` явно рекомендует для часто обновляемых свойств вроде
mouse-follower. На устройствах с высокой частотой опроса (трекпад, игровая
мышь) это лишние синхронные записи стиля чаще частоты кадра экрана.
**Исправить:** либо `gsap.quickTo(b, '--tx', {duration:.3})`-эквивалент через
кэш последнего события + rAF-флаш, либо минимально — писать в `rAF`-колбэке
вместо прямого обработчика:
```js
let px, py, raf;
b.addEventListener('pointermove', (e) => { px = e; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => applyMagnet(b, px)); });
```
**Проверить:** Performance-трейс при активном плавном движении мыши по кнопке
— число Style-пересчётов не должно превышать число кадров rAF.

### P2 · Press-feedback делит transition с магнитным сдвигом — реакция на нажатие медленнее 300мс
**Файлы:** `assets/css/base.css:40-45` (`.btn`), `:93-96` (`.theme-btn`)
`.btn{transition:...,transform 380ms var(--e-out)}` обслуживает одновременно
`--press:.96` (нажатие) и `--tx/--ty` (магнит) — обе анимации идут одной
380мс кривой. По `emil-design-eng`/`improve-animations` чек-листу press
feedback должен быть 100-160мс; здесь он в 2.5-3.8 раза медленнее целевого —
кнопка ощутимо «запаздывает» под пальцем/курсором. `.theme-btn` — та же
история на 300мс.
**Исправить:** развести `transform` на отдельные CSS-свойства
`translate`/`scale` (поддерживаются как самостоятельные anim. свойства),
у каждого свой transition:
```css
.btn{translate:var(--tx) var(--ty);scale:var(--press);
  transition:translate 380ms var(--e-out), scale 150ms var(--e-out), background-color var(--t-ui) var(--e-out), ...}
```
**Проверить:** DevTools Animations panel на клик по `.btn` — переход `scale`
должен завершаться за ~150мс независимо от того, двигалась ли кнопка магнитом.

### P2 · Два постоянных `gsap.ticker.add`-колбэка без выключения вне экрана
**Файл:** `assets/js/home.js:36-49`, вызовы на `:13-14`
`ticker()` вызывается дважды (`.ticker-track`, `.contact-track`), каждый раз
вешая отдельный `gsap.ticker.add` (затухающий буст скорости) и отдельный
`ScrollTrigger.create` только ради `getVelocity()` — оба живут до конца жизни
страницы без привязки к видимости блока. Стоимость на кадр тривиальна
(умножение + `timeScale`), но это два источника работы, которые не гаснут,
даже когда `.ticker`/`.contact-track` давно вне vieport.
**Исправить:** оборачивать подписку в `IntersectionObserver` на `track` и
снимать `gsap.ticker.remove(fn)` когда блок не виден; либо не критично при
текущем масштабе (2 трека, арифметика O(1)) — можно принять как есть.
**Проверить:** `gsap.ticker.sleep? / wake?` нет — факт остановки проверять
через свой флаг в консоли (`console.count` внутри колбэка) при прокрутке мимо
блоков.

### P2 · `gl.js`: нет teardown у `createGL()`
**Файл:** `assets/js/gl.js:220-236`
`resize`/`themechange`/`pointermove`/`visibilitychange`-слушатели и rAF-цикл
навешиваются на `window`/`document` без возврата функции очистки — сегодня не
баг (страница не SPA, повторного импорта модуля не происходит), но это
структурный долг: если `startGL()` когда-либо вызовется повторно (hot-reload,
будущий вариант страницы, повторный `import('./gl.js')`), слушатели
задвоятся без способа их снять.
**Исправить:** возвращать `destroy()` из `createGL()`, снимающий все
addEventListener и делающий `cancelAnimationFrame`.
**Проверить:** не актуально для прод-сценария сейчас; фиксируется как
профилактика, не как активный баг.
