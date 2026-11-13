(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // The header becomes a frosted bar once the page has scrolled.
  var bar = document.querySelector('.bar');
  function onScroll() { if (bar) bar.classList.toggle('solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Close the mobile menu after choosing a link.
  var menu = document.querySelector('.menu');
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });
})();
