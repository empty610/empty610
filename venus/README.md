# Venus

Integrated from the user's `E:/solar system/venus/venus_v3.html` project.

- Public entry: `/venus/`. BACK returns to `/#venus`.
- The home page includes an 80vh preview between DC and Future; its renderer loads only near the viewport and pauses when hidden or navigating away.
- `model.js` shares the original sphere, glow and texture between the preview and the interactive project. It uses the site's existing vendored Three.js r160 and OrbitControls, with no CDN or iframe.
- `venus-surface.jpg` is the lossless extraction of the JPEG embedded in the original `venus-texture.js`; the other project images are copied unchanged.
- Original inline CSS and JavaScript are extracted into `venus.css` and `venus.js` to work with the site's existing Content-Security-Policy. `page.js` starts the globe; `site.css` adds site navigation, entry fade and the music button.
- The site's shared `music.js` carries the user's playback preference and position across pages. Browser autoplay restrictions may require one interaction to resume playback.

Serve the repository over HTTP for local previews (ES modules need HTTP). No build step is required.
