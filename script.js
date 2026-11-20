// 장면 그림 넣기
(function () {
  var art = window.SCENE_ART || {};
  Object.keys(art).forEach(function (id) {
    var scene = document.getElementById(id);
    if (scene) scene.insertAdjacentHTML('afterbegin', art[id]);
  });
})();


// 1. 초대장
(function () {
  'use strict';

  var EX = 137, EY = 77, ESX = 1647 / 1673, ESY = 925 / 940;
  var T_BOX = [50, 177, 1573, 580];
  // 봉투 속 티켓 자리 -> 마지막 자리
  var START = [EX + 243 * ESX, EY + 166 * ESY, 1186 * ESX, 469 * ESY];
  var FS = 1401 / 1673;
  var END = [260 + 50 * FS, 146 + 177 * (787 / 940), 1573 * FS, 580 * (787 / 940)];
  var LIFT = 115, ENV_DROP1 = 235, ENV_DROP2 = 620;
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
      var d1 = easeInOut(seg(t, 0, P1)), d2 = easeInOut(seg(t, P1 - 120, P2 - 150));
      var envDy = ENV_DROP1 * d1 + (ENV_DROP2 - ENV_DROP1) * d2;
      env.setAttribute('transform', 'translate(0 ' + envDy.toFixed(2) + ')');
      env.setAttribute('opacity', (t < 0 ? 0 : 1 - d2).toFixed(3));
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
    function open() {
      if (opened) return;
      opened = true; hit.setAttribute('data-off', '1'); hint.classList.remove('pulse');
      if (reduce) { draw(P2); return; }
      t0 = performance.now();
      (function step(now) { var t = now - t0; draw(t); if (t < P2 + 30) requestAnimationFrame(step); })(t0);
    }
    draw(-1);
    hint.classList.add('pulse');
    hit.addEventListener('click', open);
    hit.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  document.querySelectorAll('.intro-scene').forEach(setup);
})();


// 2. 체크 / 도장 / 다시 판단
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DRAW_MS = 160;

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


// 3. 말풍선 타이핑
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


// 4. 암표 구매 경험
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


// 5. 나이대 고르기
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


// 6. 이용자 인식
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


// 7. 암표 거래 규모
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
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(scene);
  } else visible = true;
  onScroll();
})();


// 8. 가격 상승
(function () {
  'use strict';

  var ROW = 28;
  var RATE = 5;
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
      paper: g.querySelector('.rc-paper'), rows: g.querySelectorAll('.rc-row'), bottom: g.querySelector('.rc-bottom'),
      total: g.querySelector('.rc-total'), rmult: g.querySelector('.rc-rmult'),
      amount: top.querySelector('.rc-amount'), mult: top.querySelector('.rc-mult'),
      stamp: stamp, stampOp: parseFloat(stamp.getAttribute('data-op')) || 1,
      cx: +g.getAttribute('data-stamp-cx'), cy: +g.getAttribute('data-stamp-cy'),
      shown: -1, value: 0, stamped: false, stampT: 0
    };
  });
  var MAX = Math.max.apply(null, receipts.map(function (r) { return r.max; }));

  function progress() {
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
      var grow = Math.min(rc.max, s), n = Math.floor(grow + 1e-6), frac = grow - n;
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
    if (draw(now) || moving) raf = requestAnimationFrame(loop); else lastT = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function onScroll() { target = progress() * MAX; kick(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();


// 9. 일반 예매 vs 매크로
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


// 10. 양도와 암표의 구분
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


// 11. 처벌 기준
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


// 12. 거래 조건 체크
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
      if (on) { mk.g.setAttribute('opacity', '1'); mk.fill.setAttribute('opacity', '0'); }
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


// 13. 규제 이후 플랫폼
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

    range.addEventListener('input', function () { target = range.value / range.max; drawStatic(shown); kick(); });
    range.addEventListener('pointerdown', function () { scene.classList.add('is-dragging'); });
    window.addEventListener('pointerup', function () { scene.classList.remove('is-dragging'); });

    // 되감기: 손잡이는 바로 2025로, 사람들은 뛰어서 돌아감
    if (rewind) {
      rewind.addEventListener('click', function () {
        range.value = 0; target = 0; drawStatic(shown); kick();
      });
      rewind.addEventListener('pointerenter', function () { scene.classList.add('is-rewind-hover'); });
      rewind.addEventListener('pointerleave', function () { scene.classList.remove('is-rewind-hover'); });
    }

    drawStatic(shown);
    drawPeople(shown, 0);
  }

  document.querySelectorAll('.scene-slider').forEach(initSceneSlider);
})();


// 14. 재판매의 목적
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


// 15. 비공식 거래의 우려
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


// 16. 마무리
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
