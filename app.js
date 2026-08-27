const loading = document.getElementById('loading');
const main = document.getElementById('main');
const bar = document.getElementById('bar');
const percent = document.getElementById('percent');
const app = document.getElementById('app');

let finished = false;

function setProgress(p) {
  const v = Math.max(0, Math.min(100, Math.round(p)));
  bar.style.width = v + '%';
  percent.textContent = v + '%';
}

function finish() {
  if (finished) return;
  finished = true;
  setProgress(100);
  main.hidden = false;
  // 直接切换类名，CSS 过渡（0.5s/0.6s）负责动画，不依赖 rAF。
  app.classList.add('is-ready');
  loading.classList.add('is-done');
  setupReveal();
}

// Scroll-triggered 渐变动画（约 0.5s）：区块进入视口时淡入。
function setupReveal() {
  const support = 'IntersectionObserver' in window;
  const items = Array.from(document.querySelectorAll('.reveal'));
  const show = (el) => el.classList.add('is-visible');

  if (!support) {
    items.forEach(show);
  } else {
    // 一次性淡入：进入视口后保持显示
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));

    // 立刻把已经出现在视口内的区块显示出来，避免首屏意外空白。
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) show(el);
    });
  }

  // 连续淡入/淡出 + 文字入场动画（覆盖所有 .reveal-fade 区块）
  setupScrollFade();
  setupEnter();
}

// 依据每个区块在视口中的位置，连续计算并设置整个区块的 opacity（进入淡进、离开淡出）。
function setupScrollFade() {
  const els = Array.from(document.querySelectorAll('.reveal-fade'));
  if (!els.length) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const smooth = (t) => t * t * (3 - 2 * t); // smoothstep，头尾更柔和

  const update = () => {
    const vh = window.innerHeight;
    const span = vh * 0.6; // 过渡带宽度：占视口高度比例

    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const enter = clamp((vh - rect.top) / span, 0, 1); // 顶部进入进度 0 -> 1
      const leave = clamp(rect.bottom / span, 0, 1);      // 底部离开进度 1 -> 0
      el.style.opacity = String(smooth(Math.min(enter, leave)));
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// 文字入场：区块进入视口时播放一次 1.2s 动画，离开后重置，以便下次进入重放。
function setupEnter() {
  const sections = Array.from(document.querySelectorAll('.reveal-fade'));
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const states = new Map();
  sections.forEach((el) => states.set(el, false));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const ratio = entry.intersectionRatio;
        if (entry.isIntersecting && ratio >= 0.55 && !states.get(el)) {
          states.set(el, true);
          el.classList.add('enter');
        } else if ((!entry.isIntersecting || ratio <= 0.05) && states.get(el)) {
          states.set(el, false);
          el.classList.remove('enter');
        }
      });
    },
    { threshold: [0, 0.05, 0.55] }
  );
  sections.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------
// Real loading progress.
// The bar now reflects what the page actually loads instead of a fake
// eased timer. The base value comes from the browser's own lifecycle
// state, and real sub-resources (stylesheets, scripts, images, fonts)
// push it toward 100% as they finish. window.load marks the fully-loaded
// moment and triggers the switch to the main screen.
// ---------------------------------------------------------------------

const BASE = {
  loading: 10,      // HTML still being parsed
  interactive: 60,  // DOM parsed (DOMContentLoaded)
  complete: 100,    // all sub-resources done (window load)
};

// Count every resource the browser has loaded for this page.
function resourceStats() {
  const entries = performance.getEntriesByType('resource') || [];
  const total = entries.length;
  const loaded = entries.filter((e) => e.responseEnd > 0).length;
  return { total, loaded };
}

function refresh() {
  const base = BASE[document.readyState] ?? BASE.loading;
  const { total, loaded } = resourceStats();
  const fraction = total > 0 ? loaded / total : 0;
  // Resources carry us most of the way; window.load closes the gap to 100%.
  setProgress(base + fraction * (100 - base) * 0.9);
}

// Keep counting resources that finish after this script runs (images,
// fonts, anything fetched later), and update the bar as they arrive.
try {
  const observer = new PerformanceObserver(() => refresh());
  observer.observe({ type: 'resource', buffered: true });
} catch (e) { /* PerformanceObserver unsupported: fall back to lifecycle */ }

document.addEventListener('DOMContentLoaded', refresh);

window.addEventListener('load', () => {
  refresh();
  // A short pause so the user can actually read "100%" before the swap.
  setTimeout(finish, 350);
});

// If the page is already loaded when this runs (very fast/local case),
// jump straight to the finished state.
if (document.readyState === 'complete') {
  refresh();
  setTimeout(finish, 350);
}

// Public hook: report in later from async work (data fetches, media).
window.siteLoader = { setProgress, finish };

// ---------------------------------------------------------------------
// 背景音乐：ad astra.mp3，循环播放；跨页面时按上次进度继续。
// 利用“静音自动播放 + 首次交互取消静音”来绕过浏览器自动播放限制，
// 让音乐在切换页面后也不会中断（位置保持、循环持续）。
// ---------------------------------------------------------------------
const musicToggle = document.getElementById('music-toggle');
const bgAudio = document.getElementById('bg-music');
const M_PLAYING = 'site.music.playing';
const M_TIME = 'site.music.time';

function saveMusicState() {
  try {
    localStorage.setItem(M_PLAYING, bgAudio.paused ? '0' : '1');
    localStorage.setItem(M_TIME, String(bgAudio.currentTime));
  } catch (e) { /* 隐私模式等场景忽略 */ }
}

function setMusicIcon() {
  document.documentElement.classList.toggle('music-playing', !bgAudio.paused);
}

function startMusic(fromGesture) {
  if (fromGesture) bgAudio.muted = false;
  bgAudio.volume = 0.4;
  const p = bgAudio.play();
  if (p) p.catch(() => {});
  setMusicIcon();
  saveMusicState();
}

if (musicToggle && bgAudio) {
  musicToggle.addEventListener('click', () => {
    if (bgAudio.paused) {
      bgAudio.muted = false;
      startMusic(true);
    } else {
      bgAudio.pause();
      setMusicIcon();
      saveMusicState();
    }
  });

  bgAudio.addEventListener('play', setMusicIcon);
  bgAudio.addEventListener('pause', setMusicIcon);

  // 恢复：若之前处于播放状态，静音自动播放保持进度，首次交互后变为可听
  try {
    if (localStorage.getItem(M_PLAYING) === '1') {
      const t = parseFloat(localStorage.getItem(M_TIME)) || 0;
      if (t > 0) bgAudio.currentTime = t;
      bgAudio.muted = true;            // 先静音，允许自动播放
      const p = bgAudio.play();
      if (p) p.catch(() => {});
      document.documentElement.classList.add('music-playing');
      const unmute = () => {
        bgAudio.muted = false;
        document.removeEventListener('pointerdown', unmute);
        document.removeEventListener('click', unmute);
      };
      document.addEventListener('pointerdown', unmute);
      document.addEventListener('click', unmute);
    }
  } catch (e) { /* 忽略 */ }

  // 周期保存进度，便于切换页面时续播
  setInterval(saveMusicState, 2000);
}

// ---------------------------------------------------------------------
// 单页覆盖层：GO TERMINAL 打开终端；关闭后回到第三面（音乐不中断）。
// ---------------------------------------------------------------------
const goTerminal = document.getElementById('go-terminal');
const terminal = document.getElementById('terminal');
const terminalClose = document.getElementById('terminal-close');

if (goTerminal && terminal && terminalClose) {
  goTerminal.addEventListener('click', () => {
    terminal.hidden = false;
    // 每次进入都重放一次入场动画（浏览器对 display 切换有时不会重启动画）
    terminal.style.animation = 'none';
    void terminal.offsetWidth; // 强制回流，重置动画
    terminal.style.animation = '';
    document.documentElement.classList.add('terminal-open');
    document.body.style.overflow = 'hidden';
  });

  const closeTerminal = () => {
    if (terminal.hidden) return;
    terminal.hidden = true;
    document.documentElement.classList.remove('terminal-open');
    document.body.style.overflow = '';
    // 返回到第三面
    const sec3 = document.querySelector('.section-3');
    if (sec3) sec3.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  terminalClose.addEventListener('click', closeTerminal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTerminal();
  });
}

// 占位的联系按钮（href="#"）点击时不跳回顶部；替换 href 后即为可用链接
document.addEventListener('click', (e) => {
  const placeholder = e.target.closest('.contact-circle[data-pending]');
  if (placeholder) e.preventDefault();
});
