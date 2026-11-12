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

  // Sections settle into place as they enter the viewport. Content stays readable before it does, and without scripts.
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    var targets = document.querySelectorAll('.head, .intro > *, .cells > div, .grid3 > div, .steps li, .spec > div, .feature .wrap > *, .cap > *, .articles article, .table-scroll, .toc li, .cta .wrap > *, .panel, .acc, .tl, .ranges, .cards .card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i, 3) * 40 + 'ms';
      io.observe(el);
    });
  }
})();
