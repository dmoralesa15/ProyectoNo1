// Js/Portal.js
(function () {
  'use strict';

  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('navMenu');

  toggle?.addEventListener('click', () => {
    menu?.classList.toggle('is-open');
  });

  // Cierra el menú al navegar (móvil)
  menu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('is-open'));
  });
})();
