// 장면 그림 넣기
(function () {
  var art = window.SCENE_ART || {};
  Object.keys(art).forEach(function (id) {
    var scene = document.getElementById(id);
    if (scene) scene.insertAdjacentHTML('afterbegin', art[id]);
  });
})();


// 1. 스크롤 고정
(function () {
  'use strict';

  var LEN = 1600;
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-lock]')).map(function (el) {
    return { el: el, p: 0, len: parseFloat(el.getAttribute('data-lock')) || LEN };
  });
  if (!scenes.length) return;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function center(r) { var vh = window.innerHeight; return Math.max(0, (vh - r.height) / 2); }

  window.sceneLock = function (el) {
    for (var i = 0; i < scenes.length; i++) if (scenes[i].el === el) return scenes[i].p;
    return null;
  };
  function notify() { window.dispatchEvent(new Event('scenelock')); }
  window.sceneLockSet = function (el, p) {
    for (var i = 0; i < scenes.length; i++) if (scenes[i].el === el) scenes[i].p = clamp(p);
  };

  window.lockTimeline = function (el, end, draw) {
    if (!el.hasAttribute('data-lock')) return false;
    var cur = -1, last = 0, raf = 0;
    function tick(now) {
      raf = 0;
      var p = window.sceneLock(el), goal = p <= 0 ? -1 : Math.min(1, p / 0.9) * end;
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      var speed = end / 700 * dt;
      if (Math.abs(goal - cur) <= speed) cur = goal; else cur += goal > cur ? speed : -speed;
      draw(cur);
      if (cur !== goal) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener('scenelock', kick);
    draw(-1);
    return true;
  };

  // 휠/터치 한 번의 이동량 dy 를 장면이 가져갈지 결정
  function take(dy) {
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i], r = s.el.getBoundingClientRect(), t = center(r);
      var down = dy > 0 && s.p < 1 && r.top <= t + 1 && r.top > t - r.height * 0.5;
      var up = dy < 0 && s.p > 0 && r.top >= t - 1 && r.top < t + r.height * 0.5;
      if (down || up) {
        if (Math.abs(r.top - t) > 0.5) window.scrollBy(0, r.top - t);
        s.p = clamp(s.p + dy / s.len);
        notify();
        return true;
      }
    }
    return false;
  }

  window.addEventListener('wheel', function (e) {
    var dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    if (take(dy)) e.preventDefault();
  }, { passive: false });

  var ty = null;
  window.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (ty === null) return;
    var y = e.touches[0].clientY, dy = (ty - y) * 1.5;
    ty = y;
    if (take(dy)) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    var map = { ArrowDown: 80, ArrowUp: -80, PageDown: 400, PageUp: -400, ' ': e.shiftKey ? -400 : 400 };
    if (!(e.key in map) || /input|textarea/i.test(e.target.tagName)) return;
    if (take(map[e.key])) e.preventDefault();
  });

  // 스크롤바를 끌어서 건너뛴 경우: 위치로 진행도를 맞춤
  window.addEventListener('scroll', function () {
    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect(), t = center(r);
      if (r.top > t + r.height * 0.5 && s.p !== 0) { s.p = 0; notify(); }
      else if (r.top < t - r.height * 0.5 && s.p !== 1) { s.p = 1; notify(); }
    });
  }, { passive: true });
})();


// 2. 초대장
(function () {
  'use strict';

  var EX = 137, EY = 77, ESX = 1647 / 1673, ESY = 925 / 940;
  var T_BOX = [50, 177, 1573, 580];
  // 봉투 속 티켓 자리 -> 마지막 자리
  var START = [EX + 243 * ESX, EY + 166 * ESY, 1186 * ESX, 469 * ESY];
  var FS = 1401 / 1673;
  var END = [260 + 50 * FS, 146 + 177 * (787 / 940), 1573 * FS, 580 * (787 / 940)];
  var LIFT = 170, ENV_DROP1 = 180, ENV_DROP2 = 300;
  var P1 = 950, P2 = 1900;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function boxMatrix(b) {
    var sx = b[2] / T_BOX[2], sy = b[3] / T_BOX[3];
    return 'matrix(' + sx.toFixed(5) + ' 0 0 ' + sy.toFixed(5) + ' ' + (b[0] - T_BOX[0] * sx).toFixed(2) + ' ' + (b[1] - T_BOX[1] * sy).toFixed(2) + ')';
  }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    var full = $('.iv-full'), env = $('.iv-env'), ticket = $('.iv-ticket'), tm = $('.iv-ticket-m');
    var shade = $('.iv-shade'), veil = $('.iv-veil'), veilEnv = $('.iv-veil-env'), vm = $('.iv-veil-m'), hint = $('.iv-hint'), hit = $('.iv-hit');
    var opened = false, t0 = 0;

    function draw(t) {
      var d1 = easeInOut(seg(t, 0, P1)), d2 = easeInOut(seg(t, P1 - 200, P2));
      var envDy = ENV_DROP1 * d1 + (ENV_DROP2 - ENV_DROP1) * d2;
      var es = 1 - 0.12 * d2;
      env.setAttribute('transform', 'translate(0 ' + envDy.toFixed(2) + ') translate(960 600) scale(' + es.toFixed(4) + ') translate(-960 -600)');
      env.setAttribute('opacity', (t < 0 ? 0 : 1 - easeOut(seg(t, P1 - 200, P2 - 100))).toFixed(3));
      var up = easeOut(seg(t, 0, P1)), k = easeInOut(seg(t, P1 - 80, P2));
      var b = [lerp(START[0], END[0], k), lerp(START[1] - LIFT * up, END[1], k), lerp(START[2], END[2], k), lerp(START[3], END[3], k)];
      var rot = Math.sin(Math.PI * seg(t, 0, P2)) * -2.2;
      var cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
      var M = boxMatrix(b), R = 'rotate(' + rot.toFixed(2) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')';
      tm.setAttribute('transform', R + ' ' + M);
      ticket.setAttribute('opacity', t < 0 ? '0' : '1');
      shade.setAttribute('opacity', t < 0 ? '0' : (1 * up).toFixed(3));
      shade.setAttribute('transform', 'translate(0 ' + (30 * up).toFixed(1) + ')');
      veilEnv.setAttribute('transform', 'translate(0 ' + envDy.toFixed(2) + ')');
      vm.setAttribute('transform', 'translate(0 ' + (-envDy).toFixed(2) + ') ' + R + ' ' + M);
      veil.setAttribute('opacity', t < 0 ? '0' : (1 - seg(t, P1 - 160, P1)).toFixed(3));
      full.setAttribute('opacity', (1 - seg(t, 0, 90)).toFixed(3));
      if (t < 0) hint.style.opacity = ''; else hint.style.opacity = (0.75 * (1 - seg(t, 0, 250))).toFixed(3);
    }
    var hit2 = $('.iv-hit2'), hint2 = $('.iv-hint2'), entering = false;
    function ready() {
      hit2.setAttribute('data-off', '0'); hit2.setAttribute('tabindex', '0');
      hint2.setAttribute('opacity', '1'); hint2.classList.add('pulse');
    }
    function enter() {
      if (entering) return;
      entering = true;
      var next = document.getElementById('frame-03');
      if (reduce || !next || !document.body.animate) { if (next) next.scrollIntoView(); entering = false; return; }
      var img = tm.querySelectorAll('image'); img = img[img.length - 1];
      var r = img.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      // 화면 위에 같은 초대장을 HTML 로 띄워서 3D 로 뒤집는다
      var ov = document.createElement('div'); ov.className = 'iv-flip';
      ov.innerHTML = '<div class="iv-flip-stage"><div class="iv-flip-card">' +
        '<img class="iv-flip-front" src="images/img-02.png" alt="">' +
        '<img class="iv-flip-back" src="images/img-02-back.png" alt=""></div></div>';
      document.body.appendChild(ov);
      var stage = ov.firstChild, card = stage.firstChild;
      var BACK_POS = 'left:-4.57%;top:-4.34%;width:109.1%;height:109.1%';
      card.lastChild.style.cssText = BACK_POS;
      stage.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
      ticket.setAttribute('opacity', '0'); hint2.setAttribute('opacity', '0'); hint2.classList.remove('pulse');
      var dx = vw / 2 - (r.left + r.width / 2), dy = vh / 2 - (r.top + r.height / 2);
      var sc = Math.min(1.2, vw * 0.78 / (r.width * 0.94));
      var hold = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')';
      stage.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: hold }],
        { duration: 650, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' });
      var P = 'perspective(' + Math.round(r.width * 2.4) + 'px) ';
      var flip = card.animate([
        { transform: P + 'rotateY(0deg) scale(1)' },
        { offset: 0.5, transform: P + 'rotateY(-90deg) scale(1.06)' },
        { transform: P + 'rotateY(-180deg) scale(1)' }
      ], { duration: 900, delay: 600, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' });
      flip.onfinish = function () {
        // 뒷면이 가운데 멈추면 절취선을 따라 아래로 드래그해서 끊는다
        ov.classList.add('is-wait');
        var X = 69.8;

        var pts = [], k = 0;
        for (var y = 0; y <= 100.01; y += 1.6, k++) pts.push((X + (k % 2 ? 0.25 : -0.25)).toFixed(2) + '% ' + Math.min(100, y).toFixed(2) + '%');
        card.remove();
        function half(clip) {
          var h = document.createElement('img'); h.className = 'iv-tear'; h.src = 'images/img-02-back.png'; h.alt = ''; h.draggable = false;
          h.style.cssText = BACK_POS; h.style.clipPath = clip; h.style.webkitClipPath = clip;
          h.style.transformOrigin = X + '% 96%'; stage.appendChild(h); return h;
        }
        var L = half('polygon(0 0,' + pts.join(',') + ',0 100%)');
        var R = half('polygon(100% 0,' + pts.join(',') + ',100% 100%)');
        var b = L.getBoundingClientRect();
        var top = b.top + b.height * 0.178, H = b.height * 0.635, lineX = b.left + b.width * X / 100;
        var tip = document.createElement('div'); tip.className = 'iv-flip-hint'; tip.textContent = '절취선을 따라 아래로 드래그해서 끊기';
        var fs = hint2.ownerSVGElement.getScreenCTM().a;
        tip.style.fontSize = (22 * fs).toFixed(1) + 'px'; tip.style.letterSpacing = fs.toFixed(2) + 'px';
        tip.style.top = Math.min(vh - 48, top + H + 32) + 'px';
        var guide = document.createElement('div'); guide.className = 'iv-tear-guide';
        guide.style.left = lineX + 'px'; guide.style.top = top + 'px';
        tip.style.opacity = '0'; guide.style.opacity = '0';
        ov.appendChild(tip); ov.appendChild(guide);
        setTimeout(function () { tip.style.transition = guide.style.transition = 'opacity .5s'; tip.style.opacity = ''; guide.style.opacity = ''; }, 350);

        var prog = 0, startY = null, downX = 0, done = false;
        var DIST = Math.max(140, H * 0.5);
        ov.addEventListener('dragstart', function (e) { e.preventDefault(); });
        function pose(t) {
          prog = t;
          L.style.transform = 'rotate(' + (-3 * t) + 'deg)';
          R.style.transform = 'rotate(' + (7 * t) + 'deg)';
          guide.style.top = (top + H * t) + 'px';
        }
        function noScroll(e) { e.preventDefault(); }
        ov.addEventListener('wheel', noScroll, { passive: false });
        ov.addEventListener('touchmove', noScroll, { passive: false });
        ov.addEventListener('pointerdown', function (e) {
          if (done) return;
          e.preventDefault();
          downX = e.clientX; startY = e.clientY - prog * DIST; ov.classList.add('is-drag'); guide.classList.add('is-on');
          try { ov.setPointerCapture(e.pointerId); } catch (err) {}
        });
        ov.addEventListener('pointermove', function (e) {
          if (done || startY === null) return;
          var d = Math.max(e.clientY - startY, Math.abs(e.clientX - downX));
          var t = Math.max(0, Math.min(1, d / DIST));
          pose(Math.max(t, prog * 0.98));
          if (prog >= 0.75) rip();
        });
        function release() {
          if (done || startY === null) return;
          startY = null; ov.classList.remove('is-drag'); guide.classList.remove('is-on');
          if (prog > 0.3) { rip(); return; }
          // 덜 찢었으면 다시 붙는다
          var from = prog, t0 = performance.now();
          (function back(now) {
            var q = Math.min(1, (now - t0) / 300);
            pose(from * Math.pow(1 - q, 3));
            if (q < 1 && startY === null) requestAnimationFrame(back);
          })(t0);
        }
        ov.addEventListener('pointerup', release);
        ov.addEventListener('pointercancel', release);
        function rip() {
          // 위에서 아래로 빠르게 찢어진 뒤 양쪽으로 갈라짐
          done = true; var from = prog, t0 = performance.now();
          ov.classList.remove('is-wait', 'is-drag'); tip.remove(); guide.remove();
          (function go(now) {
            var q = Math.min(1, (now - t0) / 320);
            pose(from + (1 - from) * (1 - Math.pow(1 - q, 2)));
            if (q < 1) requestAnimationFrame(go); else tear(L, R, 1);
          })(t0);
        }
      };
      function tear(L, R, t) {
        var la = -3 * t, ra = 7 * t;
        var opt = { duration: 3000, easing: 'linear', fill: 'forwards' };
        var spread = 'cubic-bezier(.2,.7,.3,1)', away = 'cubic-bezier(.5,0,.5,1)';
        L.animate([
          { transform: 'translateX(0) rotate(' + la + 'deg)', easing: spread },
          { offset: 0.18, transform: 'translateX(-70px) rotate(-2deg)', easing: away },
          { transform: 'translateX(' + (-vw) + 'px) rotate(-4deg)' }
        ], opt);
        R.animate([
          { transform: 'translateX(0) rotate(' + ra + 'deg)', easing: spread },
          { offset: 0.18, transform: 'translateX(70px) rotate(6deg)', easing: away },
          { transform: 'translateX(' + vw + 'px) rotate(8deg)' }
        ], opt).onfinish = function () {
            ov.remove(); ticket.setAttribute('opacity', '1'); hint2.setAttribute('opacity', '1'); hint2.classList.add('pulse');
            entering = false;
        };
        setTimeout(function () { next.scrollIntoView({ block: 'start' }); }, 60);
      }
    }
    hit2.addEventListener('click', function () { if (hit2.getAttribute('data-off') !== '1') enter(); });
    hit2.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } });

    function open() {
      if (opened) return;
      opened = true; hit.setAttribute('data-off', '1'); hint.classList.remove('pulse');
      if (reduce) { draw(P2); ready(); return; }
      t0 = performance.now();
      (function step(now) { var t = now - t0; draw(t); if (t < P2 + 30) requestAnimationFrame(step); else ready(); })(t0);
    }
    draw(-1);
    hint.classList.add('pulse');
    hit.addEventListener('click', open);
    hit.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  document.querySelectorAll('.intro-scene').forEach(setup);
})();


// 3. 체크 / 도장 / 다시 판단
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DRAW_MS = 240;

  var answers = { A: {}, B: {} };

  // 펜으로 체크 긋기
  function drawPen(option) {
    var pen = option.querySelector('.cq-pen');
    if (!pen || reduce || !pen.getTotalLength) return;
    var len = pen.getTotalLength();
    pen.setAttribute('stroke-dasharray', len.toFixed(2));
    pen.setAttribute('stroke-dashoffset', len.toFixed(2));
    var start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / DRAW_MS);
      var e = 1 - Math.pow(1 - t, 2.2);
      pen.setAttribute('stroke-dashoffset', (len * (1 - e)).toFixed(2));
      if (t < 1) requestAnimationFrame(step);
      else { pen.removeAttribute('stroke-dasharray'); pen.removeAttribute('stroke-dashoffset'); }
    })(start);
  }

  // 도장
  function stamp(el) {
    el.classList.remove('is-stamped');
    void el.getBoundingClientRect();
    el.classList.add('is-stamped');
  }
  function unstamp(el) { el.classList.remove('is-stamped'); }

  // 질문 하나에 체크 표시
  function mark(question, value, animate) {
    var options = question.querySelectorAll('.cq-option');
    for (var i = 0; i < options.length; i++) {
      var on = options[i].getAttribute('data-value') === value;
      var was = options[i].getAttribute('aria-checked') === 'true';
      options[i].setAttribute('aria-checked', on ? 'true' : 'false');
      if (on && !was && animate) drawPen(options[i]);
    }
    question.setAttribute('data-answer', value);
  }

  function updateRejudge(caseId, replay) {
    var first = answers[caseId][1] || null;
    var now = answers[caseId][2] || null;
    var scenes = document.querySelectorAll('.rejudge-scene[data-case="' + caseId + '"]');
    for (var s = 0; s < scenes.length; s++) {
      var scene = scenes[s];
      // 도장: 첫 답이 있어야 비교 가능
      var variant = (first && now) ? (first === now ? 'kept' : 'changed') : null;
      var stamps = scene.querySelectorAll('.cq-stamp');
      for (var k = 0; k < stamps.length; k++) {
        if (stamps[k].getAttribute('data-variant') === variant) {
          if (replay || !stamps[k].classList.contains('is-stamped')) stamp(stamps[k]);
        } else unstamp(stamps[k]);
      }
      // Before / After
      setSlot(scene, 'first', now ? (first || 'none') : null);
      setSlot(scene, 'now', now);
      // 해설: 다시 판단하면 (답이 같아도) 공개
      scene.classList.toggle('is-revealed', !!now);
    }
  }
  function setSlot(scene, slot, value) {
    var items = scene.querySelectorAll('.ba-slot[data-slot="' + slot + '"] .ba-answer');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-on', items[i].getAttribute('data-value') === value);
    }
  }

  // 선택
  function choose(option) {
    var question = option.closest('.cq-question');
    if (!question) return;
    var value = option.getAttribute('data-value');
    if (question.getAttribute('data-answer') === value) return;
    var caseId = question.getAttribute('data-case');
    var round = question.getAttribute('data-round');
    var scene = question.closest('.choice-scene');

    if (!caseId) {
      mark(question, value, true);
      return;
    }
    answers[caseId][round] = value;
    var same = document.querySelectorAll('.cq-question[data-case="' + caseId + '"][data-round="' + round + '"]');
    for (var i = 0; i < same.length; i++) mark(same[i], value, true);

    if (round === '1') {
      var st = scene.querySelector('.cq-stamp');
      if (st) stamp(st);
      if (answers[caseId][2]) updateRejudge(caseId, false);
    } else {
      updateRejudge(caseId, true);
    }
  }

  function initChoiceScene(scene) {
    scene.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      var option = e.target.closest('.cq-option');
      if (option && scene.contains(option)) choose(option);
    });
    scene.addEventListener('click', function (e) {
      var option = e.target.closest('.cq-option');
      if (option && scene.contains(option)) choose(option);
    });
    scene.addEventListener('keydown', function (e) {
      var option = e.target.closest && e.target.closest('.cq-option');
      if (option && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        choose(option);
      }
    });
  }

  document.querySelectorAll('.choice-scene').forEach(initChoiceScene);
})();


// 4. 펜 커서
(function () {
  'use strict';

  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;

  var KINDS = {
    omr: { scenes: '.check-scene', body: '#1E2230', cap: '#1E2230', band: '#FFFFFF' }
  };

  function makePen(k) {
    var el = document.createElement('div');
    el.className = 'pen-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<svg width="83" height="94" viewBox="0 0 64 72">' +
      '<g transform="translate(3 4) rotate(32 5 60)">' +
      '<rect x="0" y="0" width="10" height="13" rx="2" fill="' + k.cap + '"/>' +
      '<rect x="0" y="13" width="10" height="34" fill="' + k.body + '"/>' +
      '<rect x="0" y="22" width="10" height="5" fill="' + k.band + '" opacity=".9"/>' +
      '<path d="M0 47H10L6.4 57H3.6Z" fill="#E9E4D8"/>' +
      '<path d="M3.6 57H6.4L5 61Z" fill="' + k.cap + '"/>' +
      '<rect x="1.5" y="2" width="2" height="40" rx="1" fill="#fff" opacity=".35"/>' +
      '</g></svg>';
    document.body.appendChild(el);
    return el;
  }
  var pens = {};
  Object.keys(KINDS).forEach(function (n) { pens[n] = makePen(KINDS[n]); });

  var active = null, x = -100, y = -100, px = -100, py = -100, tilt = 0, raf = 0;
  var follow = null;

  window.penFollow = function (path, ms, ease) {
    if (!active || !path.getTotalLength) return;
    follow = { path: path, len: path.getTotalLength(), start: performance.now(), ms: ms, ease: ease || function (t) { return t; } };
    kick();
  };
  function tipOnPath(f, now) {
    var t = Math.min(1, (now - f.start) / f.ms);
    var pt = f.path.getPointAtLength(f.len * f.ease(t)), m = f.path.getScreenCTM();
    return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f, done: t >= 1 };
  }
  function kindAt(target) {
    if (!target || !target.closest) return null;
    for (var n in KINDS) if (target.closest(KINDS[n].scenes)) return n;
    return null;
  }
  function loop() {
    raf = 0;
    if (!active) return;
    var now = performance.now(), ox = px;
    if (follow) {
      var tp = tipOnPath(follow, now);
      px = tp.x; py = tp.y;
      if (tp.done) follow = null;
    } else {
      px = x; py = y;
    }
    tilt += (Math.max(-12, Math.min(12, (px - ox) * 0.6)) - tilt) * 0.3;
    pens[active].style.transform = 'translate3d(' + (px - 10).toFixed(1) + 'px,' + (py - 84).toFixed(1) + 'px,0) rotate(' + tilt.toFixed(1) + 'deg)';
    if (follow || Math.abs(x - px) > 0.3 || Math.abs(y - py) > 0.3 || Math.abs(tilt) > 0.2) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var k = kindAt(e.target);
    if (k !== active) {
      if (active) pens[active].classList.remove('is-on');
      active = k;
      if (k) { px = e.clientX; py = e.clientY; pens[k].classList.add('is-on'); }
    }
    x = e.clientX; y = e.clientY; kick();
  }, { passive: true });
  document.addEventListener('mouseleave', function () {
    if (active) pens[active].classList.remove('is-on');
    active = null;
  });
})();


// 5. 재판매글 보기
(function () {
  'use strict';

  var IDS = ['frame-04', 'frame-05'];
  var NS = 'http://www.w3.org/2000/svg';
  var CARD = { x: 375, y: 355, w: 1169, h: 393 };
  var SITE = [
    { url: 'secondhand-ticket.example/post/30412', tab: '[정가양도] 일행이 못 가게 돼서 남은 티켓 양도합니다' },
    { url: 'secondhand-ticket.example/post/30988', tab: '[양도] 일행이 안 맞아서 야구 티켓 양도합니다' }
  ];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function setup(scene, n) {
    var svg = scene.querySelector('svg.frame-svg');
    var root = svg && svg.querySelector('g');
    if (!root) return;
    var site = SITE[scene.getAttribute('data-case') === 'B' || scene.id === 'frame-05' ? 1 : 0];

    // 카드 안에 들어가는 그림만 한 묶음으로
    var post = el('g', { 'class': 'rp-post' });
    var parts = [];
    Array.prototype.forEach.call(root.children, function (c) {
      if (!c.getBBox) return;
      var b; try { b = c.getBBox(); } catch (e) { return; }
      if (b.width >= 1900) return;
      if (b.x >= CARD.x - 4 && b.y >= CARD.y - 4 && b.x + b.width <= CARD.x + CARD.w + 4 && b.y + b.height <= CARD.y + CARD.h + 4) parts.push(c);
    });
    if (!parts.length) return;
    // 카드 아래 질문 글 ('이 거래는 암표인가요?')
    var qText = null;
    Array.prototype.forEach.call(root.children, function (c) {
      if (qText || !c.getBBox) return;
      var b; try { b = c.getBBox(); } catch (e) { return; }
      if (b.y > 845 && b.y < 885 && b.height < 45 && b.width > 200 && b.width < 360) qText = c;
    });
    root.insertBefore(post, parts[0]);
    parts.forEach(function (c) { post.appendChild(c); });

    // 흐리게 가리고 그 위에 버튼
    var fid = 'rp-blur-' + n;
    var f = el('filter', { id: fid, x: '-5%', y: '-5%', width: '110%', height: '110%' }, el('defs', {}, root));
    var blur = el('feGaussianBlur', { stdDeviation: '9' }, f);
    var view = post.cloneNode(true);
    post.setAttribute('filter', 'url(#' + fid + ')');
    post.setAttribute('opacity', '0.55');

    var cover = el('g', { 'class': 'rp-cover', role: 'button', tabindex: '0', 'aria-label': '티켓 재판매글 보러가기' }, root);
    el('rect', { x: CARD.x, y: CARD.y, width: CARD.w, height: CARD.h, rx: 14, fill: '#F6EEF6', 'fill-opacity': '0.35', stroke: '#364E7B', 'stroke-width': 2, 'stroke-dasharray': '8 8' }, cover);
    var cx = CARD.x + CARD.w / 2, cy = CARD.y + CARD.h / 2;
    var btn = el('g', { 'class': 'rp-btn' }, cover);
    el('rect', { x: cx - 190, y: cy - 38, width: 380, height: 76, rx: 38, fill: '#364E7B' }, btn);
    // 티켓 아이콘
    var ix = cx - 160, iy = cy - 13;
    el('path', { d: 'M' + ix + ' ' + iy + 'h36v7a4 4 0 0 0 0 12v7h-36v-7a4 4 0 0 0 0-12z',
      fill: 'none', stroke: '#FFF4FD', 'stroke-width': 3.2, 'stroke-linejoin': 'round' }, btn);
    el('path', { d: 'M' + (ix + 25) + ' ' + (iy + 4) + 'v18', stroke: '#FFF4FD', 'stroke-width': 2.4, 'stroke-dasharray': '3 3', 'stroke-linecap': 'round' }, btn);
    var t = el('text', { x: cx + 18, y: cy + 9, 'text-anchor': 'middle', fill: '#FFF4FD', 'font-size': 26, 'font-weight': 700,
      'font-family': "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif" }, btn);
    t.textContent = '티켓 재판매글 보러가기';
    var sub = el('text', { x: cx, y: cy + 74, 'text-anchor': 'middle', fill: '#364E7B', 'font-size': 18, 'font-weight': 500,
      'font-family': "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif" }, cover);
    sub.textContent = '중고 티켓 거래 사이트 · 판매글 1건';

    function flash() {
      // 팝업을 닫으면 질문 글이 형광펜 칠과 함께 반짝인다
      if (!qText || reduce) return;
      var b = qText.getBBox();
      var mark = el('rect', { 'class': 'rp-mark', x: b.x - 8, y: b.y + b.height * 0.45, width: b.width + 16, height: b.height * 0.62, rx: 4, fill: '#3FC6E2' });
      qText.parentNode.insertBefore(mark, qText);
      qText.classList.remove('rp-flash'); void qText.getBBox(); qText.classList.add('rp-flash');
      setTimeout(function () { mark.remove(); qText.classList.remove('rp-flash'); }, 2200);
    }
    function reveal() {
      if (cover.classList.contains('is-open')) return;
      cover.classList.add('is-open');
      cover.setAttribute('aria-label', '티켓 재판매글 다시 크게 보기');
      var t0 = performance.now(), D = reduce ? 0 : 550;
      (function step(now) {
        var q = D ? Math.min(1, (now - t0) / D) : 1, e = 1 - Math.pow(1 - q, 3);
        blur.setAttribute('stdDeviation', (9 * (1 - e)).toFixed(2));
        post.setAttribute('opacity', (0.55 + 0.45 * e).toFixed(3));
        if (q < 1) requestAnimationFrame(step);
        else { post.removeAttribute('filter'); post.removeAttribute('opacity'); }
      })(t0);
    }
    function open() { show(view, site, cover, function () { reveal(); setTimeout(flash, reduce ? 0 : 350); }); }
    cover.addEventListener('click', open);
    cover.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  function setPens(v) {
    Array.prototype.forEach.call(document.querySelectorAll('.pen-cursor'), function (p) { p.style.visibility = v; });
  }

  // 사이트 창
  var modal = null;
  function show(view, site, from, after) {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'rp-modal';
    modal.innerHTML =
      '<div class="rp-win" role="dialog" aria-modal="true" aria-label="중고 티켓 거래 판매글">' +
        '<div class="rp-bar"><i></i><i></i><i></i>' +
          '<div class="rp-tab"></div>' +
          '<button class="rp-x" type="button" aria-label="닫기">×</button></div>' +
        '<div class="rp-addr"><span class="rp-nav">‹ ›</span><span class="rp-lock"></span><span class="rp-url"></span></div>' +
        '<div class="rp-page"></div>' +
      '</div>';
    modal.querySelector('.rp-tab').textContent = site.tab;
    modal.querySelector('.rp-url').textContent = site.url;
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', (CARD.x - 2) + ' ' + (CARD.y - 2) + ' ' + (CARD.w + 4) + ' ' + (CARD.h + 4));
    s.setAttribute('class', 'rp-view'); s.setAttribute('fill', 'none');
    s.appendChild(view.cloneNode(true));
    modal.querySelector('.rp-page').appendChild(s);
    document.body.appendChild(modal);
    setPens('hidden');

    var win = modal.querySelector('.rp-win');
    if (!reduce && win.animate) {
      var a = from.getBoundingClientRect(), b = win.getBoundingClientRect();
      var sx = a.width / b.width, dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
      win.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ')', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      modal.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    }
    function close() {
      if (!modal) return;
      var m = modal; modal = null;
      document.removeEventListener('keydown', onKey);
      setPens('');
      if (reduce || !m.animate) { m.remove(); return; }
      m.style.pointerEvents = 'none';
      m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      setTimeout(function () { m.remove(); }, 240);
      setTimeout(function () { if (after) after(); }, 200);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('.rp-x').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
  }

  function init() {
    IDS.forEach(function (id, i) { var s = document.getElementById(id); if (s) setup(s, i); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();


// 6. 말풍선 타이핑
(function () {
  'use strict';

  var APPEAR_MS = 750;
  var CHAR_MS = 28;
  var GAP_MS = 380;
  var RISE = 44;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function makeVoice(g) {
    var lines = JSON.parse(g.getAttribute('data-lines'));
    var total = 0;
    lines.forEach(function (l) { total += l[1].length; });
    return { g: g, lines: lines, rects: g.querySelectorAll('.vline'), total: total,
             x0: parseFloat(g.getAttribute('data-x0')), cursor: g.querySelector('.voice-cursor'),
             token: 0 };
  }

  // 글자 수만큼 줄별 클립 사각형을 늘리고 커서를 옮긴다
  function typeTo(v, count) {
    var left = count, cx = v.x0 + 8, cy = v.lines[0][0], k;
    for (k = 0; k < v.lines.length; k++) {
      var y = v.lines[k][0], cuts = v.lines[k][1];
      var take = Math.min(Math.max(left, 0), cuts.length);
      v.rects[k].setAttribute('width', take > 0 ? (cuts[take - 1] - v.x0 + 2).toFixed(1) : '0');
      if (take > 0) { cx = cuts[take - 1]; cy = y; }
      left -= take;
    }
    var lh = v.lines.length > 1 ? v.lines[1][0] - v.lines[0][0] : parseFloat(v.cursor.getAttribute('height')) / 1.08 * 1.4;
    v.cursor.setAttribute('x', (cx + 2).toFixed(1));
    v.cursor.setAttribute('y', (cy + lh * 0.14).toFixed(1));
  }

  function setLook(v, a) {
    v.g.setAttribute('opacity', a.toFixed(3));
    v.g.setAttribute('transform', 'translate(0 ' + (RISE * (1 - a)).toFixed(2) + ')');
  }

  // 보이기: 등장 -> 바로 타이핑
  var nextSlot = 0;
  function show(v) {
    var token = ++v.token;
    if (reduce) { setLook(v, 1); typeTo(v, v.total); return; }
    var now = performance.now();
    var start = Math.max(now, nextSlot);
    nextSlot = start + GAP_MS;
    typeTo(v, 0);
    (function step(t) {
      if (token !== v.token) return;
      var e = t - start;
      if (e < 0) { requestAnimationFrame(step); return; }
      var a = Math.min(1, e / APPEAR_MS);
      setLook(v, easeOut(a));
      var typeStart = APPEAR_MS * 0.7;
      if (e >= typeStart) {
        var n = Math.min(v.total, Math.floor((e - typeStart) / CHAR_MS) + 1);
        typeTo(v, n);
        v.cursor.classList.toggle('is-on', n < v.total);
        if (n >= v.total && a >= 1) { v.cursor.classList.remove('is-on'); v.cursor.setAttribute('opacity', '0'); return; }
      }
      requestAnimationFrame(step);
    })(now);
  }

  // 숨기기: 사라지고 글자 지움
  function hide(v) {
    v.token++;
    setLook(v, 0);
    typeTo(v, 0);
    v.cursor.classList.remove('is-on');
    v.cursor.setAttribute('opacity', '0');
  }

  function setup(scene) {
    var voices = Array.prototype.map.call(scene.querySelectorAll('.voice'), makeVoice);
    voices.forEach(function (v) { hide(v); });
    if (scene.hasAttribute('data-lock') && window.sceneLock) {
      var order = voices.slice().sort(function (a, b) { return a.g.getBBox().y - b.g.getBBox().y; });
      window.addEventListener('scenelock', function () {
        var k = Math.ceil(Math.min(1, window.sceneLock(scene) / 0.9) * order.length - 0.15);
        order.forEach(function (v, i) {
          if (i < k && !v.on) { v.on = true; show(v); }
          else if (i >= k && v.on) { v.on = false; hide(v); }
        });
      });
      return;
    }
    if (!('IntersectionObserver' in window)) { voices.forEach(show); return; }
    var byEl = new Map(voices.map(function (v) { return [v.g, v]; }));
    var io = new IntersectionObserver(function (entries) {
      // 위쪽 말풍선부터 처리 -> 순서대로 뜸
      entries.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      entries.forEach(function (en) {
        var v = byEl.get(en.target);
        if (en.isIntersecting) {
          if (!v.on) { v.on = true; show(v); }
        } else if (en.boundingClientRect.top > 0 && v.on) {
          v.on = false; hide(v);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    voices.forEach(function (v) { io.observe(v.g); });
  }

  document.querySelectorAll('.voice-scene').forEach(setup);
})();


// 7. 암표 구매 경험
(function () {
  'use strict';

  var GREY = [195, 203, 234];
  var MINT = [63, 198, 226];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { var c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  function setup(scene) {
    var three = scene.querySelector('.st-three');
    var cx = parseFloat(three.getAttribute('data-cx')), cy = parseFloat(three.getAttribute('data-cy'));
    var persons = Array.prototype.map.call(scene.querySelectorAll('.st-person'), function (p) {
      return { parts: p.querySelectorAll('.st-body path'), shadow: p.querySelector('.st-shadow'),
               shadowOp: parseFloat(p.querySelector('.st-shadow').getAttribute('opacity') || '1') };
    });
    var bubble = scene.querySelector('.st-bubble');
    var next = scene.querySelector('.st-next');
    var hint = scene.querySelector('.st-scroll');

    // 시간표 (ms): [시작, 길이]
    var T = {
      three:  [0, 420],
      people: [[120, 380], [330, 380], [540, 380]],
      bubble: [1050, 520],
      next:   [1750, 700],
      hint:   [2350, 500]
    };
    var END = 2900;

    function at(t, s) { return clamp((t - s[0]) / s[1]); }

    function draw(t) {
      var k = at(t, T.three);
      var scale = k < 1 ? 2.4 - 1.4 * easeOutBack(k) : 1;
      var shake = (t > T.three[1] && t < T.three[1] + 160) ? Math.sin((t - T.three[1]) / 160 * Math.PI * 4) * 2.2 * (1 - (t - T.three[1]) / 160) : 0;
      three.setAttribute('opacity', Math.min(1, k * 3).toFixed(3));
      three.setAttribute('transform', 'translate(' + (cx + shake).toFixed(2) + ' ' + cy + ') scale(' + scale.toFixed(3) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      // 사람 3명 색칠 (회색 -> 민트), 그림자도 함께
      persons.forEach(function (p, i) {
        var c = easeOut(at(t, T.people[i]));
        var col = mix(GREY, MINT, c);
        for (var j = 0; j < p.parts.length; j++) p.parts[j].setAttribute('fill', col);
        p.shadow.setAttribute('opacity', (p.shadowOp * c).toFixed(3));
      });
      // 말풍선: 아래에서 떠오르며 나타남
      var b = easeOut(at(t, T.bubble));
      bubble.setAttribute('opacity', b.toFixed(3));
      bubble.setAttribute('transform', 'translate(0 ' + (16 * (1 - b)).toFixed(2) + ')');
      // 그렇다면 질문 + 스크롤 안내
      var n = easeOut(at(t, T.next));
      next.setAttribute('opacity', n.toFixed(3));
      next.setAttribute('transform', 'translate(0 ' + (24 * (1 - n)).toFixed(2) + ')');
      if (hint) hint.setAttribute('opacity', easeOut(at(t, T.hint)).toFixed(3));
    }

    var token = 0, playing = false;
    function play() {
      if (playing) return;
      playing = true;
      var my = ++token;
      if (reduce) { draw(END); return; }
      var start = performance.now();
      (function step(now) {
        if (my !== token) return;
        var t = now - start;
        draw(t);
        if (t < END) requestAnimationFrame(step);
      })(start);
    }
    function reset() { token++; playing = false; draw(-1); }

    if (window.lockTimeline && window.lockTimeline(scene, END, draw)) return;
    reset();
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.intersectionRatio >= 0.35) play();
        else if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
      });
    }, { threshold: [0, 0.35] }).observe(scene);
  }

  document.querySelectorAll('.stat-scene').forEach(setup);
})();


// 8. 나이대 고르기
(function () {
  'use strict';

  var DATA = [
    { label: '19–29세', pct: 32.08 },
    { label: '30–39세', pct: 25.00 },
    { label: '40–49세', pct: 25.00 },
    { label: '50–59세', pct: 19.20 },
    { label: '60세 이상', pct: 12.90 }
  ];
  var AVG = 29.9;
  var MINT = '#3FC6E2', NAVY = '#364E7B', LAVENDER = '#AEB8DD';
  var DIM = 0.22;
  var YOU_CX = 520;
  var SHIFT = -40;
  var LOADING_MS = 1500;
  var RECOLOR = {
    '#1F2C48': '#236277', '#263556': '#236277', '#2C3E64': '#3298B1', '#364E7B': '#3FC6E2',
    '#627598': '#69D3E8', '#8A98B2': '#69D3E8', '#C7CDDA': '#C9EFF7', 'BLACK': '#236277', '#000000': '#236277'
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = document.querySelector('.age-scene');
  if (!scene) return;
  function $(sel) { return scene.querySelector(sel); }
  function $$(sel, fn) { Array.prototype.forEach.call(scene.querySelectorAll(sel), fn); }
  function show(el, on) { if (el) el.style.opacity = on ? '1' : '0'; }
  function fmt(v) { return v.toFixed(2) + '%'; }
  function baseline(top, size, lh) { return top + (lh - 1.448 * size) / 2 + 1.16 * size; }

  var pickHead = $('.ag-pick-head'), title = $('.ag-title'), stage = $('.ag-stage');
  var ring = $('.ag-ring'), you = $('.ag-you'), loading = $('.ag-loading'), result = $('.ag-result');
  var state = 'pick', age = 0, cx = YOU_CX, token = 0;

  // 그리기 도우미
  function setTitle(lines, size, lh) {
    var t1 = title.querySelector('.l1'), t2 = title.querySelector('.l2');
    title.setAttribute('font-size', size);
    t1.textContent = lines[0]; t1.setAttribute('y', baseline(80, size, lh).toFixed(1));
    t2.textContent = lines[1] || ''; t2.setAttribute('y', baseline(80 + lh, size, lh).toFixed(1));
  }
  function swapTitle(lines, size, lh) {
    var my = token;
    show(title, false);
    setTimeout(function () { if (my !== token) return; setTitle(lines, size, lh); show(title, true); }, reduce ? 0 : 220);
  }
  function placeRing(x, on) {
    ring.setAttribute('transform', 'translate(' + (x - YOU_CX).toFixed(1) + ' 0)');
    show(ring, on);
  }
  function groups(dim) {
    $$('.ag-group', function (g) {
      var on = +g.getAttribute('data-age') === age;
      g.style.opacity = (!dim || on) ? '1' : String(dim);
      var lab = g.querySelector('.ag-label'); if (lab) lab.style.fill = (state !== 'pick' && on) ? MINT : NAVY;
    });
  }
  function buyers(n) {
    $$('.ag-group', function (g) {
      var on = +g.getAttribute('data-age') === age;
      Array.prototype.forEach.call(g.querySelectorAll('.ag-person'), function (p) {
        var mint = on && +p.getAttribute('data-p') < n;
        Array.prototype.forEach.call(p.querySelectorAll('path, rect, circle, ellipse'), function (s) {
          if (!s.hasAttribute('data-of')) s.setAttribute('data-of', (s.getAttribute('fill') || '').toUpperCase());
          var of = s.getAttribute('data-of');
          s.style.fill = (mint && RECOLOR[of]) ? RECOLOR[of] : '';
        });
      });
    });
  }
  var shift = 0, shiftToken = 0;
  function moveStage(to) {
    var from = shift, my = ++shiftToken, start = performance.now(), dur = reduce ? 0 : 550;
    (function step(now) {
      if (my !== shiftToken) return;
      var t = dur ? Math.min(1, (now - start) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
      shift = from + (to - from) * e;
      stage.setAttribute('transform', 'translate(0 ' + shift.toFixed(2) + ')');
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  function fillResult() {
    var d = DATA[age], n = Math.round(d.pct / 10);
    var dl = $('.ag-desc .l1'); if (dl) dl.textContent = d.label + ' 응답자 중 공식 예매처 외 경로로';
    var chipText = $('.ag-chip-text'), chipRect = $('.ag-chip rect');
    chipText.textContent = '전체 평균 ' + AVG + '%보다 ' + (d.pct >= AVG ? '높아요' : '낮아요');
    try { chipRect.setAttribute('width', (chipText.getComputedTextLength() + 32).toFixed(1)); } catch (e) {}
    $$('.ag-bar', function (row) {
      var k = +row.getAttribute('data-age'), on = k === age;
      row.querySelector('.ag-bar-fill').style.fill = on ? MINT : LAVENDER;
      row.querySelector('.ag-bar-label').style.fill = on ? MINT : NAVY;
      var val = row.querySelector('.ag-bar-value'), size = on ? 30 : 18;
      val.textContent = fmt(DATA[k].pct);
      val.setAttribute('font-size', size);
      val.setAttribute('font-weight', on ? 900 : 700);
      val.setAttribute('fill', on ? MINT : NAVY);
      val.setAttribute('y', (parseFloat(val.getAttribute('data-cy')) + 0.436 * size).toFixed(1));
    });
    return n;
  }
  function countUp(target) {
    var big = $('.ag-big'), my = token, start = performance.now(), dur = reduce ? 0 : 900;
    (function step(now) {
      if (my !== token) return;
      var t = dur ? Math.min(1, (now - start) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
      big.textContent = fmt(target * e);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  // 단계
  function toChosen(k, x) {
    var my = ++token;
    state = 'chosen'; age = k; cx = x;
    show(pickHead, false);
    show(result, false);
    buyers(0);
    groups(DIM);
    placeRing(cx, false);
    you.setAttribute('transform', 'translate(' + (cx - YOU_CX).toFixed(1) + ' 0)');
    show(you, true);
    moveStage(0);
    swapTitle([DATA[age].label + '를 골랐어요', ''], 46, 57.5);
    show(loading, true);
    setTimeout(function () { if (my === token) toResult(); }, reduce ? 300 : LOADING_MS);
  }
  function toResult() {
    state = 'result';
    var n = fillResult();
    show(loading, false);
    moveStage(SHIFT);
    swapTitle(['당신 또래 10명 중 약 ' + n + '명은', '암표를 사 본 적이 있어요'], 44, 55);
    var my = token;
    setTimeout(function () {
      if (my !== token) return;
      buyers(n);
      show(result, true);
      countUp(DATA[age].pct);
    }, reduce ? 0 : 450);
  }

  // 입력
  $$('.ag-hit', function (hit) {
    var k = +hit.getAttribute('data-age'), x = parseFloat(hit.getAttribute('data-cx'));
    function enter() {
      placeRing(x, true);
      if (state === 'pick') $$('.ag-group', function (g) { g.style.opacity = +g.getAttribute('data-age') === k ? '1' : '0.55'; });
    }
    function leave() {
      placeRing(cx, false);
      if (state === 'pick') $$('.ag-group', function (g) { g.style.opacity = '1'; });
    }
    hit.addEventListener('pointerenter', enter);
    hit.addEventListener('pointerleave', leave);
    hit.addEventListener('focus', enter);
    hit.addEventListener('blur', leave);
    hit.addEventListener('click', function () { toChosen(k, x); });
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toChosen(k, x); }
    });
  });

  // 처음: 고르기 화면
  show(pickHead, true); show(title, false); show(loading, false); show(result, false); show(you, false); show(ring, false);
  groups(0);
})();


// 9. 이용자 인식
(function () {
  'use strict';

  var CARD_GAP = 180;
  var RISE_MS = 450;
  var DRAW_MS = 1100;
  var RISE = 24;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function setup(scene) {
    var cards = Array.prototype.map.call(scene.querySelectorAll('.dn-card'), function (g, i) {
      var arc = g.querySelector('.dn-arc');
      var len = arc && arc.getTotalLength ? arc.getTotalLength() : 0;
      if (arc) arc.setAttribute('stroke-dasharray', len.toFixed(2) + ' ' + (len + 20).toFixed(2));
      var start = i * CARD_GAP + (i === 4 ? 250 : 0);
      return { g: g, arc: arc, len: len, num: g.querySelector('.dn-num'),
               value: parseFloat(g.getAttribute('data-value')), start: start };
    });
    var concl = scene.querySelector('.dn-concl');
    var lastEnd = cards.length ? cards[cards.length - 1].start + RISE_MS * 0.6 + DRAW_MS : 0;
    var END = lastEnd + 900;

    function draw(t) {
      cards.forEach(function (c) {
        var a = easeOut(clamp((t - c.start) / RISE_MS));
        c.g.setAttribute('opacity', a.toFixed(3));
        c.g.setAttribute('transform', 'translate(0 ' + (RISE * (1 - a)).toFixed(2) + ')');
        var d = easeOut(clamp((t - c.start - RISE_MS * 0.6) / DRAW_MS));
        if (c.arc) c.arc.setAttribute('stroke-dashoffset', (c.len * (1 - d)).toFixed(2));
        if (c.num) c.num.textContent = (c.value * d).toFixed(1);
      });
      var k = easeOut(clamp((t - lastEnd - 100) / 700));
      if (concl) {
        concl.setAttribute('opacity', k.toFixed(3));
        concl.setAttribute('transform', 'translate(0 ' + (16 * (1 - k)).toFixed(2) + ')');
      }
    }

    var token = 0, playing = false;
    function play() {
      if (playing) return;
      playing = true;
      var my = ++token;
      if (reduce) { draw(END); return; }
      var start = performance.now();
      (function step(now) {
        if (my !== token) return;
        var t = now - start;
        draw(t);
        if (t < END) requestAnimationFrame(step);
      })(start);
    }
    function reset() { token++; playing = false; draw(-1); }

    reset();
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.intersectionRatio >= 0.35) play();
        else if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
      });
    }, { threshold: [0, 0.35] }).observe(scene);
  }

  document.querySelectorAll('.donut-scene').forEach(setup);
})();


// 10. 암표 거래 규모
(function () {
  'use strict';

  // 점 좌표. 1920×1080 기준
  var DOTS = window.SCENE_DOTS;
  DOTS.push([538.8, 319.5]);
  var TOTAL = 129528;
  var PER = 50;
  var R = 4.68;
  var COLOR = '#364E7B';
  var LAST_COLOR = '#364E7B';
  var FALL_ALPHA = 0.5, TRAIL_ALPHA = 0.25;
  var FALL_MS = 380;
  var RATE = 1600;
  var BOX_TOP = 300;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = document.querySelector('.dots-scene');
  if (!scene) return;
  var canvas = scene.querySelector('.dt-canvas'), ctx = canvas.getContext('2d');
  var countEl = scene.querySelector('.dt-count');
  var parts = {
    titleA: scene.querySelector('.dt-title-a'), titleB: scene.querySelector('.dt-title-b'),
    footB: scene.querySelector('.dt-foot-b'),
    counter: scene.querySelector('.dt-counter'), legend: scene.querySelector('.dt-legend-dot')
  };
  var N = DOTS.length;
  var land = new Array(N);
  var from = DOTS.map(function () { return 165 + Math.random() * 60; });
  var dur = DOTS.map(function (d, i) { return FALL_MS + (d[1] - from[i]) * 0.35; });
  var shown = 0, done = false, visible = false;
  var rain = [];

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function resize() {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr * w / 1920, 0, 0, dpr * h / 1080, 0, 0);
  }

  function progress() {
    var lock = window.sceneLock && window.sceneLock(scene);
    if (lock !== null && lock !== undefined) return clamp(lock / 0.9);
    var r = scene.getBoundingClientRect(), vh = window.innerHeight;
    var start = vh - r.height * 0.8, end = Math.min(0, (vh - r.height) / 2);
    if (start <= end) return r.top <= end ? 1 : 0;
    return clamp((start - r.top) / (start - end));
  }

  var target = 0, lastT = 0;
  function setTarget() { target = Math.round(progress() * N); }
  // shown 을 target 쪽으로 RATE 속도로 옮김
  function step(now) {
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
    if (shown === target) return false;
    var next = reduce ? target : (target > shown ? Math.min(target, shown + Math.max(1, Math.round(RATE * dt)))
                                                 : Math.max(target, shown - Math.max(1, Math.round(RATE * 1.5 * dt))));
    if (next > shown) { for (var i = shown; i < next; i++) land[i] = reduce ? -1e9 : now; }
    else { for (var j = next; j < shown; j++) land[j] = undefined; }
    shown = next;
    countEl.textContent = (shown >= N ? TOTAL : shown * PER).toLocaleString('en-US');
    setDone(shown >= N);
    return true;
  }

  function setDone(on) {
    if (on === done) return;
    done = on;
    parts.titleA.style.opacity = on ? '0' : '1';  parts.titleB.style.opacity = on ? '1' : '0';
    parts.footB.style.opacity = on ? '1' : '0';
    parts.counter.style.opacity = on ? '0' : '1';
    if (parts.legend) parts.legend.style.fill = on ? '#3FC6E2' : '';
  }

  function draw(now) {
    ctx.clearRect(0, 0, 1920, 1080);
    var busy = false;
    ctx.fillStyle = COLOR;
    ctx.beginPath();
    var falling = [];
    var lastLanded = false;
    for (var i = 0; i < shown; i++) {
      var t = (now - land[i]) / dur[i];
      if (t >= 1) {
        if (i === N - 1) { lastLanded = true; continue; }
        ctx.moveTo(DOTS[i][0] + R, DOTS[i][1]); ctx.arc(DOTS[i][0], DOTS[i][1], R, 0, 6.2832);
      }
      else { falling.push(i); busy = true; }
    }
    ctx.fill();
    if (lastLanded) { ctx.fillStyle = LAST_COLOR; ctx.beginPath(); ctx.arc(DOTS[N - 1][0], DOTS[N - 1][1], R, 0, 6.2832); ctx.fill(); ctx.fillStyle = COLOR; }
    // 떨어지는 점 (가속하며 낙하, 위로 짧은 꼬리)
    falling.forEach(function (i) {
      var t = clamp((now - land[i]) / dur[i]), y0 = from[i], y1 = DOTS[i][1];
      var y = y0 + (y1 - y0) * t * t, x = DOTS[i][0];
      ctx.globalAlpha = t <= 0 ? 0 : TRAIL_ALPHA;
      ctx.strokeStyle = COLOR; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, Math.max(y0, y - 8 - 22 * t)); ctx.lineTo(x, y - R); ctx.stroke();
      var last = i === N - 1;
      ctx.globalAlpha = t <= 0 ? 0 : (last ? 1 : FALL_ALPHA + (1 - FALL_ALPHA) * t * t);
      if (last) ctx.fillStyle = LAST_COLOR;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();
      if (last) ctx.fillStyle = COLOR;
    });
    ctx.globalAlpha = 1;
    // 분위기용 비 (다 쌓이기 전, 화면에 보일 때)
    if (!done && shown < N && visible && !reduce) {
      if (rain.length < 26 && Math.random() < 0.25) rain.push({ x: 450 + Math.random() * 1020, y: 160 + Math.random() * 20, v: 70 + Math.random() * 60 });
      ctx.fillStyle = COLOR;
      rain = rain.filter(function (d) {
        d.y += d.v / 60;
        var a = clamp(1 - (d.y - 170) / (BOX_TOP - 170));
        if (a <= 0) return false;
        ctx.globalAlpha = FALL_ALPHA * a;
        ctx.beginPath(); ctx.arc(d.x, d.y, R, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = TRAIL_ALPHA * a;
        ctx.beginPath(); ctx.moveTo(d.x, Math.max(160, d.y - 26)); ctx.lineTo(d.x, d.y - R); ctx.strokeStyle = COLOR; ctx.lineWidth = 2; ctx.stroke();
        return true;
      });
      ctx.globalAlpha = 1;
      busy = true;
    } else rain = [];
    return busy;
  }

  var raf = 0;
  function loop(now) {
    raf = 0;
    var moving = step(now);
    if (draw(now) || moving) raf = requestAnimationFrame(loop); else lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function onScroll() { setTarget(); kick(); }

  resize();
  window.addEventListener('resize', function () { resize(); kick(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scenelock', onScroll);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(scene);
  } else visible = true;
  onScroll();
})();


// 11. 가격 상승
(function () {
  'use strict';

  var ROW = 28;
  var RATE = 5;
  var FEED = 7;
  var NAVY = '#364E7B', RED = '#D9434F', INK = '#2B2F3A';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = document.querySelector('.receipt-scene');
  if (!scene) return;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function won(v) { return '₩' + Math.round(v).toLocaleString('en-US'); }
  function times(v) { return '× ' + v.toFixed(1); }
  function easeOutBack(t) { var c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  var receipts = Array.prototype.map.call(scene.querySelectorAll('.rc-receipt'), function (g) {
    var side = g.getAttribute('data-side');
    var top = scene.querySelectorAll('.rc-top')[side === 'L' ? 0 : 1];
    var stamp = scene.querySelectorAll('.rc-stamp')[side === 'L' ? 0 : 1];
    var prem = JSON.parse(g.getAttribute('data-prem'));
    return {
      base: +g.getAttribute('data-base'), prem: prem, max: prem.length,
      move: g.querySelector('.rc-move'), slot: +g.querySelector('.rc-move').getAttribute('data-slot'), len: 0,
      paper: g.querySelector('.rc-paper'), rows: g.querySelectorAll('.rc-row'), bottom: g.querySelector('.rc-bottom'),
      total: g.querySelector('.rc-total'), rmult: g.querySelector('.rc-rmult'),
      amount: top.querySelector('.rc-amount'), mult: top.querySelector('.rc-mult'),
      stamp: stamp, stampOp: parseFloat(stamp.getAttribute('data-op')) || 1,
      cx: +g.getAttribute('data-stamp-cx'), cy: +g.getAttribute('data-stamp-cy'),
      shown: -1, value: 0, stamped: false, stampT: 0
    };
  });
  var MAX = Math.max.apply(null, receipts.map(function (r) { return r.max; }));

  // 줄이 하나도 없을 때 영수증 길이 (투입구 ~ 아래 톱니 끝)
  function measure(rc) {
    try { var b = rc.bottom.getBBox(); rc.len = b.y + b.height - ROW * rc.max - rc.slot + 6; } catch (e) { rc.len = 420; }
  }

  function progress() {
    var lock = window.sceneLock && window.sceneLock(scene);
    if (lock !== null && lock !== undefined) return clamp(lock / 0.9);
    var r = scene.getBoundingClientRect(), vh = window.innerHeight;
    var start = vh - r.height * 0.6, end = Math.min(0, (vh - r.height) / 2);
    if (start <= end) return r.top <= end ? 1 : 0;
    return clamp((start - r.top) / (start - end));
  }

  var target = 0, s = 0, lastT = 0, raf = 0;

  function totalOf(rc, n) { var t = rc.base; for (var i = 0; i < n; i++) t += rc.prem[i]; return t; }

  function draw(now) {
    var busy = false;
    receipts.forEach(function (rc) {
      if (!rc.len) measure(rc);
      var f = clamp(s / FEED), e = 1 - Math.pow(1 - f, 2);
      var jig = f > 0 && f < 1 ? Math.sin(now / 28) * 0.6 : 0;
      rc.move.setAttribute('transform', 'translate(' + jig.toFixed(2) + ' ' + (-rc.len * (1 - e)).toFixed(2) + ')');
      var grow = Math.min(rc.max, Math.max(0, s - FEED)), n = Math.floor(grow + 1e-6), frac = grow - n;
      var dy = -ROW * (rc.max - grow);
      rc.paper.setAttribute('transform', 'translate(0 ' + dy.toFixed(2) + ')');
      rc.bottom.setAttribute('transform', 'translate(0 ' + dy.toFixed(2) + ')');
      for (var k = 0; k < rc.rows.length; k++) {
        var op = k < n ? 1 : (k === n ? 0.35 * clamp(frac * 2) : 0);
        rc.rows[k].setAttribute('opacity', op.toFixed(3));
      }
      // 금액: 다 찍힌 줄까지의 합계로 부드럽게 따라감
      var goal = totalOf(rc, n);
      rc.value = reduce ? goal : rc.value + (goal - rc.value) * 0.22;
      if (Math.abs(goal - rc.value) < 500) rc.value = goal; else busy = true;
      rc.amount.textContent = won(rc.value);
      rc.mult.textContent = times(rc.value / rc.base);
      rc.total.textContent = won(rc.value);
      rc.rmult.textContent = times(rc.value / rc.base);
      rc.total.setAttribute('fill', n > 0 ? RED : INK);
      // 도장
      var full = n >= rc.max;
      if (full !== rc.stamped) { rc.stamped = full; rc.stampT = now; rc.amount.style.fill = full ? RED : NAVY; }
      var k2 = reduce ? 1 : clamp((now - rc.stampT) / 420);
      if (rc.stamped) {
        var sc = 1.8 - 0.8 * easeOutBack(k2);
        rc.stamp.setAttribute('opacity', (rc.stampOp * clamp(k2 * 3)).toFixed(3));
        rc.stamp.setAttribute('transform', 'translate(' + rc.cx + ' ' + rc.cy + ') scale(' + sc.toFixed(3) + ') translate(' + (-rc.cx) + ' ' + (-rc.cy) + ')');
        if (k2 < 1) busy = true;
      } else {
        rc.stamp.setAttribute('opacity', '0');
      }
    });
    return busy;
  }

  function loop(now) {
    raf = 0;
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
    var moving = false;
    if (s !== target) {
      var step = (reduce ? 99 : RATE) * dt;
      s = target > s ? Math.min(target, s + step) : Math.max(target, s - step * 1.5);
      moving = true;
    }
    if (draw(now) || moving || (s > 0 && s < FEED)) raf = requestAnimationFrame(loop); else lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function onScroll() { target = progress() * (FEED + MAX); kick(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scenelock', onScroll);
  window.addEventListener('resize', onScroll);
  onScroll();
})();


// 12. 일반 예매 vs 매크로
(function () {
  'use strict';

  var scene = document.querySelector('.ticket-scene');
  if (!scene) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 설정
  var MACRO_PER_SEC = 80 / 60;
  var MACRO_CAP = 240;
  var QUEUE_MS = 3500;
  var CAPTCHA = 'K7RQX';
  var STEAL_MS = 1400;
  var IDLE_HINT_MS = 5000;
  var ROUNDS = ['2026.07.24(금) 19:30', '2026.07.25(토) 18:30', '2026.07.26(일) 18:00'];
  var DATE_DOT = [[1053.2, 626.965], [1084, 626.965], [899, 652.6]];
  var NAVY = '#364E7B', MINT = '#3FC6E2', PINK = '#E58BC4', RED = '#E5546B';

  function $(s) { return scene.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(scene.querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(sec) { sec = Math.floor(sec); return pad(Math.floor(sec / 3600)) + ':' + pad(Math.floor(sec / 60) % 60) + ':' + pad(sec % 60); }
  function human(sec) {
    sec = Math.max(1, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? (m + '분' + (s ? ' ' + s + '초' : '')) : s + '초';
  }

  var steps = $$('.tk-step'), timer = $('.tk-timer'), input = scene.querySelector('.tk-cap-input');
  var hint = $('.tk-hint'), toast = $('.tk-toast'), result = $('.tk-result');
  var instr = $('.tk-instr'), auto = $('.tk-auto');
  var seats = $$('.tk-seat');
  seats.forEach(function (s) { s.setAttribute('data-orig', s.getAttribute('data-state')); });

  // 좌석 이름 (구역/열/번) 계산
  (function () {
    var zones = { A: [], B: [], C: [] };
    seats.forEach(function (s) {
      var x = +s.getAttribute('x'); var z = x < 560 ? 'A' : x < 735 ? 'B' : 'C';
      s.setAttribute('data-zone', z); zones[z].push(s);
    });
    Object.keys(zones).forEach(function (z) {
      var xs = zones[z].map(function (s) { return +s.getAttribute('x'); }), ys = zones[z].map(function (s) { return +s.getAttribute('y'); });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
      zones[z].forEach(function (s) {
        s.setAttribute('data-name', z + '구역 ' + (Math.round((+s.getAttribute('y') - y0) / 15.4) + 1) + '열 ' + (Math.round((+s.getAttribute('x') - x0) / 15.4) + 1) + '번');
      });
    });
  })();

  // 매크로 터미널
  var term = $('.tk-term'), count = $('.tk-count');
  var LINES = 18, lineEls = [];
  for (var i = 0; i < LINES; i++) {
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '1192.8'); t.setAttribute('y', (416.2 + 20.9 * i + 12.4).toFixed(1));
    t.setAttribute('font-family', "'IBM Plex Mono', Menlo, Consolas, monospace"); t.setAttribute('font-size', '12.1'); t.setAttribute('font-weight', '500');
    term.appendChild(t); lineEls.push(t);
  }
  var INTRO = [['$ python macro_bot.py', '#8B93A7'], ['> 계정 120개 로그인 완료', '#5BE49B'], ['> 동시 접속 세션 대기', '#5BE49B'],
               ['> 오픈 시각 동기화 00:00:00', '#5BE49B'], ['> 보안문자 자동 인식 · 좌석 자동 선택', '#5BE49B'], ['[00:00:00] 대기 중...', '#E7C86E']];
  var log = [];
  var SEAT_SEQ = [4, 7, 10, 13, 2, 5, 8, 11, 14, 3, 6, 9, 12, 1];
  function macroSeat(n) { return 'R석 ' + (Math.floor(n / 4) + 1) + '열 ' + SEAT_SEQ[n % SEAT_SEQ.length] + '번'; }
  function renderLog() {
    var start = Math.max(0, log.length - LINES);
    for (var i = 0; i < LINES; i++) {
      var l = log[start + i];
      lineEls[i].textContent = l ? l[0] : '';
      if (l) lineEls[i].setAttribute('fill', l[1]);
    }
  }

  // 상태
  var S;
  function fresh() {
    return { phase: 'idle', step: 0, round: 0, t0: 0, tEnd: 0, macro: 0, cap: '', seat: null, opt: -1, agree: false,
             lastAct: performance.now(), lastSteal: 0, autoMode: false, resultT: 0, raf: 0 };
  }

  function showStep(k) {
    S.step = k;
    steps.forEach(function (g) {
      var on = +g.getAttribute('data-step') === k;
      g.setAttribute('display', on ? 'inline' : 'none');
      if (on) { g.style.opacity = '0'; requestAnimationFrame(function () { g.style.opacity = '1'; }); }
    });
    timer.setAttribute('display', k >= 1 && k <= 4 ? 'inline' : 'none');
    input.style.display = k === 2 ? 'block' : 'none';
    $$('.tk-hit').forEach(function (h) {
      var st = h.getAttribute('data-step');
      if (st !== null) h.setAttribute('data-off', +st === k && S.phase !== 'result' ? '0' : '1');
    });
    if (k === 2) setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) {} }, 60);
    S.lastAct = performance.now(); setHint(null);
  }

  // 6: 회차 선택 (대기열 다음)
  function setRound(k) {
    S.round = k;
    $$('.tk-round').forEach(function (r) {
      var on = +r.getAttribute('data-round') === k;
      r.setAttribute('fill', on ? '#EAF8FB' : 'none'); r.setAttribute('stroke', on ? MINT : NAVY);
      r.setAttribute('stroke-opacity', on ? '1' : '0.25'); r.setAttribute('stroke-width', on ? '1.65' : '1.1');
    });
    var dot = $('.tk-date-dot');
    dot.setAttribute('opacity', k >= 0 ? '1' : '0');
    if (k >= 0) { dot.setAttribute('cx', DATE_DOT[k][0]); dot.setAttribute('cy', DATE_DOT[k][1]); }
    $$('.tk-date').forEach(function (d, i) { d.setAttribute('fill', i === k ? '#FFF4FD' : NAVY); });
    $('.tk-round-go').setAttribute('fill-opacity', k >= 0 ? '1' : '0.4');
    if (k >= 0) { $('.tk-pay-date').textContent = ROUNDS[k]; $('.tk-done-date').textContent = ROUNDS[k]; }
  }

  // 시작
  function start() {
    if (S.phase !== 'idle') return;
    S.phase = 'run'; S.t0 = performance.now();
    log.push(['> 대기열 우회 · 즉시 입장', '#C9962E'], ['> 보안문자 자동 입력 완료', '#E7C86E']);
    renderLog();
    showStep(1);
    kick();
  }
  function elapsed(now) { return ((S.tEnd || now) - S.t0) / 1000; }

  // 2: 보안문자
  function setCap(v) {
    S.cap = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    input.value = S.cap;
    var t = $('.tk-cap-text'); t.textContent = S.cap;
    var w = 0; try { w = S.cap ? t.getComputedTextLength() : 0; } catch (e) {}
    $('.tk-caret').setAttribute('x', (610.6 + w + 2).toFixed(1));
    var ok = S.cap.length === 5, b = $('.tk-cap-btn');
    b.setAttribute('fill', ok ? MINT : NAVY); b.setAttribute('fill-opacity', ok ? '1' : '0.35');
  }
  function submitCap() {
    if (S.cap.length < 5) { shake($('.tk-cap-box')); return; }
    if (S.cap === CAPTCHA) goSeats();
    else { shake($('.tk-cap-box')); setCap(''); }
  }
  function shake(node) {
    var start = performance.now();
    (function step(now) {
      var t = (now - start) / 400;
      node.setAttribute('transform', t < 1 ? 'translate(' + (Math.sin(t * 25) * 6 * (1 - t)).toFixed(2) + ' 0)' : '');
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  // 보안문자 입력
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!touch) input.readOnly = true;
  var JAMO = { 'ㅂ':'Q','ㅈ':'W','ㄷ':'E','ㄱ':'R','ㅅ':'T','ㅛ':'Y','ㅕ':'U','ㅑ':'I','ㅐ':'O','ㅔ':'P','ㅁ':'A','ㄴ':'S','ㅇ':'D','ㄹ':'F','ㅎ':'G',
    'ㅗ':'H','ㅓ':'J','ㅏ':'K','ㅣ':'L','ㅋ':'Z','ㅌ':'X','ㅊ':'C','ㅍ':'V','ㅠ':'B','ㅜ':'N','ㅡ':'M','ㅃ':'Q','ㅉ':'W','ㄸ':'E','ㄲ':'R','ㅆ':'T','ㅒ':'O','ㅖ':'P',
    'ㅘ':'HK','ㅙ':'HO','ㅚ':'HL','ㅝ':'NJ','ㅞ':'NP','ㅟ':'NL','ㅢ':'ML','ㄳ':'RT','ㄵ':'SW','ㄶ':'SG','ㄺ':'FR','ㄻ':'FA','ㄼ':'FQ','ㄽ':'FT','ㄾ':'FX','ㄿ':'FV','ㅀ':'FG','ㅄ':'QT' };
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  function toLatin(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i], c = ch.charCodeAt(0);
      if (c >= 0xAC00 && c <= 0xD7A3) {
        var n = c - 0xAC00, j = [CHO[Math.floor(n / 588)], JUNG[Math.floor(n % 588 / 28)], JONG[n % 28]];
        j.forEach(function (x) { if (x && x !== ' ') out += JAMO[x] || ''; });
      } else if (JAMO[ch]) out += JAMO[ch];
      else out += ch;
    }
    return out;
  }
  input.addEventListener('input', function () { if (touch) { setCap(toLatin(input.value)); act(); } });
  window.addEventListener('keydown', function (e) {
    if (!S || S.phase !== 'run' || S.step !== 2 || !visible || S.autoMode) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && t !== input && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var m = /^Key([A-Z])$/.exec(e.code || '') || /^(?:Digit|Numpad)([0-9])$/.exec(e.code || '');
    if (m) { e.preventDefault(); setCap(S.cap + m[1]); act(); }
    else if (e.key === 'Backspace') { e.preventDefault(); setCap(S.cap.slice(0, -1)); act(); }
    else if (e.key === 'Enter') { e.preventDefault(); submitCap(); }
  });
  // 입력칸을 누르면 (휴대폰) 키보드가 뜨도록 포커스
  input.addEventListener('click', function () { try { input.focus(); } catch (e) {} });

  function goSeats() { showStep(3); S.lastSteal = performance.now(); }
  function goCaptcha() { setCap(''); showStep(2); }

  // 3: 좌석
  function seatState(s, st) {
    s.setAttribute('data-state', st);
    if (st === 'sold') { s.setAttribute('fill', NAVY); s.setAttribute('fill-opacity', '0.16'); }
    else if (st === 'open') { s.setAttribute('fill', '#7E8FD8'); s.removeAttribute('fill-opacity'); }
    else if (st === 'mine') { s.setAttribute('fill', PINK); s.removeAttribute('fill-opacity'); }
  }
  function pickSeat(s) {
    if (S.step !== 3) return;
    act();
    var st = s.getAttribute('data-state');
    if (st === 'sold') { showToast(s); return; }
    if (S.seat && S.seat !== s) seatState(S.seat, 'open');
    S.seat = s; seatState(s, 'mine');
    $('.tk-seat-label').textContent = s.getAttribute('data-name');
    seatBtn();
  }
  function seatBtn() { $('.tk-seat-btn').setAttribute('fill-opacity', S.seat ? '1' : '0.4'); }
  var toastTimer = 0;
  function showToast(s) {
    var x = Math.max(400, Math.min(900, +s.getAttribute('x') - 110)), y = Math.max(560, +s.getAttribute('y') - 44);
    toast.setAttribute('transform', 'translate(' + (x - 520) + ' ' + (y - 592) + ')');
    toast.style.opacity = '1'; clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.style.opacity = '0'; }, 1300);
  }
  function stealSeat(now) {
    var open = seats.filter(function (s) { return s.getAttribute('data-state') === 'open'; });
    if (open.length <= 3) return;
    var s = open[Math.floor(Math.random() * open.length)];
    s.setAttribute('fill', RED); s.removeAttribute('fill-opacity'); s.setAttribute('data-state', 'taking');
    setTimeout(function () { if (s.getAttribute('data-state') === 'taking') seatState(s, 'sold'); }, 350);
  }
  seats.forEach(function (s) { s.addEventListener('click', function () { pickSeat(s); }); });

  // 4: 결제
  function setOpt(k) {
    S.opt = k;
    $$('.tk-opt').forEach(function (r) {
      var on = +r.getAttribute('data-opt') === k;
      r.setAttribute('fill', on ? '#EAF8FB' : 'none'); r.setAttribute('stroke', on ? MINT : NAVY); r.setAttribute('stroke-opacity', on ? '1' : '0.25');
    });
    $$('.tk-opt-dot').forEach(function (c) {
      var on = +c.getAttribute('data-opt') === k;
      c.setAttribute('fill', on ? MINT : 'none'); c.setAttribute('r', on ? '7.7' : '6.875');
      c.setAttribute('stroke', on ? 'none' : NAVY); c.setAttribute('stroke-opacity', '0.35'); c.setAttribute('stroke-width', '1.65');
    });
    payBtn();
  }
  function setAgree(on) {
    S.agree = on;
    var b = $('.tk-agree-box');
    b.setAttribute('fill', on ? MINT : 'none'); b.setAttribute('stroke', on ? 'none' : NAVY); b.setAttribute('stroke-opacity', '0.35'); b.setAttribute('stroke-width', '1.5');
    $('.tk-agree-check').setAttribute('opacity', on ? '1' : '0');
    payBtn();
  }
  function payBtn() { $('.tk-pay-btn').setAttribute('fill-opacity', S.opt >= 0 && S.agree ? '1' : '0.4'); }
  function pay() {
    if (S.opt < 0 || !S.agree) { shake($('.tk-pay-btn')); return; }
    finish();
  }

  // 5: 완료 -> 결과
  function finish() {
    var now = performance.now();
    S.tEnd = now;
    var sec = elapsed(now);
    $('.tk-done-time').textContent = hms(sec) + ' 소요 · 1장 확보';
    $('.tk-done-seat').textContent = (S.seat ? S.seat.getAttribute('data-name') : '') + ' · R석';
    log.push(['[' + hms(sec) + '] 완료 · ' + S.macro + '장 확보', '#E7C86E']); renderLog();
    showStep(5);
    setTimeout(function () { if (S.phase === 'run') showResult(sec); }, reduce ? 300 : 2200);
  }
  var piles, shards, shardC = [];
  function showResult(sec) {
    S.phase = 'result'; S.resultT = performance.now(); S.resultSec = sec;
    $('.tk-res-line .l1').textContent = '당신이 ' + human(sec) + ' 동안';
    result.setAttribute('display', 'inline'); result.style.opacity = '0';
    shardC = shards.map(function (s) { s.removeAttribute('transform'); try { var bb = s.getBBox(); return [(bb.x + bb.width / 2).toFixed(1), (bb.y + bb.height / 2).toFixed(1)]; } catch (e) { return [0, 0]; } });
    requestAnimationFrame(function () { result.style.opacity = '1'; });
    instr.style.opacity = '0'; auto.style.opacity = '0';
    input.style.display = 'none';
    $$('.tk-hit').forEach(function (h) { if (!h.closest('.tk-again')) h.setAttribute('data-off', '1'); });
    setHint(null); kick();
  }
  function drawResult(now) {
    var t = (now - S.resultT) / 1000;
    var k = Math.min(1, t / 1.1), e = 1 - Math.pow(1 - k, 3);
    $('.tk-res-num').textContent = Math.round(S.macro * e) + '장';
    piles.forEach(function (p, i) {
      var d = Math.min(1, Math.max(0, (t - 0.25 - i * 0.04) / 0.5)), ee = d * d;
      p.setAttribute('transform', 'translate(0 ' + (-260 * (1 - ee)).toFixed(1) + ')');
      p.setAttribute('opacity', (0.95 * Math.min(1, d * 3)).toFixed(3));
    });
    shards.forEach(function (s, i) {
      var c = shardC[i], a = t * 1.3 + i * 1.7, b = t * 0.9 + i * 2.3;
      var dx = Math.sin(a) * 26 + Math.sin(b * 2.1) * 8;
      var dy = Math.cos(a * 0.8) * 16 + Math.sin(b * 1.4) * 6 - (1 - Math.min(1, t)) * 60;
      var rot = Math.sin(a * 1.1 + i) * 28;
      s.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ') rotate(' + rot.toFixed(1) + ' ' + c[0] + ' ' + c[1] + ')');
    });
    return t < 3;
  }

  // 안내 깜빡임
  function setHint(target, pad) {
    if (!target) { hint.classList.remove('on'); return; }
    pad = pad || 5;
    var x = +target.getAttribute('x'), y = +target.getAttribute('y'), w = +target.getAttribute('width'), h = +target.getAttribute('height');
    hint.setAttribute('x', x - pad); hint.setAttribute('y', y - pad); hint.setAttribute('width', w + pad * 2); hint.setAttribute('height', h + pad * 2);
    hint.setAttribute('rx', Math.min(12, (h + pad * 2) / 2));
    hint.classList.add('on');
  }
  function hintTarget() {
    if (S.phase === 'idle') return $('.h-start');
    if (S.step === 2) return S.cap.length < 5 ? $('.tk-cap-box') : $('.h-cap-btn');
    if (S.step === 6) return S.round < 0 ? $('.h-date') : $('.h-round-go');
    if (S.step === 3) return S.seat ? $('.h-seat-btn') : seats.filter(function (s) { return s.getAttribute('data-state') === 'open'; })[0];
    if (S.step === 4) return S.opt < 0 ? $('.h-opt') : !S.agree ? $('.h-agree') : $('.h-pay');
    return null;
  }
  function act() { S.lastAct = performance.now(); setHint(null); }

  // 매 프레임
  function loop(now) {
    S.raf = 0;
    var busy = false;
    if (S.phase === 'run') {
      var sec = elapsed(now);
      timer.textContent = hms(sec);
      if (!S.tEnd) {
        var target = Math.min(MACRO_CAP, Math.floor(sec * MACRO_PER_SEC));
        while (S.macro < target) {
          var n = S.macro++, ts = Math.max(1, Math.round((n + 1) / MACRO_PER_SEC));
          log.push(['[' + hms(ts) + '] ' + macroSeat(n) + ' 확보 ✓', '#5BE49B']);
        }
        renderLog();
        count.textContent = S.macro + '장';
        if (S.step === 1) {
          var q = Math.min(1, (now - S.t0) / QUEUE_MS), e = 1 - Math.pow(1 - q, 2), left = Math.round(38204 * (1 - e));
          $('.tk-queue').textContent = left >= 10000 ? Math.floor(left / 10000) + ',' + ('000' + left % 10000).slice(-4) : left.toLocaleString('en-US');
          $('.tk-qbar').setAttribute('width', (329 * e).toFixed(1));
          if (q >= 1) showStep(6);
        }
        if (S.step === 3 && now - S.lastSteal > STEAL_MS) { S.lastSteal = now; stealSeat(now); }
      }
      busy = true;
    }
    if (S.phase === 'result') busy = drawResult(now) || busy;
    // 안내 깜빡임
    if (!S.autoMode && (S.phase === 'idle' || S.phase === 'run') && now - S.lastAct > IDLE_HINT_MS && visible) {
      var tg = hintTarget(); if (tg && !hint.classList.contains('on')) setHint(tg, tg.classList.contains('tk-seat') ? 4 : 5);
    }
    if (busy || visible) S.raf = requestAnimationFrame(loop);
  }
  function kick() { if (!S.raf) S.raf = requestAnimationFrame(loop); }

  // 자동으로 보기
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function runAuto() {
    if (S.autoMode || S.phase === 'result') return;
    S.autoMode = true; setHint(null);
    var my = S;
    var go = Promise.resolve();
    if (S.phase === 'idle') go = wait(400).then(start);
    go.then(function waitQueue() { return S.step === 1 ? wait(200).then(waitQueue) : null; })
      .then(function () { return wait(600); })
      .then(function () { if (my === S && S.step === 6) setRound(1); return wait(700); })
      .then(function () { if (my === S && S.step === 6) goCaptcha(); return null; })
      .then(function () { return S.step === 2 ? CAPTCHA.split('').reduce(function (p, ch, i) { return p.then(function () { return wait(i ? 260 : 600); }).then(function () { if (my === S) setCap(S.cap + ch); }); }, Promise.resolve()).then(function () { return wait(500); }).then(function () { if (my === S && S.step === 2) submitCap(); }) : null; })
      .then(function () { return wait(1400); })
      .then(function () { if (my !== S || S.step !== 3) return; var open = seats.filter(function (s) { return s.getAttribute('data-state') === 'open'; }); pickSeat(open[Math.floor(open.length / 2)]); return wait(800); })
      .then(function () { if (my === S && S.step === 3 && S.seat) { $('.tk-pay-seat').textContent = S.seat.getAttribute('data-name') + ' · R석'; showStep(4); } return wait(900); })
      .then(function () { if (my === S && S.step === 4) setOpt(0); return wait(700); })
      .then(function () { if (my === S && S.step === 4) setAgree(true); return wait(700); })
      .then(function () { if (my === S && S.step === 4) pay(); });
  }

  // 클릭 연결
  scene.addEventListener('click', function (e) {
    var h = e.target.closest('.tk-hit, .tk-auto, .tk-again');
    if (!h || !scene.contains(h)) return;
    if (h.closest('.tk-auto')) { runAuto(); return; }
    if (h.closest('.tk-again')) { reset(); return; }
    if (S.autoMode) return;
    act();
    var c = h.classList;
    if (c.contains('h-round') || c.contains('h-date')) { if (S.step === 6) setRound(+h.getAttribute('data-round')); }
    else if (c.contains('h-round-go')) { if (S.step === 6) { if (S.round >= 0) goCaptcha(); else { shake($('.tk-round-go')); setHint($('.h-date'), 4); } } }
    else if (c.contains('h-start')) start();
    else if (c.contains('h-cap-btn')) submitCap();
    else if (c.contains('h-cap-refresh')) { setCap(''); try { input.focus({ preventScroll: true }); } catch (err) {} }
    else if (c.contains('h-seat-btn')) { if (S.seat) { $('.tk-pay-seat').textContent = S.seat.getAttribute('data-name') + ' · R석'; showStep(4); } else shake($('.tk-seat-btn')); }
    else if (c.contains('h-opt')) setOpt(+h.getAttribute('data-opt'));
    else if (c.contains('h-agree')) setAgree(!S.agree);
    else if (c.contains('h-pay')) pay();
  });
  scene.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.tk-auto, .tk-again')) { e.preventDefault(); e.target.closest('.tk-auto') ? runAuto() : reset(); }
  });

  // 처음 상태 / 다시 해보기
  function reset() {
    if (S && S.raf) cancelAnimationFrame(S.raf);
    S = fresh();
    log = INTRO.slice(); renderLog(); count.textContent = '0장';
    timer.textContent = '00:00:00';
    $('.tk-queue').textContent = '3,8204'; $('.tk-qbar').setAttribute('width', '0');
    setCap('');
    seats.forEach(function (s) { seatState(s, s.getAttribute('data-orig')); });
    var mine = seats.filter(function (s) { return s.getAttribute('fill') === PINK; });
    seats.forEach(function (s) { if (s.getAttribute('data-orig') === 'open') seatState(s, 'open'); });
    $('.tk-seat-label').textContent = '좌석을 선택해 주세요'; seatBtn();
    setOpt(-1); setAgree(false); setRound(-1);
    result.setAttribute('display', 'none'); result.style.opacity = '0';
    instr.style.opacity = '1'; auto.style.opacity = '1';
    piles = $$('.tk-pile'); shards = $$('.tk-shard');
    shards.forEach(function (s) { s.removeAttribute('transform'); });
    showStep(0);
    kick();
  }
  var visible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { S.lastAct = performance.now(); kick(); } }).observe(scene);
  } else visible = true;
  reset();
})();


// 13. 양도와 암표의 구분
(function () {
  'use strict';

  var STAMP_AT = 700, STAMP_MS = 300;
  var CARD_AT = 1050, CARD_GAP = 160;
  var NUM_AT = 1750, NUM_MS = 1300;
  var END = NUM_AT + NUM_MS + 100;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    var def = $('.lw-def'), stamp = $('.lw-stamp'), stats = $('.lw-stats');
    var cards = Array.prototype.slice.call(scene.querySelectorAll('.lw-card'));
    var nums = Array.prototype.slice.call(scene.querySelectorAll('.lw-num'));
    var sop = +stamp.getAttribute('data-op') || 1;
    var bb = null, ring = null;

    function fmt(n, node) {
      var v = parseFloat(node.getAttribute('data-value')) * n, f = node.getAttribute('data-fmt');
      var s = f === 'comma' ? Math.round(v).toLocaleString('en-US') : v.toFixed(1);
      return (node.getAttribute('data-prefix') || '') + s + (node.getAttribute('data-suffix') || '');
    }
    function rise(node, a, d) {
      node.setAttribute('opacity', a.toFixed(3));
      node.setAttribute('transform', 'translate(0 ' + ((d || 20) * (1 - a)).toFixed(2) + ')');
    }
    function draw(t) {
      if (!bb) {
        try { var b = stamp.getBBox(); bb = [b.x + b.width / 2, b.y + b.height / 2, b.width / 2]; } catch (e) { bb = [1538, 315, 116]; }
        ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', bb[0]); ring.setAttribute('cy', bb[1]); ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#E5546B'); ring.setAttribute('stroke-width', '6');
        stamp.parentNode.insertBefore(ring, stamp);
      }
      // 정의 카드 + 도장이 찍힐 때 흔들림
      var hit = seg(t, STAMP_AT + STAMP_MS, STAMP_AT + STAMP_MS + 260), jig = hit > 0 && hit < 1 ? Math.sin(hit * 30) * 6 * (1 - hit) : 0;
      var a = easeOut(seg(t, 0, 500));
      def.setAttribute('opacity', a.toFixed(3));
      def.setAttribute('transform', 'translate(' + jig.toFixed(2) + ' ' + (20 * (1 - a)).toFixed(2) + ')');
      var s = seg(t, STAMP_AT, STAMP_AT + STAMP_MS), es = s * s;
      stamp.setAttribute('opacity', (sop * clamp(s * 2.5)).toFixed(3));
      // 위에서 크게(2.6배) 내려와 쾅 -> 살짝 눌렸다가 제자리
      var sq = hit > 0 && hit < 1 ? 1 - 0.06 * Math.sin(hit * Math.PI) : 1;
      stamp.setAttribute('transform', 'translate(' + (bb[0] + jig * 0.5).toFixed(2) + ' ' + bb[1] + ') rotate(' + (-18 * (1 - es)).toFixed(2) + ') scale(' + ((1 + 1.6 * (1 - es)) * sq).toFixed(3) + ') translate(' + (-bb[0]) + ' ' + (-bb[1]) + ')');
      var rg = seg(t, STAMP_AT + STAMP_MS, STAMP_AT + STAMP_MS + 650);
      ring.setAttribute('r', (bb[2] * (0.95 + 0.45 * easeOut(rg))).toFixed(1));
      ring.setAttribute('opacity', rg > 0 && rg < 1 ? (0.55 * (1 - rg)).toFixed(3) : '0');
      ring.setAttribute('stroke-width', (6 * (1 - rg) + 1).toFixed(2));
      cards.forEach(function (c, i) { rise(c, easeOut(seg(t, CARD_AT + i * CARD_GAP, CARD_AT + i * CARD_GAP + 450)), 24); });
      rise(stats, easeOut(seg(t, NUM_AT - 200, NUM_AT + 200)), 12);
      var n = easeOut(seg(t, NUM_AT, NUM_AT + NUM_MS));
      nums.forEach(function (node) { node.textContent = fmt(n, node); });
    }

    var token = 0, playing = false;
    function play() {
      if (playing) return;
      playing = true;
      var my = ++token, start = performance.now();
      if (reduce) { draw(END); return; }
      (function step(now) { if (my !== token) return; var t = now - start; draw(t); if (t < END) requestAnimationFrame(step); })(start);
    }
    function reset() { token++; playing = false; draw(-1); }
    if (window.lockTimeline && window.lockTimeline(scene, END, draw)) return;
    reset();
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.intersectionRatio >= 0.6) play();
        else if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
      });
    }, { threshold: [0, 0.6] }).observe(scene);
  }

  document.querySelectorAll('.law-scene').forEach(setup);
})();


// 14. 처벌 기준
(function () {
  'use strict';

  var LINE_MS = 1700;
  var X0 = 395, X1 = 1520;
  var CHIP_AT = LINE_MS + 250, CHIP_GAP = 110;
  var END = CHIP_AT + CHIP_GAP * 6 + 500;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { var c = 1.8; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  function setup(scene) {
    function $$(s) { return Array.prototype.slice.call(scene.querySelectorAll(s)); }
    var rect = scene.querySelector('.ls-line-rect'), head = scene.querySelector('.ls-head'), title = scene.querySelector('.ls-chips-title');
    var dots = $$('.ls-dot').map(function (d) { return { d: d, x: +d.getAttribute('cx'), y: +d.getAttribute('cy'), r: +d.getAttribute('r') }; });
    var cards = $$('.ls-card'), chips = $$('.ls-chip');
    function when(x) { return (x - X0) / (X1 - X0) * LINE_MS; }

    function draw(t) {
      var p = seg(t, 0, LINE_MS);
      rect.setAttribute('width', ((X1 - X0) * p).toFixed(1));
      head.setAttribute('opacity', seg(t, LINE_MS - 80, LINE_MS + 100).toFixed(3));
      dots.forEach(function (o, i) {
        var k = seg(t, when(o.x) - 40, when(o.x) + 260);
        o.d.setAttribute('r', (o.r * back(k)).toFixed(2));
        o.d.setAttribute('opacity', k > 0 ? '1' : '0');
        var a = easeOut(seg(t, when(o.x) + 60, when(o.x) + 560));
        cards[i].setAttribute('opacity', a.toFixed(3));
        cards[i].setAttribute('transform', 'translate(0 ' + (30 * (1 - a)).toFixed(2) + ')');
      });
      var ta = easeOut(seg(t, CHIP_AT - 250, CHIP_AT + 150));
      title.setAttribute('opacity', ta.toFixed(3));
      chips.forEach(function (c, i) {
        var e = back(seg(t, CHIP_AT + i * CHIP_GAP, CHIP_AT + i * CHIP_GAP + 380));
        c.setAttribute('opacity', clamp(e * 1.5).toFixed(3));
        c.setAttribute('transform', 'translate(0 ' + (14 * (1 - e)).toFixed(2) + ')');
      });
    }

    var token = 0, playing = false;
    function play() {
      if (playing) return;
      playing = true;
      var my = ++token, start = performance.now();
      if (reduce) { draw(END); return; }
      (function step(now) { if (my !== token) return; var t = now - start; draw(t); if (t < END) requestAnimationFrame(step); })(start);
    }
    function reset() { token++; playing = false; draw(-1); }
    if (window.lockTimeline && window.lockTimeline(scene, END, draw)) return;
    reset();
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.intersectionRatio >= 0.35) play();
        else if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
      });
    }, { threshold: [0, 0.35] }).observe(scene);
  }

  document.querySelectorAll('.steps-scene').forEach(setup);
})();


// 15. 거래 조건 체크
(function () {
  'use strict';

  var LABELS = [['갑자기 못 가게 돼서', '처음부터 되팔려고 샀어요'], ['이번 1장만', '여러 장·여러 번 팔아요'],
                ['내 계정으로 직접 예매', '다른 사람 계정·매크로로 예매'], ['산 가격 이하로', '산 가격보다 조금 비싸게', '정가의 2배 이상'],
                ['공식 양도 서비스로', '중고거래·SNS 직거래로']];
  var DRAW_MS = 320;
  var NAVY = '#364E7B', RED = '#E5546B', MINT = '#3FC6E2';
  var BADGE = {
    '해당': { fill: RED, stroke: 'none', text: '#FFFFFF', row: RED },
    'OK':   { fill: 'none', stroke: MINT, text: '#1FA9C6' },
    '참고': { fill: 'none', stroke: '#8B86BE', text: '#8B86BE' }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  // 고른 답 -> 결과 번호(0~3)와 줄별 표시
  function judge(ans) {
    var resell = ans[0] === 1, many = ans[1] === 1, macro = ans[2] === 1, markup = ans[3] >= 1, sns = ans[4] === 1;
    var r = macro ? 3 : (markup && (many || resell)) ? 2 : (markup || resell || many) ? 1 : 0;
    var marks = [resell, many, macro, markup].map(function (b) { return b ? '해당' : 'OK'; });
    marks.push(sns ? (r === 2 ? '해당' : '참고') : 'OK');
    return { r: r, marks: marks, n: marks.filter(function (m) { return m === '해당'; }).length };
  }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(scene.querySelectorAll(s)); }
    var quiz = $('.ck-quiz'), results = $('.ck-results'), resGroups = $$('.ck-res'), prog = $('.ck-prog');
    var pbars = $$('.ck-pbar'), goBtn = $('.ck-go-btn');
    var rows = $$('.ck-row'), bars = $$('.ck-bar'), count = $('.ck-count');
    var common = $('.ck-common');
    var marks = {};
    $$('.ck-mark').forEach(function (m) {
      var p = m.querySelector('.ck-scribble'), len = p.getTotalLength ? p.getTotalLength() : 300;
      p.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + (len + 10).toFixed(1));
      marks[m.getAttribute('data-q') + '-' + m.getAttribute('data-o')] = { g: m, p: p, len: len, fill: m.querySelector('.ck-fill'), anim: 0 };
    });
    var ans = [-1, -1, -1, -1, -1], view = 'quiz', resT = 0, result = null, raf = 0;

    // 칠하기
    function paint(mk, on) {
      var start = performance.now(), my = ++mk.anim;
      if (on) { mk.g.setAttribute('opacity', '1'); mk.fill.setAttribute('opacity', '0'); if (window.penFollow && !reduce) window.penFollow(mk.p, DRAW_MS); }
      (function step(now) {
        if (my !== mk.anim) return;
        var k = reduce ? 1 : clamp((now - start) / (on ? DRAW_MS : 160));
        if (on) {
          mk.p.setAttribute('stroke-dashoffset', (mk.len * (1 - k)).toFixed(1));
          mk.fill.setAttribute('opacity', (0.82 * seg(k, 0.55, 1)).toFixed(3));
        } else mk.g.setAttribute('opacity', (1 - k).toFixed(3));
        if (k < 1) requestAnimationFrame(step);
      })(start);
    }
    function choose(q, o) {
      if (view !== 'quiz') return;
      if (ans[q] === o) return;
      if (ans[q] >= 0) paint(marks[q + '-' + ans[q]], false);
      ans[q] = o; paint(marks[q + '-' + o], true);
      updateProgress();
    }
    function updateProgress() {
      var done = ans.filter(function (a) { return a >= 0; }).length;
      prog.textContent = done + ' / 5';
      pbars.forEach(function (b, i) { b.setAttribute('fill', ans[i] >= 0 ? MINT : NAVY); b.setAttribute('fill-opacity', ans[i] >= 0 ? '1' : '0.12'); });
      goBtn.setAttribute('fill-opacity', done === 5 ? '1' : '0.22');
      $$('.ck-go').forEach(function (h) { h.style.cursor = done === 5 ? 'pointer' : 'default'; });
    }

    // 결과
    function showResult() {
      if (ans.some(function (a) { return a < 0; })) { shake(goBtn); return; }
      result = judge(ans);
      resGroups.forEach(function (g) { g.setAttribute('display', +g.getAttribute('data-r') === result.r ? 'inline' : 'none'); });
      rows.forEach(function (row, k) {
        var m = result.marks[k], st = BADGE[m];
        row.querySelector('.ck-row-text').textContent = LABELS[k][ans[k]];
        row.querySelector('.ck-row-bg').setAttribute('opacity', m === '해당' ? '1' : '0');
        var bd = row.querySelector('.ck-row-border');
        bd.setAttribute('stroke', m === '해당' ? RED : NAVY); bd.setAttribute('stroke-opacity', m === '해당' ? '1' : '0.7'); bd.setAttribute('stroke-width', m === '해당' ? '2' : '1.5');
        var br = row.querySelector('.ck-badge-rect'), bt = row.querySelector('.ck-badge-text');
        br.setAttribute('fill', st.fill); br.setAttribute('stroke', st.stroke); br.setAttribute('stroke-width', '1.5');
        bt.setAttribute('fill', st.text); bt.textContent = m;
      });
      view = 'result'; resT = performance.now();
      quiz.style.opacity = '0';
      setTimeout(function () { if (view === 'result') quiz.setAttribute('display', 'none'); }, 300);
      results.setAttribute('display', 'inline');
      hitsFor();
      kick();
    }
    function backToQuiz() {
      view = 'quiz';
      results.setAttribute('display', 'none');
      quiz.setAttribute('display', 'inline'); quiz.style.opacity = '1';
      for (var q = 0; q < 5; q++) if (ans[q] >= 0) { var mk = marks[q + '-' + ans[q]]; mk.anim++; mk.g.setAttribute('opacity', '0'); }
      ans = [-1, -1, -1, -1, -1]; updateProgress(); hitsFor();
    }
    function drawResult(now) {
      var t = reduce ? 5000 : now - resT, g = resGroups[result.r];
      var head = g.querySelector('.ck-head'), pan = g.querySelector('.ck-panels'), stamp = g.querySelector('.ck-stamp');
      var a = easeOut(seg(t, 0, 450));
      head.setAttribute('opacity', a.toFixed(3)); head.setAttribute('transform', 'translate(0 ' + (16 * (1 - a)).toFixed(2) + ')');
      common.setAttribute('opacity', easeOut(seg(t, 100, 450)).toFixed(3));
      if (stamp) {
        var cx = +stamp.getAttribute('data-cx'), cy = +stamp.getAttribute('data-cy'), s = seg(t, STAMP_AT, STAMP_AT + 300), es = s * s;
        var hit = seg(t, STAMP_AT + 300, STAMP_AT + 560), sq = hit > 0 && hit < 1 ? 1 - 0.06 * Math.sin(hit * Math.PI) : 1;
        var jig = hit > 0 && hit < 1 ? Math.sin(hit * 30) * 5 * (1 - hit) : 0;
        stamp.setAttribute('opacity', (+stamp.getAttribute('data-op') * clamp(s * 2.5)).toFixed(3));
        stamp.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + (-18 * (1 - es)).toFixed(2) + ') scale(' + ((1 + 1.6 * (1 - es)) * sq).toFixed(3) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        head.setAttribute('transform', 'translate(' + jig.toFixed(2) + ' ' + (16 * (1 - a)).toFixed(2) + ')');
        var ring = stampRing(stamp), rg = seg(t, STAMP_AT + 300, STAMP_AT + 950);
        ring.setAttribute('r', (ring._r * (0.95 + 0.45 * easeOut(rg))).toFixed(1));
        ring.setAttribute('opacity', rg > 0 && rg < 1 ? (0.55 * (1 - rg)).toFixed(3) : '0');
        ring.setAttribute('stroke-width', (6 * (1 - rg) + 1).toFixed(2));
      }
      rows.forEach(function (row, k) {
        var e = easeOut(seg(t, 350 + k * 140, 750 + k * 140));
        row.setAttribute('opacity', e.toFixed(3)); row.setAttribute('transform', 'translate(' + (-16 * (1 - e)).toFixed(2) + ' 0)');
        var b = seg(t, 600 + k * 140, 820 + k * 140), bb = row.querySelector('.ck-badge');
        var sc = b < 1 ? 0.4 + 0.6 * easeOut(b) + Math.sin(b * Math.PI) * 0.18 : 1;
        bb.setAttribute('opacity', clamp(b * 2).toFixed(3));
        bb.setAttribute('transform', 'translate(890.5 ' + (290 + 100 * k) + ') scale(' + sc.toFixed(3) + ') translate(-890.5 ' + (-(290 + 100 * k)) + ')');
      });
      var filled = 0;
      bars.forEach(function (b, j) {
        var on = j < result.n && t >= 1250 + j * 160;
        if (on) filled++;
        b.setAttribute('fill', on ? RED : NAVY); b.setAttribute('fill-opacity', on ? '1' : '0.1');
      });
      count.textContent = '5개 중 ' + filled + '개';
      count.setAttribute('fill', result.n ? RED : MINT);
      pan.setAttribute('opacity', easeOut(seg(t, 700, 1150)).toFixed(3));
      pan.setAttribute('transform', 'translate(0 ' + (18 * (1 - easeOut(seg(t, 700, 1150)))).toFixed(2) + ')');
      return t < 1250 + 5 * 160 + 200;
    }
    var STAMP_AT = 550;
    function stampRing(stamp) {
      if (stamp._ring) return stamp._ring;
      var c = stamp.querySelector('circle'), col = (c && c.getAttribute('stroke')) || RED;
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      r.setAttribute('cx', stamp.getAttribute('data-cx')); r.setAttribute('cy', stamp.getAttribute('data-cy'));
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', col); r.setAttribute('opacity', '0');
      r._r = c ? +c.getAttribute('r') || 90 : 90;
      stamp.parentNode.insertBefore(r, stamp);
      return (stamp._ring = r);
    }
    function loop(now) { raf = 0; if (view === 'result' && drawResult(now)) raf = requestAnimationFrame(loop); }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function shake(node) {
      var start = performance.now();
      (function step(now) {
        var k = (now - start) / 380;
        node.setAttribute('transform', k < 1 ? 'translate(' + (Math.sin(k * 26) * 5 * (1 - k)).toFixed(2) + ' 0)' : '');
        if (k < 1) requestAnimationFrame(step);
      })(start);
    }

    // 누르기
    var hits = $$('.ck-hit');
    function hitsFor() {
      hits.forEach(function (h) {
        var c = h.classList, onResult = c.contains('ck-retry');
        h.setAttribute('data-off', (view === 'result') === onResult ? '0' : '1');
      });
    }
    function act(h) {
      if (h.getAttribute('data-off') === '1') return;
      var c = h.classList;
      if (c.contains('ck-go')) showResult();
      else if (c.contains('ck-retry')) backToQuiz();
      else choose(+h.getAttribute('data-q'), +h.getAttribute('data-o'));
    }
    hits.forEach(function (h) {
      h.addEventListener('pointerdown', function (e) { if (!h.classList.contains('ck-go') && !h.classList.contains('ck-retry')) { e.preventDefault(); act(h); } });
      h.addEventListener('click', function () { if (h.classList.contains('ck-go') || h.classList.contains('ck-retry')) act(h); });
      h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(h); } });
    });

    updateProgress(); hitsFor();
  }

  document.querySelectorAll('.check-scene').forEach(setup);
})();


// 16. 규제 이후 플랫폼
(function () {
  'use strict';

  function initSceneSlider(scene) {
    var range  = scene.querySelector('.scene-slider__range');
    var rewind = scene.querySelector('.scene-slider__rewind');
    var knob   = scene.querySelector('.ss-knob');
    var lines  = scene.querySelector('.ss-lines');
    var g2025  = scene.querySelectorAll('.ss-2025');
    var g2026  = scene.querySelectorAll('.ss-2026');
    if (!range || !knob) return;

    var TRACK = 1362 - 568;
    var WIN = 0.55;
    var SPEED = 0.8;
    var STRIDE = 3.8;
    var LEG = 48, ARM = 60;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function limb(el) {
      return el ? { el: el, px: el.dataset.px, py: el.dataset.py } : null;
    }
    var agents = Array.prototype.map.call(scene.querySelectorAll('.ss-agent'), function (el) {
      var run = el.querySelector('.ss-run');
      return {
        a: el.querySelector('.ss-a'),
        b: el.querySelector('.ss-b'),
        run: run,
        legB: run && limb(run.querySelector('.rl-b')),
        legF: run && limb(run.querySelector('.rl-f')),
        armB: run && limb(run.querySelector('.ra-b')),
        armF: run && limb(run.querySelector('.ra-f')),
        kind: el.dataset.kind,
        delay: parseFloat(el.dataset.delay) || 0,
        dx: parseFloat(el.dataset.dx) || 0,
        dy: parseFloat(el.dataset.dy) || 0,
        cx: 0, cy: 0,
        p: -1,
        phase: Math.random() * 6.28,
        swing: 0
      };
    });
    agents.forEach(function (ag) {
      if (!ag.run) return;
      var bb = ag.a.getBBox();
      ag.cx = bb.x + bb.width / 2;
      ag.cy = bb.y + bb.height / 2;
    });

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function smooth(a, b, t) { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); }
    function setOpacity(list, v) { for (var i = 0; i < list.length; i++) list[i].setAttribute('opacity', v.toFixed(3)); }
    function show(el, on) { if (el) el.setAttribute('opacity', on ? '1' : '0'); }
    function rot(l, deg) { if (l) l.el.setAttribute('transform', 'rotate(' + deg.toFixed(1) + ' ' + l.px + ' ' + l.py + ')'); }

    var target = range.value / range.max;
    var shown = target;

    function drawStatic(t) {
      knob.setAttribute('transform', 'translate(' + (TRACK * (range.value / range.max)).toFixed(1) + ' 0)');
      setOpacity(g2025, 1 - smooth(0, 0.25, t));
      if (lines) lines.setAttribute('opacity', smooth(0.1, 0.45, t).toFixed(3));
      setOpacity(g2026, smooth(0.75, 1, t));
      range.setAttribute('aria-valuetext', range.value / range.max < 0.5 ? '2025년' : '2026년');
    }

    function drawPeople(t, dt) {
      var busy = false;
      for (var i = 0; i < agents.length; i++) {
        var ag = agents[i];
        var p = clamp((t - ag.delay) / WIN);
        if (ag.kind === 'leave') { ag.a.setAttribute('opacity', (1 - p).toFixed(3)); ag.p = p; continue; }

        var moving = ag.p >= 0 && Math.abs(p - ag.p) > 1e-5;
        ag.p = p;
        var x = ag.dx * p, y = ag.dy * p;

        if (!ag.run || reduce) {
          // 달리는 그림이 없으면 예전처럼 위치만 이동
          ag.a.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
          show(ag.a, p < 0.5); show(ag.b, p >= 0.5);
          if (ag.b) ag.b.setAttribute('transform', 'translate(' + (x - ag.dx).toFixed(1) + ' ' + (y - ag.dy).toFixed(1) + ')');
          continue;
        }

        var running = p > 0 && p < 1;
        show(ag.a, p <= 0);
        show(ag.b, p >= 1);
        show(ag.run, running);
        if (!running) {
          ag.swing = 0;
          ag.a.removeAttribute('transform');
          if (ag.b) ag.b.setAttribute('transform', 'translate(0 0)');
          continue;
        }

        ag.swing += ((moving ? 1 : 0) - ag.swing) * Math.min(1, dt * 10);
        if (moving) ag.phase += dt * STRIDE * 6.2832;
        var s = (1 - Math.cos(ag.phase)) / 2 * ag.swing;
        var bob = -Math.abs(Math.sin(ag.phase)) * 2.2 * ag.swing;
        rot(ag.legB, -LEG * s);
        rot(ag.legF,  LEG * s);
        rot(ag.armB,  ARM * s);
        rot(ag.armF, -ARM * s);
        ag.run.setAttribute('transform',
          'translate(' + (ag.cx + x).toFixed(1) + ' ' + (ag.cy + y + bob).toFixed(1) + ')');
        if (moving || ag.swing > 0.01) busy = true;
      }
      return busy;
    }

    var raf = 0, last = 0;
    function tick(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      var diff = target - shown;
      var step = SPEED * dt;
      shown = reduce || Math.abs(diff) <= step ? target : shown + (diff > 0 ? step : -step);
      drawStatic(shown);
      var busy = drawPeople(shown, dt);
      if (shown !== target || busy) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }

    range.addEventListener('input', function () {
      target = range.value / range.max; drawStatic(shown); kick();
      if (window.sceneLockSet) window.sceneLockSet(scene, target * 0.9);
    });
    if (scene.hasAttribute('data-lock') && window.sceneLock) {
      window.addEventListener('scenelock', function () {
        var p = Math.min(1, window.sceneLock(scene) / 0.9);
        range.value = Math.round(p * range.max); target = p; drawStatic(shown); kick();
      });
    }
    range.addEventListener('pointerdown', function () { scene.classList.add('is-dragging'); });
    window.addEventListener('pointerup', function () { scene.classList.remove('is-dragging'); });

    // 되감기: 손잡이는 바로 2025로, 사람들은 뛰어서 돌아감
    if (rewind) {
      rewind.addEventListener('click', function () {
        range.value = 0; target = 0; drawStatic(shown); kick();
        if (window.sceneLockSet) window.sceneLockSet(scene, 0);
      });
      rewind.addEventListener('pointerenter', function () { scene.classList.add('is-rewind-hover'); });
      rewind.addEventListener('pointerleave', function () { scene.classList.remove('is-rewind-hover'); });
    }

    drawStatic(shown);
    drawPeople(shown, 0);
  }

  document.querySelectorAll('.scene-slider').forEach(initSceneSlider);
})();


// 17. 재판매의 목적
(function () {
  'use strict';

  var SPLIT = 60;
  var TEAR_X = 26, TEAR_Y = 10, TEAR_DEG = 9;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(scene.querySelectorAll(s)); }
    function count(node, d) {
      var v = parseFloat(node.getAttribute('data-value')), dec = node.hasAttribute('data-dec') ? +node.getAttribute('data-dec') : 1;
      node.textContent = (v * d).toFixed(dec) + '%';
    }
    function show(node, a, dy) {
      if (!node) return;
      node.setAttribute('opacity', a.toFixed(3));
      if (dy) node.setAttribute('transform', 'translate(0 ' + (dy * (1 - a)).toFixed(2) + ')');
    }

    var g1 = $('.rs-g1'), g2 = $('.rs-g2'), g3 = $('.rs-g3');
    var labs = {}; $$('.rs-lab').forEach(function (l) { labs[l.getAttribute('data-k')] = l; });
    var ticket = $('.rs-ticket'), stub = $('.rs-stub'), n80 = $('.rs-n80'), n80lab = $('.rs-n80-lab'), n94 = $('.rs-n94');
    var n51 = $('.rs-n51'), n51lab = $('.rs-n51-lab'), box = $('.rs-box'), curveRect = $('.rs-curve-rect'), pills = $$('.rs-pill');
    var xs = $$('.rs-x line').map(function (l) {
      var len = Math.hypot(l.getAttribute('x2') - l.getAttribute('x1'), l.getAttribute('y2') - l.getAttribute('y1'));
      l.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + (len + 10).toFixed(1));
      return { l: l, len: len };
    });

    // 사람 도표
    function drawPeople(t) {
      [g1, g2, g3].forEach(function (g) { g.classList.toggle('in', t >= 0); });
      g1.classList.toggle('on', t >= 900);
      var k1 = seg(t, 900, 2000);
      count(labs[1].querySelector('.rs-num'), easeOut(k1)); show(labs[1], easeOut(seg(t, 900, 1300)), 10);
      var s = t < 2000 ? 0 : back(seg(t, 2000, 2800));
      g2.setAttribute('transform', 'translate(' + (SPLIT * (1 - s)).toFixed(2) + ' 0)');
      g3.setAttribute('transform', 'translate(' + (-SPLIT * (1 - s)).toFixed(2) + ' 0)');
      g2.classList.toggle('on', t >= 2000); g3.classList.toggle('on', t >= 2000);
      [2, 3].forEach(function (k) {
        show(labs[k], easeOut(seg(t, 2300, 2700)), 8);
        count(labs[k].querySelector('.rs-num'), easeOut(seg(t, 2300, 3300)));
      });
    }
    // 재판매 동기
    function drawMotive(t) {
      var e = easeOut(seg(t, 0, 600));
      ticket.setAttribute('opacity', e.toFixed(3));
      ticket.setAttribute('transform', 'translate(' + (-50 * (1 - e)).toFixed(2) + ' 0)');
      n80.setAttribute('opacity', easeOut(seg(t, 0, 300)).toFixed(3)); count(n80, easeOut(seg(t, 200, 1300)));
      show(n80lab, easeOut(seg(t, 600, 1000)));
      var tr = '';
      if (t >= 1250 && t < 1500) tr = 'rotate(' + (Math.sin((t - 1250) / 18) * 1.4).toFixed(2) + ' 818 750)';
      else if (t >= 1500) { var k = back(seg(t, 1500, 2200)); tr = 'translate(' + (TEAR_X * k).toFixed(2) + ' ' + (TEAR_Y * k).toFixed(2) + ') rotate(' + (TEAR_DEG * k).toFixed(2) + ' 818 750)'; }
      stub.setAttribute('transform', tr);
      show(n94, easeOut(seg(t, 2000, 2400)), 10);
      count(n94.querySelector('.rs-num'), easeOut(seg(t, 2000, 2900)));
    }
    // 경로가 세 갈래로
    function drawPath(t) {
      n51.setAttribute('opacity', easeOut(seg(t, 0, 300)).toFixed(3)); count(n51, easeOut(seg(t, 0, 1100)));
      show(n51lab, easeOut(seg(t, 400, 800)));
      var b = easeOut(seg(t, 0, 400));
      box.setAttribute('opacity', (b * (1 - 0.5 * easeOut(seg(t, 1100, 1300)))).toFixed(3));
      box.setAttribute('transform', 'translate(0 ' + (10 * (1 - b)).toFixed(2) + ')');
      xs.forEach(function (x, i) {
        var d = easeOut(seg(t, 600 + i * 250, 850 + i * 250));
        x.l.setAttribute('stroke-dashoffset', (x.len * (1 - d)).toFixed(1));
        x.l.setAttribute('opacity', d > 0 ? '1' : '0');
      });
      curveRect.setAttribute('width', (150 * easeOut(seg(t, 1200, 1900))).toFixed(1));
      pills.forEach(function (p, i) {
        var e = back(seg(t, 1800 + i * 180, 2250 + i * 180));
        p.setAttribute('opacity', clamp(e).toFixed(3));
        p.setAttribute('transform', 'translate(' + (-14 * (1 - e)).toFixed(2) + ' 0)');
      });
    }

    var blocks = [
      { y: 285, draw: drawPeople, end: 3400 },
      { y: 760, draw: drawMotive, end: 3000 },
      { y: 760, draw: drawPath, end: 2800, delay: 500 }
    ];
    blocks.forEach(function (b) { b.t0 = 0; b.on = false; b.draw(-1); });

    var PARTS = [[0, 0.42], [0.36, 0.72], [0.66, 1]];
    if (window.lockTimeline && window.lockTimeline(scene, 1000, function (T) {
      blocks.forEach(function (b, i) {
        var k = T < 0 ? -1 : (T / 1000 - PARTS[i][0]) / (PARTS[i][1] - PARTS[i][0]);
        b.draw(k < 0 ? -1 : Math.min(1, k) * b.end);
      });
    })) return;

    var raf = 0;
    function tick(now) {
      raf = 0;
      var r = scene.getBoundingClientRect(), vh = window.innerHeight || 800, busy = false;
      if (r.top > vh) {
        blocks.forEach(function (b) { if (b.on) { b.on = false; b.draw(-1); } });
        return;
      }
      blocks.forEach(function (b) {
        var sy = r.top + b.y * r.height / 1080;
        if (!b.on && sy < vh * 0.82 && r.bottom > 0) { b.on = true; b.t0 = now + (b.delay || 0); }
        if (b.on) {
          var t = reduce ? b.end : now - b.t0;
          if (t <= b.end + 50) { b.draw(Math.max(-1, t)); busy = true; }
        }
      });
      if (busy) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    kick();
  }

  document.querySelectorAll('.resale-scene').forEach(setup);
})();


// 18. 비공식 거래의 우려
(function () {
  'use strict';

  var CARD_GAP = 220;
  var RISE_MS = 520;
  var FILL_MS = 1200;
  var RISE = 40;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    var cards = Array.prototype.map.call(scene.querySelectorAll('.cc-card'), function (g, i) {
      var num = g.querySelector('.cc-num'), bar = g.querySelector('.cc-bar');
      return { g: g, num: num, numNode: num.firstChild, value: parseFloat(num.getAttribute('data-value')),
               move: g.querySelector('.cc-bar-move'), w: +bar.getAttribute('data-w'), start: i * CARD_GAP };
    });
    var arrow = $('.cc-i-arrow'), q1 = $('.cc-i-q1'), q2 = $('.cc-i-q2'), tag = $('.cc-i-tag'), trend = $('.cc-i-trend');
    var ICON_T = (cards.length - 1) * CARD_GAP + RISE_MS;

    function draw(t) {
      cards.forEach(function (c) {
        var a = easeOut(seg(t, c.start, c.start + RISE_MS));
        c.g.setAttribute('opacity', a.toFixed(3));
        c.g.setAttribute('transform', 'translate(0 ' + (RISE * (1 - a)).toFixed(2) + ')');
        var d = easeOut(seg(t, c.start + RISE_MS * 0.5, c.start + RISE_MS * 0.5 + FILL_MS));
        c.numNode.nodeValue = (c.value * d).toFixed(1);
        c.move.setAttribute('transform', 'translate(' + (-c.w * (1 - d)).toFixed(2) + ' 0)');
      });
      // 아이콘 (계속 반복)
      var s = Math.max(0, t - ICON_T) / 1000, on = t >= ICON_T;
      var p = (s % 1.6) / 1.6;
      arrow.setAttribute('transform', on ? 'translate(' + (Math.sin(p * Math.PI) * 7).toFixed(2) + ' 0)' : '');
      q1.setAttribute('opacity', on ? (0.45 + 0.55 * (0.5 + 0.5 * Math.cos(s * 4))).toFixed(3) : '1');
      q2.setAttribute('opacity', on ? (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(s * 3.4 + 1))).toFixed(3) : '1');
      tag.setAttribute('transform', on ? 'rotate(' + (Math.sin(s * 3) * 7).toFixed(2) + ' 1467 225)' : '');
      var u = (s % 1.4) / 1.4;
      trend.setAttribute('transform', on ? 'translate(' + (-6 * (1 - u)).toFixed(2) + ' ' + (6 * (1 - u)).toFixed(2) + ')' : '');
      trend.setAttribute('opacity', on ? Math.min(1, Math.min(u * 4, (1 - u) * 5)).toFixed(3) : '1');
    }

    var token = 0, playing = false, visible = false, t0 = 0;
    function play() {
      if (playing) return;
      playing = true; t0 = performance.now();
      var my = ++token;
      (function step(now) {
        if (my !== token) return;
        var t = reduce ? ICON_T + FILL_MS : now - t0;
        draw(t);
        if (!reduce && (t < ICON_T + FILL_MS || visible)) requestAnimationFrame(step);
        else if (!reduce) playing = 'paused';
      })(t0);
    }
    function resume() {
      if (playing !== 'paused') return;
      playing = true; var my = ++token;
      (function step(now) { if (my !== token) return; draw(now - t0); if (visible) requestAnimationFrame(step); else playing = 'paused'; })(performance.now());
    }
    function reset() { token++; playing = false; draw(-1); }

    reset();
    if (!('IntersectionObserver' in window)) { visible = true; play(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible = en.isIntersecting;
        if (en.intersectionRatio >= 0.35) { if (!playing) play(); else resume(); }
        else if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
      });
    }, { threshold: [0, 0.35] }).observe(scene);
  }

  document.querySelectorAll('.concern-scene').forEach(setup);
})();


// 19. 마무리
(function () {
  'use strict';

  var TEAR_AT = 50;
  var TOP_UP = 90;
  // 아래 조각 최종 위치
  var END = { tx: 19.3, ty: 18.6, deg: 7.0148, cx: 985, cy: 660 };
  var TEAR_MS = 950, STAMP_AT = 1150, STAMP_MS = 260, BTN_AT = 1650;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }

  function setup(scene) {
    function $(s) { return scene.querySelector(s); }
    function $$(s) { return Array.prototype.slice.call(scene.querySelectorAll(s)); }
    var top = $('.tr-top'), bottom = $('.tr-bottom'), extras = $('.tr-extras'), stamp = $('.tr-stamp');
    var pull = $('.tr-pull'), grabs = $$('.tr-grab'), btns = $$('.tr-btn'), perf = document.querySelector('#tr-sheet .tr-perf');
    var bits = $$('.tr-bit').map(function (b) { return { g: b, cx: +b.getAttribute('data-cx'), cy: +b.getAttribute('data-cy'), op: +b.getAttribute('data-op') }; });
    var scx = +stamp.getAttribute('data-cx'), scy = +stamp.getAttribute('data-cy') + 20, sop = +stamp.getAttribute('data-op');

    var S = { phase: 'idle', drag: 0, dy0: 0, t0: 0 }, visible = false, raf = 0;

    function bottomPose(dy, e, k) {
      var deg = END.deg * k + dy * 0.035 * (1 - e);
      var tx = END.tx * e, ty = END.ty * e + dy * 0.5 * (1 - e) + 26 * Math.sin(Math.PI * e);
      return 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') rotate(' + deg.toFixed(3) + ' ' + END.cx + ' ' + END.cy + ')';
    }
    function draw(now) {
      var s = now / 1000;
      if (S.phase === 'idle') {
        top.setAttribute('transform', '');
        bottom.setAttribute('transform', bottomPose(S.drag, 0, 0));
        pull.setAttribute('transform', 'translate(0 ' + (reduce ? 0 : (Math.sin(s * 3.2) * 6 + S.drag * 0.6)).toFixed(2) + ')');
        pull.setAttribute('opacity', '1');
        return;
      }
      var t = reduce ? 4000 : now - S.t0;
      var e = easeOut(seg(t, 0, TEAR_MS)), k = back(seg(t, 0, TEAR_MS));
      top.setAttribute('transform', 'translate(0 ' + (-TOP_UP * easeOut(seg(t, 0, TEAR_MS * 0.8))).toFixed(2) + ')');
      // 도장이 찍히는 순간 아래 조각이 살짝 흔들림
      var hit = seg(t, STAMP_AT + STAMP_MS, STAMP_AT + STAMP_MS + 180), jig = hit > 0 && hit < 1 ? Math.sin(hit * 30) * 3 * (1 - hit) : 0;
      var pose = bottomPose(S.dy0 * (1 - e), e, k);
      bottom.setAttribute('transform', 'translate(0 ' + jig.toFixed(2) + ') ' + pose);
      extras.setAttribute('transform', 'translate(0 ' + (20 + jig).toFixed(2) + ')');
      pull.setAttribute('opacity', (1 - seg(t, 0, 200)).toFixed(3));
      bits.forEach(function (b, i) {
        var d = easeOut(seg(t, 80 + i * 18, 700 + i * 18));
        var fx = Math.sin(s * 1.3 + i * 1.7) * 5 * d, fy = Math.cos(s * 1.0 + i * 2.1) * 4 * d;
        b.g.setAttribute('transform', 'translate(' + fx.toFixed(2) + ' ' + ((Y0 - b.cy) * (1 - d) + fy).toFixed(2) + ')');
        b.g.setAttribute('opacity', (b.op * d).toFixed(3));
      });
      var a = seg(t, STAMP_AT, STAMP_AT + STAMP_MS), ea = a * a;
      var sc = 1 + 1.3 * (1 - ea), rot = -10 * (1 - ea);
      stamp.setAttribute('opacity', (sop * clamp(a * 2.5)).toFixed(3));
      stamp.setAttribute('transform', 'translate(' + scx + ' ' + scy + ') rotate(' + rot.toFixed(2) + ') scale(' + sc.toFixed(3) + ') translate(' + (-scx) + ' ' + (-scy) + ')');
      var bt = easeOut(seg(t, BTN_AT, BTN_AT + 450));
      btns.forEach(function (b, i) {
        var bb = easeOut(seg(t, BTN_AT + i * 120, BTN_AT + i * 120 + 450));
        b.setAttribute('opacity', bb.toFixed(3));
        b.setAttribute('data-off', bt > 0.5 ? '0' : '1');
      });
    }
    var Y0 = 660;

    function loop(now) {
      raf = 0; draw(now);
      if (visible || (S.phase === 'torn' && now - S.t0 < BTN_AT + 600)) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    function tear() {
      if (S.phase !== 'idle') return;
      S.phase = 'torn'; S.dy0 = S.drag; S.drag = 0; S.t0 = performance.now();
      if (perf) perf.setAttribute('opacity', '0');
      grabs.forEach(function (g) { g.setAttribute('data-off', '1'); });
      kick();
    }
    function reset() {
      S = { phase: 'idle', drag: 0, dy0: 0, t0: 0 };
      if (perf) perf.removeAttribute('opacity');
      grabs.forEach(function (g) { g.setAttribute('data-off', '0'); });
      bits.forEach(function (b) { b.g.setAttribute('opacity', '0'); });
      stamp.setAttribute('opacity', '0');
      btns.forEach(function (b) { b.setAttribute('opacity', '0'); b.setAttribute('data-off', '1'); });
      extras.setAttribute('transform', 'translate(0 20)');
      draw(performance.now());
    }

    // 끌어 내리기 / 누르기
    var down = null;
    grabs.forEach(function (g) {
      g.addEventListener('pointerdown', function (e) {
        if (S.phase !== 'idle') return;
        var r = scene.getBoundingClientRect();
        down = { y: e.clientY, scale: 1080 / r.height, moved: 0, id: e.pointerId };
        try { g.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      g.addEventListener('pointermove', function (e) {
        if (!down || S.phase !== 'idle') return;
        var dy = (e.clientY - down.y) * down.scale;
        down.moved = Math.max(down.moved, Math.abs(dy));
        S.drag = Math.max(0, Math.min(90, dy));
        if (S.drag >= TEAR_AT) { down = null; tear(); } else kick();
      });
      function up() {
        if (!down) return;
        var click = down.moved < 6; down = null;
        if (click) tear();
        else {
          var from = S.drag, t0 = performance.now();
          (function back(now) { var k = clamp((now - t0) / 250); if (S.phase !== 'idle') return; S.drag = from * (1 - easeOut(k)); draw(now); if (k < 1) requestAnimationFrame(back); })(t0);
        }
      }
      g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    // 버튼
    function act(b) {
      if (b.getAttribute('data-off') === '1') return;
      if (b.classList.contains('tr-home')) window.scrollTo({ top: 0, behavior: 'smooth' });
      else { var t = document.getElementById('frame-39'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { act(b); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(b); } });
    });

    reset();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) kick();
        else if (en[0].boundingClientRect.top > 0) reset();
      }).observe(scene);
    } else { visible = true; kick(); }
  }

  document.querySelectorAll('.tear-scene').forEach(setup);
})();
