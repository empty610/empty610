import { mountVenus } from './model.js';
mountVenus(document.getElementById('venus-stage'), document.getElementById('venus-3d'));
const backButton = document.getElementById('venus-back');
if (location.protocol === 'file:') backButton.href = '../index.html#venus';

// Keep navigation visually quiet while the Venus page is being read. Only
// direct mouse, touch, scrolling, or keyboard interaction brings it back.
let backIdleTimer;
function revealBackButton() {
  window.clearTimeout(backIdleTimer);
  backButton.classList.remove('is-idle-hidden');
  if (!document.hidden) {
    backIdleTimer = window.setTimeout(() => backButton.classList.add('is-idle-hidden'), 2000);
  }
}

['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((type) => {
  document.addEventListener(type, revealBackButton, { passive: true });
});
backButton.addEventListener('focus', revealBackButton);
backButton.addEventListener('pointerenter', revealBackButton);
window.addEventListener('pageshow', revealBackButton);
window.addEventListener('pagehide', () => window.clearTimeout(backIdleTimer));
revealBackButton();
