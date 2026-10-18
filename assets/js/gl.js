// Облако частиц на чистом WebGL2: одна система, много форм.
// Формы рисуются на скрытом 2D-холсте и выбираются точками; шейдер перетекает между двумя
// соседними формами по фазе прокрутки. Библиотек нет: Three.js стоил бы 195 КБ gzip ради
// одного вызова drawArrays(POINTS).

// Порядок форм в атрибутах: 0 «АБ», 1 пыль, 2 форма с номером, 3 облака чата, 4 стеновые панели,
// 5 окно браузера (сайт andrianov-agency.ru).
export const SHAPES = 6;

const VERT = `#version 300 es
in vec2 aP0; in vec2 aP1; in vec2 aP2; in vec2 aP3; in vec2 aP4; in vec2 aP5; in vec4 aR;
uniform float uFrom, uTo, uMix, uTime, uAspect, uSize, uDpr, uMouseOn;
uniform vec3 uAnchor[6];
uniform float uAlpha[6];
uniform vec2 uMouse;
uniform vec3 uPulse;
uniform vec3 uColA, uColB;
out float vA; out vec3 vC;
vec2 shape(float i){
  vec2 p = i < .5 ? aP0 : i < 1.5 ? aP1 : i < 2.5 ? aP2 : i < 3.5 ? aP3 : i < 4.5 ? aP4 : aP5;
  vec3 a = uAnchor[int(i + .5)];
  return a.xy + p * a.z;
}
void main(){
  float d = aR.w * .35;
  float t = clamp((uMix - d) / .65, 0., 1.);
  t = t * t * (3. - 2. * t);
  vec2 a = shape(uFrom), b = shape(uTo);
  vec2 p = mix(a, b, t);
  // перелёт по дуге: каждая точка уходит вбок на свою величину и возвращается к цели
  vec2 dir = normalize(b - a + 1e-5);
  p += vec2(-dir.y, dir.x) * sin(t * 3.14159) * (aR.x - .5) * .55;
  // дыхание на месте; пыль дрейфует заметнее
  float dust = (uFrom == 1. ? 1. - t : 0.) + (uTo == 1. ? t : 0.);
  float tt = uTime * .35;
  p += vec2(sin(tt * (.6 + aR.y) + aR.z * 6.283), cos(tt * (.5 + aR.x) + aR.y * 6.283)) * (.004 + .01 * aR.z + .05 * dust);
  // курсор раздвигает и закручивает точки, рядом с ним они загораются акцентом
  vec2 m = p - uMouse;
  vec2 nm = normalize(m + 1e-5);
  float f = uMouseOn * smoothstep(.46, 0., length(m));
  p += nm * f * .17 + vec2(-nm.y, nm.x) * f * .06;
  // клик или касание: волна от точки нажатия
  vec2 q = p - uPulse.xy;
  float w = uPulse.z * smoothstep(.9, 0., length(q));
  p += normalize(q + 1e-5) * w * .22;
  gl_Position = vec4(p.x / uAspect, p.y, 0., 1.);
  gl_PointSize = uSize * uDpr * (.55 + aR.y * .9) * (1. + f * .5);
  vA = mix(uAlpha[int(uFrom + .5)], uAlpha[int(uTo + .5)], t) * (.45 + .55 * aR.z) * (1. + f * .9 + w);
  vC = mix(mix(uColA, uColB, step(.9, aR.x)), uColB, min(1., f * 1.4 + w));
}`;

const FRAG = `#version 300 es
precision mediump float;
in float vA; in vec3 vC; out vec4 o;
void main(){
  float a = smoothstep(.5, .12, length(gl_PointCoord - .5)) * vA;
  if (a < .01) discard;
  o = vec4(vC * a, a);
}`;

/* ── формы: рисуем белым на чёрном в квадрате 100×100 условных единиц ── */
function drawAB(ctx) {
  ctx.font = 'italic 500 66px Playfair, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('АБ', 50, 54);
}
function drawJersey(ctx) {
  ctx.beginPath();
  ctx.moveTo(34, 8); ctx.bezierCurveTo(40, 15, 60, 15, 66, 8);
  ctx.lineTo(82, 13); ctx.lineTo(97, 32); ctx.lineTo(86, 43); ctx.lineTo(78, 36);
  ctx.lineTo(78, 94); ctx.lineTo(22, 94); ctx.lineTo(22, 36); ctx.lineTo(14, 43);
  ctx.lineTo(3, 32); ctx.lineTo(18, 13); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.font = '700 40px Onest, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('7', 50, 60);
}
function drawChat(ctx) {
  ctx.beginPath(); ctx.roundRect(4, 10, 66, 42, 11); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, 50); ctx.lineTo(28, 50); ctx.lineTo(9, 63); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.roundRect(32, 58, 64, 30, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(78, 86); ctx.lineTo(90, 86); ctx.lineTo(95, 97); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (const x of [24, 37, 50]) { ctx.beginPath(); ctx.arc(x, 31, 4.2, 0, Math.PI * 2); ctx.fill(); }
}
function drawWall(ctx) {
  // угол комнаты в одноточечной перспективе: вертикальные рейки остаются вертикальными
  const slats = (x0, x1, top0, top1, bot0, bot1, n, curve) => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, top0); ctx.lineTo(x1, top1); ctx.lineTo(x1, bot1); ctx.lineTo(x0, bot0); ctx.closePath(); ctx.clip();
    for (let i = 0; i < n; i++) {
      const u = Math.pow(i / n, curve), u2 = Math.pow((i + .62) / n, curve);
      ctx.fillRect(x0 + (x1 - x0) * u, 0, (x1 - x0) * (u2 - u), 100);
    }
    ctx.restore();
  };
  slats(3, 31, 4, 22, 96, 78, 9, .75);
  slats(31, 69, 22, 22, 78, 78, 12, 1);
  slats(97, 69, 4, 22, 96, 78, 9, .75);
}

function drawBrowser(ctx) {
  // окно сайта: рамка, строка адреса, крупный заголовок, кнопка и три карточки услуг
  const frame = () => { ctx.beginPath(); ctx.roundRect(4, 12, 92, 76, 6); };
  frame(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.roundRect(7, 21, 86, 64, 3); ctx.fill();
  for (const x of [10, 15, 20]) { ctx.beginPath(); ctx.arc(x, 16.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(12, 28, 46, 6); ctx.fillRect(12, 37, 34, 6);           // заголовок в две строки
  ctx.fillRect(12, 47, 30, 1.6); ctx.fillRect(12, 50.5, 26, 1.6);     // подзаголовок
  ctx.beginPath(); ctx.roundRect(12, 56, 18, 6, 3); ctx.fill();        // кнопка
  ctx.beginPath(); ctx.roundRect(64, 26, 24, 38, 3); ctx.fill();       // портрет
  for (const x of [12, 38, 64]) { ctx.beginPath(); ctx.roundRect(x, 69, 24, 13, 2); ctx.fill(); }
}

function sample(draw, n, edgeShare) {
  const S = 360, k = S / 100;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.scale(k, k);
  draw(ctx);
  const px = ctx.getImageData(0, 0, S, S).data;
  const fill = [], edge = [];
  const on = (x, y) => x >= 0 && y >= 0 && x < S && y < S && px[(y * S + x) * 4 + 3] > 127;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!on(x, y)) continue;
    const i = y * S + x;
    fill.push(i);
    if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) edge.push(i);
  }
  const out = new Float32Array(n * 2);
  if (!fill.length) return out;
  for (let j = 0; j < n; j++) {
    const pool = edge.length && Math.random() < edgeShare ? edge : fill;
    const i = pool[(Math.random() * pool.length) | 0];
    out[j * 2] = (((i % S) + Math.random()) / S) * 2 - 1;
    out[j * 2 + 1] = 1 - (((i / S | 0) + Math.random()) / S) * 2;
  }
  return out;
}
function dust(n, aspect) {
  const out = new Float32Array(n * 2), w = aspect + .15;
  for (let j = 0; j < n; j++) { out[j * 2] = (Math.random() * 2 - 1) * w; out[j * 2 + 1] = (Math.random() * 2 - 1) * 1.12; }
  return out;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const hex = (v) => { const n = parseInt(v.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{count:number, layout:(aspect:number)=>{anchors:number[][], alphas:number[], size:number}}} opts
 */
export function createGL(canvas, { count, layout }) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const U = {};
  ['uFrom', 'uTo', 'uMix', 'uTime', 'uAspect', 'uSize', 'uDpr', 'uMouseOn', 'uAnchor', 'uAlpha', 'uMouse', 'uPulse', 'uColA', 'uColB']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = (name, data, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  let aspect = innerWidth / innerHeight;
  buf('aP0', sample(drawAB, count, .45), 2);
  const dustBuf = buf('aP1', dust(count, aspect), 2);
  buf('aP2', sample(drawJersey, count, .4), 2);
  buf('aP3', sample(drawChat, count, .4), 2);
  buf('aP4', sample(drawWall, count, .25), 2);
  buf('aP5', sample(drawBrowser, count, .35), 2);
  const r = new Float32Array(count * 4);
  for (let i = 0; i < r.length; i++) r[i] = Math.random();
  buf('aR', r, 4);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const state = { from: 0, to: 0, mix: 0, mx: 9, my: 9, tx: 9, ty: 9, px: 9, py: 9, pulse: 0, running: false, raf: 0, t0: performance.now() };
  let dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = innerWidth, h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const a = w / h;
    if (Math.abs(a - aspect) > .2) {   // пыль должна покрывать новую ширину экрана
      gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
      gl.bufferData(gl.ARRAY_BUFFER, dust(count, a), gl.STATIC_DRAW);
    }
    aspect = a;
    const L = layout(aspect);
    gl.uniform3fv(U.uAnchor, L.anchors.flat());
    gl.uniform1fv(U.uAlpha, L.alphas);
    gl.uniform1f(U.uSize, L.size);
    gl.uniform1f(U.uAspect, aspect);
    gl.uniform1f(U.uDpr, dpr);
  }
  function theme() {
    const cs = getComputedStyle(document.documentElement);
    gl.uniform3fv(U.uColA, hex(cs.getPropertyValue('--fg').trim() || '#EFE8DD'));
    gl.uniform3fv(U.uColB, hex(cs.getPropertyValue('--accent').trim() || '#FF5B2E'));
  }
  function frame(now) {
    state.raf = requestAnimationFrame(frame);
    state.mx += (state.tx - state.mx) * .08;
    state.my += (state.ty - state.my) * .08;
    gl.uniform1f(U.uTime, (now - state.t0) / 1000);
    gl.uniform1f(U.uFrom, state.from);
    gl.uniform1f(U.uTo, state.to);
    gl.uniform1f(U.uMix, state.mix);
    gl.uniform2f(U.uMouse, state.mx, state.my);
    state.pulse *= .94;
    gl.uniform3f(U.uPulse, state.px, state.py, state.pulse);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
  }
  const start = () => { if (!state.running) { state.running = true; state.raf = requestAnimationFrame(frame); } };
  const stop = () => { state.running = false; cancelAnimationFrame(state.raf); };

  resize(); theme();
  gl.uniform1f(U.uMouseOn, matchMedia('(pointer: fine)').matches ? 1 : 0);
  addEventListener('resize', resize, { passive: true });
  addEventListener('themechange', theme);
  addEventListener('pointermove', (e) => {
    state.tx = (e.clientX / innerWidth * 2 - 1) * aspect;
    state.ty = 1 - e.clientY / innerHeight * 2;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    state.px = (e.clientX / innerWidth * 2 - 1) * aspect;
    state.py = 1 - e.clientY / innerHeight * 2;
    state.pulse = 1;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  return {
    /** Фаза между двумя формами: from/to — номера форм, mix — 0…1. */
    set(from, to, mix) { state.from = from; state.to = to; state.mix = mix; },
    resize,
  };
}
