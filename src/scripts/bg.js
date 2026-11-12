/* Faded background video. One fixed layer behind the page: clips crossfade as the story beats scroll by, and the whole
   layer quietens once you are past the hero so the text stays easy to read. Pages without video markup do nothing. */
(function () {
  var layer = document.querySelector('.bgv');
  if (!layer) return;
  var root = document.documentElement;
  var conn = navigator.connection || {};
  if (conn.saveData) { layer.style.display = 'none'; return; }            // data-saver: the dark gradient only
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lite = window.innerWidth < 700;                                       // phones: one clip, no swapping

  var vids = {}, slots = [];
  Array.prototype.forEach.call(layer.querySelectorAll('video'), function (v) { vids[v.dataset.slot] = v; slots.push(v.dataset.slot); });
  if (!slots.length) return;

  // each section picks a clip and a strength; sections without their own inherit the clip and fade right down
  var afterStory = false, last = { bg: slots[0], op: '.12' };
  var secs = Array.prototype.slice.call(document.querySelectorAll('.hero, main > section'));
  secs.forEach(function (s) {
    if (s.dataset.bg) { last = { bg: s.dataset.bg, op: s.dataset.op || '.3' }; if (s.dataset.bg === 'purchase') afterStory = true; }
    else { s.dataset.bg = last.bg; if (!s.dataset.op) s.dataset.op = afterStory ? '.08' : '.12'; }
    if (lite || !vids[s.dataset.bg]) s.dataset.bg = slots[0];
  });

  var current = null;
  function play(v) { if (reduce) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function ensure(slot) { var v = vids[slot]; if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); } return v; }
  function show(slot) {
    if (slot === current) return;
    current = slot;
    Object.keys(vids).forEach(function (k) {
      var v = vids[k];
      if (k === slot) { ensure(k); v.classList.add('on'); play(v); }
      else { v.classList.remove('on'); setTimeout(function () { if (!v.classList.contains('on')) v.pause(); }, 1800); }
    });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var mid = window.innerHeight * 0.5, active = secs[0];
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= mid) active = s; });
    if (active) { show(active.dataset.bg); root.style.setProperty('--bgop', active.dataset.op); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('visibilitychange', function () {
    var v = vids[current]; if (!v) return;
    if (document.hidden) v.pause(); else play(v);
  });
  update();
})();
