// Motion layer. The HTML already holds every word, number and final chart state;
// this script only animates from a start state to what is authored.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initNavProgress();
  initLightbox();

  if (reduced || !window.gsap || !window.ScrollTrigger) {
    root.classList.remove('motion');
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-ready');

  initSmoothScroll();
  initMachine();
  initErpScene();
  initForecastScene();
  initReportingScene();
  initDriversScene();
  initHero();
  initReveals();
  initCounters();
  initParallax();
  initCapabilities();
  initTimeline();

  function initCapabilities() {
    var cards = gsap.utils.toArray('[data-cap]');
    if (!cards.length) return;
    replay(cards[0].parentElement, gsap.fromTo(cards, { opacity: 0, y: 60, rotateX: -8, transformOrigin: '50% 100%' }, {
      opacity: 1, y: 0, rotateX: 0,
      duration: 1.2, ease: 'expo.out', stagger: 0.12, clearProps: 'opacity,transform', paused: true
    }), 'top 80%');
  }

  // The career line draws itself as the reader scrolls through the roles.
  function initTimeline() {
    var fill = document.querySelector('[data-timeline-fill]');
    if (!fill) return;
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: fill.closest('.timeline'), start: 'top 70%', end: 'bottom 70%', scrub: 0.5 }
    });
  }

  // Waterfall builds bar by bar: plan and actual rise from the baseline,
  // favourable deltas grow up from the previous total, unfavourable ones grow down.
  function initDriversScene() {
    var section = document.querySelector('[data-scene="drivers"]');
    if (!section) return;
    var bars = gsap.utils.toArray('[data-step]', section);
    var values = gsap.utils.toArray('.waterfall__values text', section);
    var connectors = gsap.utils.toArray('[data-connectors] line', section);
    var finalBars = bars.map(function (bar) {
      return { top: parseFloat(bar.getAttribute('y')), height: parseFloat(bar.getAttribute('height')) };
    });
    var slot = 1 / bars.length;
    var ease = gsap.parseEase('expo.out');

    scene(section, function (progress) {
      bars.forEach(function (bar, i) {
        var barProgress = gsap.utils.clamp(0, 1, (progress - i * slot) / slot);
        var grown = finalBars[i].height * ease(barProgress);
        var growsDown = bar.getAttribute('data-grow') === 'down';
        bar.setAttribute('y', (growsDown ? finalBars[i].top : finalBars[i].top + finalBars[i].height - grown).toFixed(2));
        bar.setAttribute('height', grown.toFixed(2));
        values[i].style.opacity = gsap.utils.clamp(0, 1, (barProgress - 0.5) * 2);
        if (connectors[i - 1]) connectors[i - 1].style.opacity = barProgress > 0 ? 1 : 0;
      });
    });
  }

  // The progress line draws along the timeline; each milestone appears as the line reaches it.
  function initErpScene() {
    var section = document.querySelector('[data-scene="erp"]');
    if (!section) return;
    var line = section.querySelector('[data-erp-progress]');
    var x0 = parseFloat(line.getAttribute('data-x0')), x1 = parseFloat(line.getAttribute('data-x1'));
    var y = line.getAttribute('d').split(' ')[1];
    var milestones = gsap.utils.toArray('[data-milestone]', section);
    var counters = section.querySelectorAll('[data-scene-text][data-count]');
    var ease = gsap.parseEase('power2.inOut');

    scene(section, function (progress) {
      var eased = ease(progress);
      var x = x0 + (x1 - x0) * eased;
      line.setAttribute('d', 'M' + x0 + ' ' + y + ' L' + x.toFixed(1) + ' ' + y);
      milestones.forEach(function (m) {
        var at = parseFloat(m.getAttribute('data-at'));
        m.style.opacity = gsap.utils.clamp(0, 1, (x - at + 30) / 60);
      });
      counters.forEach(function (el) { el.textContent = countText(el, eased); });
    });
  }

  function initReportingScene() {
    var section = document.querySelector('[data-scene="reporting"]');
    if (!section) return;
    var bar = section.querySelector('[data-effort-from]');
    var variance = section.querySelector('[data-variance]');
    var varianceLine = variance.querySelector('line');
    var fromWidth = parseFloat(bar.getAttribute('data-effort-from'));
    var toWidth = parseFloat(bar.getAttribute('width'));
    var barLeft = parseFloat(bar.getAttribute('x'));
    var counters = section.querySelectorAll('[data-scene-text][data-count]');
    var ease = gsap.parseEase('power3.inOut');

    scene(section, function (progress) {
      var eased = ease(progress);
      var width = fromWidth + (toWidth - fromWidth) * eased;
      bar.setAttribute('width', width.toFixed(2));
      varianceLine.setAttribute('x1', (barLeft + width).toFixed(2));
      variance.style.opacity = Math.max(0, (eased - 0.35) / 0.65);
      counters.forEach(function (el) { el.textContent = countText(el, eased); });
    });
  }

  function initForecastScene() {
    var section = document.querySelector('[data-scene="forecast"]');
    if (!section) return;
    var svg = section.querySelector('svg');
    var band = svg.querySelector('[data-band]');
    var forecast = svg.querySelector('[data-forecast]');
    var phase = section.querySelector('[data-phase-label]');
    var counters = section.querySelectorAll('[data-scene-text][data-count]');
    var series = function (attr) { return band.getAttribute(attr).split(',').map(Number); };
    var naive = series('data-from'), final = series('data-to');
    var halfFrom = parseFloat(band.getAttribute('data-half-from'));
    var halfTo = parseFloat(band.getAttribute('data-half-to'));
    var plot = svg.getAttribute('data-plot').split(' ').map(Number); // left top width height
    var ymin = parseFloat(svg.getAttribute('data-ymin')), ymax = parseFloat(svg.getAttribute('data-ymax'));
    var xAt = function (i) { return plot[0] + i * (plot[2] / (final.length - 1)); };
    var yAt = function (v) { return plot[1] + plot[3] - (v - ymin) * (plot[3] / (ymax - ymin)); };
    var point = function (i, v) { return xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1); };
    var finalPhase = phase.textContent;
    var ease = gsap.parseEase('power2.inOut');

    scene(section, function (progress) {
      var eased = ease(progress);
      var values = final.map(function (v, i) { return naive[i] + (v - naive[i]) * eased; });
      var half = halfFrom + (halfTo - halfFrom) * eased;
      var upper = values.map(function (v, i) { return point(i, v + half); });
      var lower = values.map(function (v, i) { return point(i, v - half); }).reverse();
      band.setAttribute('d', 'M' + upper.join(' L') + ' L' + lower.join(' L') + ' Z');
      forecast.setAttribute('d', 'M' + values.map(function (v, i) { return point(i, v); }).join(' L'));
      counters.forEach(function (el) { el.textContent = countText(el, eased); });
      phase.textContent = progress < 0.5 ? 'Before: trend + judgment' : finalPhase;
    });
  }

  // Shared case-study pattern: the SVG is authored in its final state. The chart plays
  // `render(progress)` from 0 to 1 each time it comes into view; the page never holds the
  // scroll. Reaching 1 restores the authored markup exactly rather than trusting the maths.
  function scene(section, render) {
    var restore = snapshot(section);
    var state = { progress: 0 };
    var apply = function () { if (state.progress >= 1) restore(); else render(state.progress); };
    apply();
    replay(section.querySelector('.scene__figure'), gsap.to(state, {
      progress: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: apply, paused: true
    }), 'top 75%');
  }

  // Records the authored geometry, inline opacity and animated text of a scene; returns a restorer.
  function snapshot(section) {
    var geometry = ['d', 'x1', 'y', 'width', 'height'];
    var shapes = Array.prototype.map.call(section.querySelectorAll('svg *'), function (el) {
      return {
        el: el,
        attrs: geometry.filter(function (a) { return el.hasAttribute(a); }).map(function (a) { return [a, el.getAttribute(a)]; }),
        opacity: el.style.opacity
      };
    });
    var texts = Array.prototype.map.call(section.querySelectorAll('[data-scene-text]'), function (el) {
      return { el: el, text: el.textContent };
    });
    return function restore() {
      shapes.forEach(function (s) {
        s.attrs.forEach(function (a) { s.el.setAttribute(a[0], a[1]); });
        s.el.style.opacity = s.opacity;
      });
      texts.forEach(function (t) { t.el.textContent = t.text; });
    };
  }

  // The four stages stagger in as the pipeline line draws across (the line shows on wide screens).
  // Explicit end values (not from()): a from() tween reads its end state from the current style,
  // which can already be a hidden start state and leave the stages invisible.
  function initMachine() {
    var section = document.querySelector('.machine');
    if (!section) return;
    var stages = gsap.utils.toArray('[data-stage]', section);
    var tl = gsap.timeline({ paused: true })
      .fromTo(section, { '--machine-progress': 0 }, { '--machine-progress': 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .fromTo(stages, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.25, clearProps: 'opacity,transform'
      }, 0.1);
    replay(section.querySelector('.machine__stages'), tl);
  }

  // Fades and lifts [data-reveal] elements as they enter the viewport, from either direction.
  // Elements in the same section stagger in reading order.
  function initReveals() {
    gsap.utils.toArray('main > section, header').forEach(function (section) {
      gsap.utils.toArray('[data-reveal]', section).forEach(function (el, i) {
        replay(el, gsap.fromTo(el, { opacity: 0, y: 32 }, {
          opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: Math.min(i, 5) * 0.08, paused: true
        }), 'top 88%');
      });
    });
  }

  // Plays a paused animation whenever its trigger comes into view (scrolling down or back up)
  // and rewinds it once the trigger is fully off screen, so every visit replays it.
  function replay(trigger, animation, start) {
    ScrollTrigger.create({
      trigger: trigger,
      start: start || 'top 85%',
      end: 'bottom top', // scrolling back up, replay as soon as it peeks in at the top
      onEnter: function () { animation.restart(); },
      onEnterBack: function () { animation.restart(); }
    });
    whenOffScreen(trigger, function () { animation.pause(0); });
  }

  function whenOffScreen(el, reset) {
    ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onLeave: reset, onLeaveBack: reset });
  }

  // Scene readouts are driven by their scene's scroll progress, so they're excluded here.
  function initCounters() {
    document.querySelectorAll('main [data-count]:not([data-scene-text])').forEach(function (el) {
      replay(el, countUp(el, { duration: 1.8, paused: true }), 'top 90%');
    });
  }

  function initParallax() {
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      gsap.fromTo(el, { yPercent: -6 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function initSmoothScroll() {
    if (!window.Lenis) return;
    var lenis = new window.Lenis({ lerp: 0.1, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // The hero entrance plays on load and again whenever the reader scrolls back to the top.
  function initHero() {
    var hero = document.querySelector('.hero');
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.fromTo('[data-hero-line]', { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, stagger: 0.09, duration: 1.3 }, 0.1)
      .fromTo('[data-hero]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08, duration: 1.2 }, 0.35);

    document.querySelectorAll('.hero__line path').forEach(function (path, i) {
      var len = path.getTotalLength();
      tl.fromTo(path, { strokeDasharray: i === 0 ? '6 8' : len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' }, 0.3 + i * 0.25);
    });

    document.querySelectorAll('.hero [data-count]').forEach(function (el) {
      tl.call(function () { el.textContent = countText(el, 0); }, null, 0) // no flash of the final value before counting
        .add(countUp(el, { duration: 2, paused: false }), 0.6);
    });

    replay(hero, tl, 'top 85%');
  }

  // Counts a number up to the value authored in data-count, keeping the authored text as the final state.
  function countUp(el, opts) {
    var finalText = el.textContent;
    var state = { fraction: 0 };
    return gsap.to(state, Object.assign({
      fraction: 1,
      ease: 'power3.out',
      onUpdate: function () { el.textContent = countText(el, state.fraction); },
      onComplete: function () { el.textContent = finalText; }
    }, opts));
  }

  // Formats an in-between counter value: data-count-from (default 0) → data-count, with prefix/suffix.
  function countText(el, fraction) {
    var to = el.getAttribute('data-count');
    var from = parseFloat(el.getAttribute('data-count-from') || '0');
    var decimals = (to.split('.')[1] || '').length;
    var value = from + (parseFloat(to) - from) * fraction;
    return (el.getAttribute('data-prefix') || '') + value.toFixed(decimals) + (el.getAttribute('data-suffix') || '');
  }

  // Thumbnails link to the full image; with JS they open in a native <dialog> instead (Escape closes it).
  function initLightbox() {
    var dialog = document.querySelector('.lightbox');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    var img = dialog.querySelector('img');
    document.querySelectorAll('[data-lightbox]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        img.src = link.getAttribute('href');
        img.alt = link.querySelector('img').alt;
        dialog.showModal();
      });
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  function initNavProgress() {
    var bar = document.querySelector('.nav__progress');
    if (!bar) return;
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
