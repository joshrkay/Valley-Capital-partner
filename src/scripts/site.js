(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  // The header becomes a frosted bar once the page has scrolled.
  var bar = document.querySelector('.bar');
  function onScroll() { if (bar) bar.classList.toggle('solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Close the mobile menu after choosing a link.
  var menu = document.querySelector('.menu');
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });

  // Motion, after Blue Owl: blocks rise into place as they scroll into view, one second each, and blocks that arrive together
  // are staggered 150ms apart. Audience rows slide in from the left instead. Each block plays once. The hero headline starts
  // light blue and settles to white 750ms after load (that part is CSS only). Content stays readable before any of it runs,
  // without scripts, and with reduced motion (nothing below is set up in that case; see .motion in site.css).
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('motion');

    var UP = '.head, .intro > *, .cells > div, .grid3 > div, .steps li, .spec > div, .feature .wrap > *, .cap > *, .articles article, .table-scroll, .toc li, .cta .wrap > *, .panel, .acc, .tl, .ranges, .cards .card, .story .wrap > *';
    var LEFT = '.rows .row';
    var STAGGER = 150, UP_DELAY = 200, LEFT_DELAY = 250, DURATION = 1000;

    // When a block has finished moving, hand it back to its own styles so hover states and transitions work again.
    function finish(el) { el.classList.remove('reveal', 'reveal-left', 'in'); el.style.transitionDelay = ''; }

    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });   // top of the page first
      batch.forEach(function (el, k) {
        var delay = (el.classList.contains('reveal-left') ? LEFT_DELAY : UP_DELAY) + Math.min(k, 5) * STAGGER;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('in');
        io.unobserve(el);
        setTimeout(function () { finish(el); }, delay + DURATION + 100);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    document.querySelectorAll(UP).forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
    document.querySelectorAll(LEFT).forEach(function (el) { el.classList.add('reveal-left'); io.observe(el); });
  }
})();
