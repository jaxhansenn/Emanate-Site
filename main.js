/* Emanate AI — site interactions. No build step, no dependencies required.
   Lenis (smooth scrolling) is used if it loaded from the CDN; everything works without it. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- Smooth scroll ---------- */
  if (window.Lenis && !reduce) {
    var lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -70 }); }
      });
    });
  }

  /* ---------- Page load ---------- */
  function ready() { document.body.classList.add('loaded'); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { setTimeout(ready, 60); }); setTimeout(ready, 1200); }
  else { ready(); }

  /* ---------- Nav ---------- */
  var nav = document.querySelector('.nav');
  var lastY = 0;
  function onNav() {
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 30);
    var menuOpen = document.getElementById('navLinks').classList.contains('open');
    nav.classList.toggle('hide', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
  }
  window.addEventListener('scroll', onNav, { passive: true }); onNav();
  document.getElementById('navToggle').addEventListener('click', function () {
    var l = document.getElementById('navLinks');
    l.classList.toggle('open');
    this.setAttribute('aria-expanded', l.classList.contains('open'));
  });

  /* Industries dropdown: tap to open on touch screens, Escape to close */
  document.querySelectorAll('.dd').forEach(function (dd) {
    var b = dd.querySelector('.dd-btn');
    b.addEventListener('click', function (e) { e.stopPropagation(); var o = dd.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    document.addEventListener('click', function () { dd.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
    dd.addEventListener('keydown', function (e) { if (e.key === 'Escape') { dd.classList.remove('open'); b.focus(); } });
  });

  /* ---------- Hero: rings emanating, tasks flipping to done ---------- */
  var hero = document.querySelector('.hero');
  var canvas = hero && hero.querySelector('canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var chipBox = hero.querySelector('.chips');
    var chips = [].slice.call(hero.querySelectorAll('.chip'));
    var W, H, dpr, ox, oy, maxR, mobile;
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobile = W < 760;
      var box = chipBox.getBoundingClientRect(), hb = hero.getBoundingClientRect();
      chips.forEach(function (c) {
        var x = parseFloat(mobile ? c.dataset.mx : c.dataset.x), y = parseFloat(mobile ? c.dataset.my : c.dataset.y);
        c.style.left = x + '%'; c.style.top = y + '%';
        c._x = (box.left - hb.left) + box.width * x / 100;
        c._y = (box.top - hb.top) + box.height * y / 100;
      });
      if (mobile) { ox = W * 0.5; oy = (box.bottom - hb.top) - 6; }
      else { ox = W * 0.72; oy = H * 0.56; }
      chips.forEach(function (c) { c._d = Math.hypot(c._x - ox, c._y - oy); });
      maxR = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 40;
    }
    layout(); window.addEventListener('resize', layout);

    var PERIOD = 1500, LIFE = 5200, CYCLE = 11000;
    var start = performance.now();
    function draw(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);
      // glow at origin
      var g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 180);
      g.addColorStop(0, 'rgba(61,123,255,0.55)'); g.addColorStop(1, 'rgba(61,123,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, 180, 0, Math.PI * 2); ctx.fill();
      // rings
      var cyc = t % CYCLE;
      var n = Math.ceil(LIFE / PERIOD) + 1;
      var firstWave = 1e9;
      for (var i = 0; i < n; i++) {
        var age = (t % PERIOD) + i * PERIOD;
        if (age > LIFE) continue;
        var p = age / LIFE;
        var r = 26 + p * maxR;
        var a = (1 - p) * 0.55;
        ctx.lineWidth = 2 + (1 - p) * 2;
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,200,61,' + a + ')' : 'rgba(140,175,255,' + a + ')';
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke();
      }
      // core
      ctx.fillStyle = '#3D7BFF'; ctx.beginPath(); ctx.arc(ox, oy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 24, 0, Math.PI * 2); ctx.stroke();
      // the first full wave of each cycle "handles" the tasks it reaches
      var waveR = 26 + (cyc - 900) / LIFE * maxR;
      chips.forEach(function (c) {
        var done = cyc > 900 && waveR >= c._d && cyc < CYCLE - 1400;
        if (done !== c._done) { c._done = done; c.classList.toggle('is-done', done); }
      });
    }
    if (reduce) {
      chips.forEach(function (c) { c.classList.add('is-done'); });
      ctx.fillStyle = '#3D7BFF'; ctx.beginPath(); ctx.arc(ox, oy, 14, 0, Math.PI * 2); ctx.fill();
      for (var k = 1; k < 6; k++) { ctx.strokeStyle = 'rgba(140,175,255,' + (0.4 - k * 0.06) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, k * 90, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      // pause when off screen
      var heroVisible = true;
      new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }).observe(hero);
      (function frame(now) { if (heroVisible) draw(now); requestAnimationFrame(frame); })(performance.now());
    }
  }

  /* ---------- Sticky story ---------- */
  var story = document.querySelector('.story');
  if (story) {
    var steps = [].slice.call(story.querySelectorAll('.story-step'));
    var dots = [].slice.call(story.querySelectorAll('.story-dots i'));
    var screen = story.querySelector('.phone-screen');
    var clock = story.querySelector('.clock');
    var ampm = story.querySelector('.ampm');
    var notes = [].slice.call(story.querySelectorAll('.note'));
    var current = -1;
    function onStory() {
      if (window.innerWidth <= 1020) return;
      var r = story.getBoundingClientRect();
      var total = story.offsetHeight - window.innerHeight;
      var p = Math.min(Math.max(-r.top / total, 0), 0.9999);
      var idx = Math.floor(p * steps.length);
      var sub = (p * steps.length) - idx;
      dots.forEach(function (d, i) { d.style.setProperty('--p', i < idx ? 1 : i === idx ? sub : 0); });
      if (idx !== current) {
        current = idx;
        steps.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
        var s = steps[idx];
        clock.textContent = s.dataset.time; ampm.textContent = s.dataset.ampm;
        screen.setAttribute('data-step', idx);
      }
      notes.forEach(function (n) {
        var ns = +n.dataset.step, which = +n.dataset.n;
        n.classList.toggle('on', ns === idx && (which === 0 ? true : sub > 0.4));
        n.style.display = ns === idx ? '' : 'none';
      });
    }
    window.addEventListener('scroll', onStory, { passive: true }); window.addEventListener('resize', onStory); onStory();
  }


  /* ---------- Industry calculators ---------- */
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-AU'); };
  var num = function (n) { return (Math.round(n * 10) / 10).toLocaleString('en-AU'); };
  var MODELS = {
    'real-estate': function (v) {
      var appr = v.contacts * v.rate / 100, listings = appr * v.win / 100, per = v.price * v.comm / 100;
      return { big: listings * per, lines: [['Appraisals booked', num(appr)], ['Listings won', num(listings)], ['Commission per listing', money(per)]] };
    },
    'trades': function (v) {
      var jobs = v.calls * (v.real / 100) * (v.win / 100) * v.weeks;
      return { big: jobs * v.job, lines: [['Real jobs missed a week', num(v.calls * v.real / 100)], ['Jobs you would have won, a year', num(jobs)], ['Each one worth', money(v.job)]] };
    },
    'allied-health': function (v) {
      var slots = v.empty * v.weeks;
      return { big: slots * v.price, lines: [['Unfilled appointments a year', num(slots)], ['Each one worth', money(v.price)], ['That is about', money(v.empty * v.price) + ' a week']] };
    },
    'gyms': function (v) {
      var lost = v.enq * (1 - v.join / 100) * 12, member = v.price * 52 / 12 * v.months;
      return { big: lost * member, lines: [['People who asked but didn\'t join, a year', num(lost)], ['Each member is worth', money(member)], ['Members joining now, a year', num(v.enq * v.join / 100 * 12)]] };
    },
    'local-business': function (v) {
      var n = v.noshow * v.weeks;
      return { big: n * v.price, lines: [['Empty bookings a year', num(n)], ['Each one worth', money(v.price)], ['That is about', money(v.noshow * v.price) + ' a week']] };
    }
  };
  document.querySelectorAll('.calc').forEach(function (box) {
    var model = MODELS[box.getAttribute('data-calc')];
    var inputs = [].slice.call(box.querySelectorAll('input[data-k]'));
    var rec = box.querySelector('[data-rec]');
    var bigEl = box.querySelector('.big'), linesEl = box.querySelector('.calc-lines');
    var shown = 0, anim;
    function setBig(target) {
      cancelAnimationFrame(anim);
      if (reduce) { shown = target; bigEl.textContent = money(target); return; }
      var from = shown, t0 = performance.now();
      (function step(now) {
        var k = Math.min((now - t0) / 450, 1), e = 1 - Math.pow(1 - k, 3);
        shown = from + (target - from) * e; bigEl.textContent = money(shown);
        if (k < 1) anim = requestAnimationFrame(step);
      })(t0);
    }
    function update() {
      var v = {};
      inputs.forEach(function (i) { var x = parseFloat(i.value); v[i.dataset.k] = isFinite(x) && x > 0 ? x : 0; });
      var r = model(v);
      setBig(r.big);
      linesEl.innerHTML = r.lines.map(function (l) { return '<li><span>' + l[0] + '</span><b>' + l[1] + '</b></li>'; }).join('');
      if (rec) {
        box.querySelector('.rec-pct').textContent = rec.value;
        box.querySelector('.rec-val').textContent = money(r.big * rec.value / 100);
        rec.style.setProperty('--fill', rec.value + '%');
      }
    }
    inputs.forEach(function (i) { i.addEventListener('input', update); });
    if (rec) rec.addEventListener('input', update);
    update();
  });

  /* ---------- Play-once animations, counters ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      if (el.classList.contains('anim')) el.classList.add('play');
      if (el.hasAttribute('data-count')) count(el);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.anim, [data-count]').forEach(function (el) { io.observe(el); });
  function count(el) {
    var to = +el.getAttribute('data-count'), out = el.querySelector('.n');
    if (reduce) { out.textContent = to.toLocaleString('en-AU'); return; }
    var from = +el.getAttribute('data-from') || 0, t0 = performance.now(), dur = 1600;
    (function step(now) {
      var k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 4);
      out.textContent = Math.round(from + (to - from) * e).toLocaleString('en-AU');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Scroll-linked bits ---------- */
  var fill = document.querySelector('.steps-fill');
  var stepsBox = document.querySelector('.steps');
  var stepEls = [].slice.call(document.querySelectorAll('.step'));
  var photo = document.querySelector('.about-photo img');
  var trades = document.querySelector('.trades');
  var words = trades ? [].slice.call(trades.querySelectorAll('span')) : [];
  function onScroll() {
    var vh = window.innerHeight;
    if (fill && stepsBox) {
      var r = stepsBox.getBoundingClientRect();
      var p = Math.min(Math.max((vh * 0.62 - r.top) / r.height, 0), 1);
      fill.style.height = (p * (r.height - 16)) + 'px';
      stepEls.forEach(function (s) { s.classList.toggle('lit', s.getBoundingClientRect().top < vh * 0.62); });
    }
    if (photo && !reduce) {
      var pr = photo.parentElement.getBoundingClientRect();
      var q = (pr.top + pr.height / 2 - vh / 2) / vh;
      photo.style.transform = 'translateY(' + (-7 + q * -8) + '%)';
    }
    if (trades) {
      var tr = trades.getBoundingClientRect();
      var tp = Math.min(Math.max((vh * 0.85 - tr.top) / (tr.height + vh * 0.35), 0), 1);
      var lit = Math.round(tp * words.length);
      words.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
