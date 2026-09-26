(() => {
  const audio = document.getElementById('bg-music');
  if (!audio) return;

  const toggle = document.getElementById('music-toggle');
  const preferenceKey = 'site.music.mainEnabled';
  const positionKey = 'site.music.mars.time';
  const targetVolume = 0.4;
  const firstFadeSeconds = 2.4;
  const loopCrossfadeSeconds = 4;
  const get = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const set = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };

  const partner = audio.cloneNode(false);
  partner.removeAttribute('id');
  partner.setAttribute('aria-hidden', 'true');
  partner.preload = 'none';
  partner.hidden = true;
  document.body.append(partner);

  audio.loop = true;
  partner.loop = true;
  let current = audio;
  let next = partner;
  let enabled = get(preferenceKey) === '1';
  let playing = false;
  let resumePending = false;
  let firstStart = true;
  let crossfading = false;
  let volumeFrame = 0;
  let crossfadeFrame = 0;

  function updateIcon() {
    document.documentElement.classList.toggle('music-playing', playing);
    toggle?.setAttribute('aria-pressed', String(playing));
  }

  function savePosition() {
    if (Number.isFinite(current.currentTime) && current.currentTime > 0) {
      set(positionKey, String(current.currentTime));
    }
  }

  function restorePosition() {
    const saved = Number(get(positionKey));
    if (!Number.isFinite(saved) || saved <= 0) return;
    const apply = () => {
      const safeEnd = Number.isFinite(current.duration)
        ? Math.max(0, current.duration - loopCrossfadeSeconds - 0.25)
        : saved;
      try { current.currentTime = Math.min(saved, safeEnd); } catch {}
    };
    if (current.readyState) apply();
    else current.addEventListener('loadedmetadata', apply, { once: true });
    const syncPartner = () => { try { next.currentTime = current.currentTime; } catch {} };
    if (next.readyState) syncPartner();
    else next.addEventListener('loadedmetadata', syncPartner, { once: true });
  }

  function fadeVolume(element, to, seconds) {
    cancelAnimationFrame(volumeFrame);
    const from = element.volume;
    const start = performance.now();
    const duration = Math.max(1, seconds * 1000);
    const step = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      element.volume = from + (to - from) * eased;
      if (progress < 1 && playing && !crossfading) volumeFrame = requestAnimationFrame(step);
    };
    volumeFrame = requestAnimationFrame(step);
  }

  function finishCrossfade() {
    const outgoing = current;
    outgoing.volume = 0;
    current = next;
    next = outgoing;
    current.volume = targetVolume;
    crossfading = false;
  }

  async function startCrossfade() {
    if (!playing || crossfading || !Number.isFinite(current.duration)) return;
    crossfading = true;
    cancelAnimationFrame(volumeFrame);
    next.preload = 'auto';
    next.muted = false;
    next.volume = 0;
    try { next.currentTime = 0; } catch {}
    if (next.paused) try {
      await next.play();
    } catch {
      crossfading = false;
      current.volume = targetVolume;
      return;
    }

    const remaining = Math.max(0.25, current.duration - current.currentTime);
    const duration = Math.min(loopCrossfadeSeconds, remaining) * 1000;
    const start = performance.now();
    const mix = now => {
      if (!playing || !crossfading) return;
      const progress = Math.min(1, (now - start) / duration);
      const angle = progress * Math.PI / 2;
      current.volume = targetVolume * Math.cos(angle);
      next.volume = targetVolume * Math.sin(angle);
      if (progress < 1) crossfadeFrame = requestAnimationFrame(mix);
      else finishCrossfade();
    };
    crossfadeFrame = requestAnimationFrame(mix);
  }

  function monitorLoop() {
    if (!playing || crossfading || !Number.isFinite(current.duration)) return;
    const remaining = current.duration - current.currentTime;
    if (remaining > 0 && remaining <= loopCrossfadeSeconds + 0.12) startCrossfade();
  }

  function stopPlayback() {
    savePosition();
    playing = false;
    resumePending = false;
    crossfading = false;
    cancelAnimationFrame(volumeFrame);
    cancelAnimationFrame(crossfadeFrame);
    current.pause();
    next.pause();
    current.volume = 0;
    next.volume = 0;
    try { next.currentTime = 0; } catch {}
    updateIcon();
  }

  async function startPlayback({ restore = true } = {}) {
    if (playing) return;
    current.muted = false;
    next.muted = false;
    current.volume = 0;
    next.volume = 0;
    next.preload = 'auto';
    if (restore) restorePosition();
    try {
      await Promise.all([current.play(), next.play()]);
      playing = true;
      resumePending = false;
      updateIcon();
      fadeVolume(current, targetVolume, firstStart ? firstFadeSeconds : 0.4);
      firstStart = false;
    } catch {
      current.pause();
      next.pause();
      resumePending = enabled;
      updateIcon();
    }
  }

  toggle?.addEventListener('click', () => {
    if (!playing) {
      enabled = true;
      set(preferenceKey, '1');
      startPlayback();
    } else {
      enabled = false;
      set(preferenceKey, '0');
      stopPlayback();
    }
  });

  ['pointerdown', 'keydown'].forEach(type => document.addEventListener(type, event => {
    if (resumePending && !toggle?.contains(event.target)) startPlayback();
  }, { passive: true }));

  setInterval(() => {
    monitorLoop();
    if (playing) savePosition();
  }, 200);

  window.addEventListener('pagehide', () => {
    savePosition();
    playing = false;
    crossfading = false;
    cancelAnimationFrame(volumeFrame);
    cancelAnimationFrame(crossfadeFrame);
    current.pause();
    next.pause();
  });

  window.addEventListener('pageshow', () => {
    enabled = get(preferenceKey) === '1';
    if (enabled) startPlayback();
  });
})();
