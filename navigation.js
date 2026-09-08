(() => {
  const toggle = document.getElementById('site-nav-toggle');
  const closeButton = document.getElementById('site-nav-close');
  const menu = document.getElementById('site-navigation');
  const main = document.getElementById('main');
  const links = Array.from(menu.querySelectorAll('nav a'));
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateCurrent() {
    const point = Math.min(innerHeight * .4, 320);
    let current = -1;
    sections.forEach((section, i) => {
      const box = section.getBoundingClientRect();
      if (box.top <= point && box.bottom > point) current = i;
    });
    // The last section can be shorter than a viewport and cannot scroll to the top.
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) current = sections.length - 1;
    links.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function closeMenu() {
    if (menu.open) menu.close();
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('site-menu-open');
  }

  toggle.addEventListener('click', () => {
    updateCurrent();
    menu.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('site-menu-open');
    closeButton.focus({ preventScroll: true });
  });
  closeButton.addEventListener('click', closeMenu);
  menu.addEventListener('close', closeMenu);
  menu.addEventListener('cancel', event => {
    event.preventDefault();
    closeMenu();
  });
  links.forEach((link, i) => link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeMenu();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    sections[i].focus({ preventScroll: true });
    sections[i].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }));

  // The main content is initially hidden. Show the menu only once its targets exist on screen.
  const ready = () => { toggle.hidden = false; };
  if (!main.hidden) ready();
  window.addEventListener('site-ready', ready, { once: true });
  window.addEventListener('pagehide', closeMenu);
  window.addEventListener('pageshow', closeMenu);
})();
