/* Hero video. Each hero section may hold one dimmed, looping video. It loads when the hero is near the screen, plays only while the
   hero is visible, and fades in once its first frame is ready. Nothing else on the page has video. Paused for reduced-motion
   (the first frame still shows); removed entirely for data-saver. */
(function () {
  var wraps = document.querySelectorAll('.hero-media');
  if (!wraps.length) return;
  var conn = navigator.connection || {};
  if (conn.saveData) { Array.prototype.forEach.call(wraps, function (w) { w.remove(); }); return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(wraps, function (wrap) {
    var v = wrap.querySelector('video');
    if (!v) return;
    var hero = wrap.closest('.hero') || wrap;
    var visible = true;
    function play() { if (reduce || !visible) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    function load() { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); } }
    v.addEventListener('loadeddata', function () { v.playbackRate = 0.5; v.classList.add('on'); });     // half speed: calmer
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { load(); play(); } else { v.pause(); }
      }, { rootMargin: '120px' }).observe(hero);
    } else { load(); play(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) v.pause(); else play(); });
  });
})();
