/* Easter egg: a stick figure that shoots the page apart.

   Loaded on demand by the loader at the end of templates/base.html,
   when someone types "boom" or taps the ☺ in the footer. Nothing is
   saved: Esc, the [x] button or a reload brings the page back.

   Controls: ←/→ or A/D run, ↑ or W jump, ↓ or S drop down, the mouse
   aims, click (hold) or Space shoots. On touch screens, tap to shoot.

   How it works: every word on the page is wrapped in a <span> once.
   Bullets are tested against the page with elementFromPoint (the
   canvas overlay has pointer-events: none, so it's skipped). A hit
   element is hidden with visibility: hidden, which keeps the layout
   from shifting, and its letters or image pieces fly off as particles
   drawn on the canvas.

   The tops of words, images and other targets are one-way platforms,
   like in classic platformers: the figure lands on them when falling,
   jumps up through them, and falls once the one under it is shot. It
   lives in viewport coordinates but moves with the page on scroll, and
   the top and bottom of the viewport act as ceiling and floor. */
(function () {
  'use strict';
  if (window.__destroy) { window.__destroy.start(); return; }

  var TARGETS = '.egg-w, img, video, svg, hr, button';
  var SKIP_TEXT = 'script, style, noscript, textarea, svg, canvas, video';
  var HUD_FONT = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  var BULLET_SPEED = 1500;   // px/s
  var FIRE_EVERY = 0.11;     // s between shots while holding
  var GRAVITY = 2200;
  var RUN_ACCEL = 2600, RUN_MAX = 320, RUN_FRICTION = 2200, JUMP = 780;
  var FALL_MAX = 1400;
  var FIGURE_H = 62;   // feet to top of head
  var FOOT = 6;        // half-width of the feet for standing on things
  var STEP = 6;        // how far up it steps onto a slightly higher word
  var MAX_PARTICLES = 2500;

  var active = false, wrapped = false, raf = 0, last = 0;
  var canvas, ctx, styleEl, W = 0, H = 0, dpr = 1;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var colors = {}, colorTimer = 0, hintTimer = 0;
  var player, aim, keys, firing, cooldown, flash, count;
  var bullets = [], particles = [], dead = [], hud = { x: 0, y: 0, w: 0, h: 0 };
  var touchStart = null, posters = {}, solids = [], lastScroll = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Wrap each word of visible text in <span class="egg-w"> so words can
     be hit one by one. Whitespace stays as plain text nodes. */
  function wrapText() {
    if (wrapped) return;
    wrapped = true;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest(SKIP_TEXT)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'egg-w';
        s.textContent = part;
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
  }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fallback) { return cs.getPropertyValue(name).trim() || fallback; }
    colors.fg = v('--fg', '#1c1c1c');
    colors.dim = v('--fg-dim', '#6c6c6c');
    colors.bg = v('--bg', '#f0eee6');
    colors.accent = v('--accent', v('--link', '#4d803a'));
    colors.alt = v('--accent-alt', '#e8a33d');
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (player) {
      player.x = clamp(player.x, 12, W - 12);
      player.y = Math.min(player.y, H - 3);
    }
  }

  /* ---------- breaking things ---------- */

  function addParticle(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
  }

  // Velocity for a particle at (x, y), thrown along the bullet's path
  // and away from the impact point.
  function throwVel(x, y, bx, by, dx, dy) {
    var ox = x - bx, oy = y - by, d = Math.hypot(ox, oy) || 1;
    var push = rand(150, 450);
    return {
      vx: dx * push + (ox / d) * 140 + rand(-220, 220),
      vy: dy * push + (oy / d) * 140 + rand(-380, 60)
    };
  }

  function burstText(el, r, bx, by, dx, dy) {
    var cs = getComputedStyle(el);
    var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var text = el.textContent;
    ctx.font = font;
    var total = ctx.measureText(text).width || r.width;
    var scale = r.width / total;
    var x = r.left, cy = r.top + r.height / 2;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var w = ctx.measureText(ch).width * scale;
      var px = x + w / 2;
      var v = throwVel(px, cy, bx, by, dx, dy);
      addParticle({
        kind: 'char', ch: ch, font: font, color: cs.color,
        x: px + scrollX, y: cy + scrollY, vx: v.vx, vy: v.vy,
        rot: 0, vr: rand(-12, 12), life: rand(1.3, 2.1), age: 0
      });
      x += w;
    }
  }

  function burstImage(el, src, sw0, sh0, r, bx, by, dx, dy) {
    // Copy the picture once at its on-screen size: drawing pieces straight
    // from a <video> (or a large image) every frame is slow, in Firefox
    // down to a few fps.
    var snap = document.createElement('canvas');
    snap.width = Math.max(1, Math.round(r.width * dpr));
    snap.height = Math.max(1, Math.round(r.height * dpr));
    try { snap.getContext('2d').drawImage(src, 0, 0, sw0, sh0, 0, 0, snap.width, snap.height); } catch (e) {}
    src = snap; sw0 = snap.width; sh0 = snap.height;
    var cols = clamp(Math.round(r.width / 60), 3, 12);
    var rows = clamp(Math.round(r.height / 60), 2, 10);
    var w = r.width / cols, h = r.height / rows;
    for (var cy = 0; cy < rows; cy++) {
      for (var cx = 0; cx < cols; cx++) {
        var px = r.left + (cx + 0.5) * w, py = r.top + (cy + 0.5) * h;
        var v = throwVel(px, py, bx, by, dx, dy);
        addParticle({
          kind: 'img', src: src,
          sx: cx * sw0 / cols, sy: cy * sh0 / rows, sw: sw0 / cols, sh: sh0 / rows,
          w: w, h: h, x: px + scrollX, y: py + scrollY, vx: v.vx * 0.8, vy: v.vy * 0.8,
          rot: 0, vr: rand(-5, 5), life: rand(1.8, 2.6), age: 0
        });
      }
    }
  }

  function burstShards(el, r, bx, by, dx, dy) {
    var color = el.tagName === 'HR' ? colors.dim : getComputedStyle(el).color;
    var n = clamp(Math.round(r.width * r.height / 150), 8, 40);
    for (var i = 0; i < n; i++) {
      var px = rand(r.left, r.right), py = rand(r.top, r.bottom);
      var v = throwVel(px, py, bx, by, dx, dy);
      var s = rand(2, 6);
      addParticle({
        kind: 'shard', color: color, w: s, h: s,
        x: px + scrollX, y: py + scrollY, vx: v.vx, vy: v.vy,
        rot: rand(0, 6), vr: rand(-10, 10), life: rand(1, 1.8), age: 0
      });
    }
  }

  function destroy(el, bx, by, dx, dy) {
    if (el.__eggDead) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    el.__eggDead = true;
    dead.push([el, el.style.visibility]);

    var tag = el.tagName;
    if (el.classList.contains('egg-w')) {
      burstText(el, r, bx, by, dx, dy);
    } else if (tag === 'IMG' && el.naturalWidth) {
      burstImage(el, el, el.naturalWidth, el.naturalHeight, r, bx, by, dx, dy);
    } else if (tag === 'VIDEO') {
      try { el.pause(); } catch (e) {}
      var poster = posters[el.poster];
      if (el.readyState >= 2 && el.videoWidth) {
        burstImage(el, el, el.videoWidth, el.videoHeight, r, bx, by, dx, dy);
      } else if (poster && poster.complete && poster.naturalWidth) {
        burstImage(el, poster, poster.naturalWidth, poster.naturalHeight, r, bx, by, dx, dy);
      } else {
        burstShards(el, r, bx, by, dx, dy);
      }
    } else {
      burstShards(el, r, bx, by, dx, dy);
    }
    el.style.visibility = 'hidden';
    count++;
    return true;
  }

  /* ---------- player and bullets ---------- */

  function shoulder() { return { x: player.x, y: player.y - 44 }; }

  function shoot() {
    var s = shoulder();
    var a = Math.atan2(aim.y - s.y, aim.x - s.x);
    var dx = Math.cos(a), dy = Math.sin(a);
    bullets.push({ x: s.x + dx * 36, y: s.y + dy * 36, dx: dx, dy: dy });
    player.recoil = 1;
    flash = 0.06;
  }

  function updateBullets(dt) {
    var travel = BULLET_SPEED * dt;
    var steps = Math.max(1, Math.ceil(travel / 6));
    var step = travel / steps;
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i], gone = false;
      for (var s = 0; s < steps && !gone; s++) {
        b.x += b.dx * step;
        b.y += b.dy * step;
        if (b.x < 0 || b.y < 0 || b.x > W || b.y > H) { gone = true; break; }
        var hit = document.elementFromPoint(b.x, b.y);
        var t = hit && hit.closest && hit.closest(TARGETS);
        if (t && destroy(t, b.x, b.y, b.dx, b.dy)) gone = true;
      }
      if (gone) bullets.splice(i, 1);
    }
  }

  // Highest platform top the feet crossed while moving from prev to y.
  function landing(prev, y, tol) {
    var x1 = player.x - FOOT, x2 = player.x + FOOT, best = null;
    for (var i = 0; i < solids.length; i++) {
      var el = solids[i];
      if (el.__eggDead) continue;
      // One box per line, so a word that wraps (e.g. "drag-and-drop")
      // doesn't become one big box spanning both lines.
      var rects = el.getClientRects();
      for (var j = 0; j < rects.length; j++) {
        var r = rects[j];
        if (r.top < prev - tol || r.top > y || r.right < x1 || r.left > x2) continue;
        if (r.width < 1 || r.height < 1 || r.top <= player.dropBelow) continue;
        if (best === null || r.top < best) best = r.top;
      }
    }
    return best;
  }

  function updatePlayer(dt) {
    var p = player;
    // Move with the page when it scrolls, as if standing on it.
    var d = scrollY - lastScroll;
    lastScroll = scrollY;
    p.y -= d;
    p.dropBelow -= d;

    var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) {
      p.vx = clamp(p.vx + dir * RUN_ACCEL * dt, -RUN_MAX, RUN_MAX);
    } else {
      var f = RUN_FRICTION * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }
    if (keys.jump && p.onGround) {
      p.vy = -JUMP;
      p.onGround = false;
    } else if (keys.drop && p.onGround && !p.onFloor) {
      p.dropBelow = p.y + 1;   // fall through what it stands on
      p.onGround = false;
    }
    var wasOnGround = p.onGround;
    p.vy = Math.min(FALL_MAX, p.vy + GRAVITY * dt);
    p.x = clamp(p.x + p.vx * dt, 12, W - 12);
    var prev = p.y;
    p.y += p.vy * dt;
    p.onGround = p.onFloor = false;

    if (p.vy >= 0) {
      var top = landing(prev, p.y, wasOnGround ? STEP : 0.5);
      if (top !== null) { p.y = top; p.vy = 0; p.onGround = true; }
    }
    if (p.y >= H - 3) { p.y = H - 3; p.vy = 0; p.onGround = p.onFloor = true; }
    if (p.y < FIGURE_H + 4) { p.y = FIGURE_H + 4; if (p.vy < 0) p.vy = 0; }
    if (p.onGround) p.dropBelow = -Infinity;
    p.phase += Math.abs(p.vx) * dt * 0.045;
    p.recoil = Math.max(0, p.recoil - dt * 8);
  }

  function updateParticles(dt) {
    var floor = scrollY + H - 2;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vy += GRAVITY * 0.7 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > floor && p.vy > 0) {
        p.y = floor;
        p.vy *= -0.35;
        p.vx *= 0.7;
        p.vr *= 0.6;
      }
    }
  }

  /* ---------- drawing ---------- */

  function drawParticles() {
    var ox = scrollX, oy = scrollY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var x = p.x - ox, y = p.y - oy;
      if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue;
      ctx.save();
      ctx.globalAlpha = clamp((p.life - p.age) / 0.5, 0, 1);
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      if (p.kind === 'char') {
        ctx.font = p.font;
        ctx.fillStyle = p.color;
        ctx.fillText(p.ch, 0, 0);
      } else if (p.kind === 'img') {
        try { ctx.drawImage(p.src, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h); } catch (e) {}
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }

  function line(x1, y1, x2, y2) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }

  function drawPlayer() {
    var p = player, s = shoulder();
    var hipY = p.y - 26, neckY = p.y - 50, headY = p.y - 58;
    var a = Math.atan2(aim.y - s.y, aim.x - s.x);
    var dx = Math.cos(a), dy = Math.sin(a);

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(p.x, headY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    line(p.x, neckY, p.x, hipY);
    // Legs stand apart, swing while running, and spread in the air.
    var run = Math.min(1, Math.abs(p.vx) / 200);
    var swing = p.onGround ? 0.22 * (1 - run) + Math.sin(p.phase) * 0.55 * run : 0.4;
    line(p.x, hipY, p.x + Math.sin(swing) * 26, hipY + Math.cos(swing) * 26);
    line(p.x, hipY, p.x - Math.sin(swing) * 26, hipY + Math.cos(swing) * 26);
    // Both arms hold the gun, which points at the cursor.
    var reach = 20 - p.recoil * 6;
    var hx = s.x + dx * reach, hy = s.y + dy * reach;
    line(s.x, s.y, hx, hy);
    line(s.x, s.y, hx - dx * 4 - dy * 4, hy - dy * 4 + dx * 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.fg;
    line(hx, hy, hx + dx * 14, hy + dy * 14);
    ctx.stroke();

    if (flash > 0) {
      ctx.beginPath();
      ctx.fillStyle = colors.alt;
      ctx.arc(hx + dx * 18, hy + dy * 18, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBullets() {
    ctx.beginPath();
    ctx.strokeStyle = colors.alt;
    ctx.lineWidth = 2;
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      line(b.x - b.dx * 12, b.y - b.dy * 12, b.x, b.y);
    }
    ctx.stroke();
  }

  function drawHud() {
    var text = '[x] quit  ·  destroyed: ' + count;
    ctx.font = HUD_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    hud = { x: 12, y: 12, w: ctx.measureText(text).width + 20, h: 28 };
    ctx.fillStyle = colors.bg;
    ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(hud.x + 0.5, hud.y + 0.5, hud.w - 1, hud.h - 1);
    ctx.fillStyle = colors.fg;
    ctx.fillText(text, hud.x + 10, hud.y + hud.h / 2);

    if (hintTimer > 0) {
      var hint = coarse
        ? 'tap to shoot'
        : '←→ / A D run  ·  ↑ / W jump  ·  ↓ / S drop  ·  mouse aims  ·  click / space shoots  ·  Esc quits';
      ctx.globalAlpha = clamp(hintTimer, 0, 1);
      ctx.fillStyle = colors.bg;
      ctx.fillRect(hud.x, hud.y + hud.h + 4, ctx.measureText(hint).width + 20, 24);
      ctx.fillStyle = colors.dim;
      ctx.fillText(hint, hud.x + 10, hud.y + hud.h + 16);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    colorTimer -= dt;
    if (colorTimer <= 0) { readColors(); colorTimer = 1; }
    hintTimer = Math.max(0, hintTimer - dt);
    flash = Math.max(0, flash - dt);
    cooldown -= dt;
    if ((firing || keys.fire) && cooldown <= 0) { shoot(); cooldown = FIRE_EVERY; }

    updatePlayer(dt);
    updateBullets(dt);
    updateParticles(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawParticles();
    drawBullets();
    drawPlayer();
    drawHud();

    raf = requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */

  var KEYMAP = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump',
    ArrowDown: 'drop', s: 'drop', S: 'drop',
    ' ': 'fire'
  };

  function inHud(x, y) {
    return x >= hud.x && x <= hud.x + hud.w && y >= hud.y && y <= hud.y + hud.h;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); stop(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = KEYMAP[e.key];
    if (k) { keys[k] = true; e.preventDefault(); e.stopPropagation(); }
  }

  function onKeyUp(e) {
    var k = KEYMAP[e.key];
    if (k) keys[k] = false;
  }

  function onPointerMove(e) {
    if (e.pointerType === 'mouse') { aim.x = e.clientX; aim.y = e.clientY; }
  }

  function onPointerDown(e) {
    if (inHud(e.clientX, e.clientY)) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      aim.x = e.clientX; aim.y = e.clientY;
      firing = true;
      if (cooldown <= 0) { shoot(); cooldown = FIRE_EVERY; }
      e.preventDefault();
    } else {
      touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    }
  }

  function onPointerUp(e) {
    if (e.pointerType === 'mouse') { firing = false; return; }
    // A short tap shoots; a drag is left alone so the page still scrolls.
    var t = touchStart;
    touchStart = null;
    if (!t || inHud(e.clientX, e.clientY)) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10 && performance.now() - t.t < 400) {
      aim.x = e.clientX; aim.y = e.clientY;
      shoot();
    }
  }

  // Swallow clicks so links and buttons don't fire mid-game. The HUD's
  // [x] is handled here too, so the click that quits can't land on a link.
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (inHud(e.clientX, e.clientY)) stop();
  }

  function onBlur() { keys = {}; firing = false; }
  function prevent(e) { e.preventDefault(); }

  var LISTENERS = [
    ['keydown', onKeyDown], ['keyup', onKeyUp],
    ['pointermove', onPointerMove], ['pointerdown', onPointerDown],
    ['pointerup', onPointerUp], ['pointercancel', onPointerUp],
    ['click', onClick], ['dragstart', prevent], ['blur', onBlur], ['resize', resize]
  ];

  /* ---------- start / stop ---------- */

  function start() {
    if (active) return;
    active = true;
    wrapText();
    readColors();

    // Preload video posters so a video that hasn't played can still shatter.
    document.querySelectorAll('video[poster]').forEach(function (v) {
      if (!posters[v.poster]) { var i = new Image(); i.src = v.poster; posters[v.poster] = i; }
    });

    styleEl = document.createElement('style');
    styleEl.textContent =
      'html.egg-on, html.egg-on * { cursor: crosshair !important; user-select: none !important; -webkit-user-select: none !important; }';
    document.head.appendChild(styleEl);
    document.documentElement.classList.add('egg-on');

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();

    solids = Array.prototype.slice.call(document.querySelectorAll(TARGETS));
    lastScroll = scrollY;
    player = {
      x: coarse ? W / 2 : W * 0.2, y: H - 3, vx: 0, vy: 0,
      onGround: true, onFloor: true, dropBelow: -Infinity, phase: 0, recoil: 0
    };
    aim = { x: W * 0.75, y: H * 0.4 };
    keys = {};
    firing = false;
    cooldown = 0;
    flash = 0;
    count = 0;
    hintTimer = 6;
    colorTimer = 1;

    LISTENERS.forEach(function (l) { window.addEventListener(l[0], l[1], true); });
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    LISTENERS.forEach(function (l) { window.removeEventListener(l[0], l[1], true); });
    canvas.remove();
    styleEl.remove();
    document.documentElement.classList.remove('egg-on');
    dead.forEach(function (d) { d[0].style.visibility = d[1]; d[0].__eggDead = false; });
    dead = [];
    bullets = [];
    particles = [];
    solids = [];
    touchStart = null;
  }

  window.__destroy = { start: start, stop: stop };
  start();
})();
