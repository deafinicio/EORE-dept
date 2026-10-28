import { photos } from './story.js?v=1.5.0';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// The original photographs stay intact; framing and grading belong to the interface.
export function createMedia(host, { keys, label = 'Фото команди', onSelect = () => {}, joke = false }) {
  let photoKeys = [], current = 0, surface = null, frame = null, destroyed = false;
  function fit() {
    frame = null;
    if (destroyed || !surface?.isConnected) return;
    const image = surface.querySelector('.media-foreground'), picture = surface.querySelector('.media-picture');
    if (!image.naturalWidth || !image.naturalHeight) return;
    const availableWidth = Math.max(1, surface.clientWidth - 24), availableHeight = Math.max(1, surface.clientHeight - 24);
    const scale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight);
    picture.style.width = `${image.naturalWidth * scale}px`;
    picture.style.height = `${image.naturalHeight * scale}px`;
  }
  function scheduleFit() { if (!destroyed && frame === null) frame = requestAnimationFrame(fit); }
  const observer = new ResizeObserver(scheduleFit);
  function show(index, focus = false) {
    current = (index + photoKeys.length) % photoKeys.length;
    const key = photoKeys[current], photo = photos[key];
    const image = host.querySelector('.media-foreground'); image.onload = scheduleFit; image.src = photo.src; image.alt = photo.alt; scheduleFit();
    host.querySelector('.media-ambient').style.backgroundImage = `url("${photo.src}")`;
    host.querySelector('.media-caption').textContent = photo.caption;
    host.querySelector('.media-credit').replaceChildren(document.createTextNode(photo.credit));
    if (photo.source) { const link = document.createElement('a'); link.href = photo.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Джерело ↗'; host.querySelector('.media-credit').append(document.createTextNode(' / '), link); }
    host.querySelector('.media-position').textContent = `${String(current + 1).padStart(2, '0')} / ${String(photoKeys.length).padStart(2, '0')}`;
    host.querySelectorAll('[data-photo]').forEach((button, i) => { button.setAttribute('aria-pressed', String(i === current)); if (focus && i === current) button.focus(); });
    onSelect(photo, key, current);
  }
  function setGallery(nextKeys, options = {}) {
    photoKeys = nextKeys.filter(key => photos[key]); if (!photoKeys.length) return;
    host.className = 'story-media'; host.dataset.gallery = options.label || label;
    host.style.setProperty('--photo-tint', (options.joke ?? joke) ? '#ffd379' : 'var(--active)');
    observer.disconnect();
    host.innerHTML = `<figure class="editorial-media ${options.joke ?? joke ? 'is-travel' : ''}"><div class="media-header"><span>${escape(options.label || label)}</span><span class="media-position"></span></div><div class="media-surface"><div class="media-ambient" aria-hidden="true"></div><div class="media-architecture" aria-hidden="true"></div><div class="media-picture"><img class="media-foreground" alt=""></div><i class="media-corner corner-a" aria-hidden="true"></i><i class="media-corner corner-b" aria-hidden="true"></i></div><figcaption><strong class="media-caption" aria-live="polite"></strong><span class="media-credit"></span></figcaption></figure><div class="media-gallery-controls" ${photoKeys.length < 2 ? 'hidden' : ''}><button class="media-arrow" data-photo-prev aria-label="Попереднє фото">←</button><div class="media-thumbnails" role="group" aria-label="Фотографії: ${escape(options.label || label)}">${photoKeys.map(key => `<button data-photo="${key}" aria-label="${escape(photos[key].caption)}" aria-pressed="false"><img src="${escape(photos[key].src)}" alt="" loading="lazy"></button>`).join('')}</div><button class="media-arrow" data-photo-next aria-label="Наступне фото">→</button></div>`;
    host.querySelectorAll('[data-photo]').forEach((button, index) => button.addEventListener('click', () => show(index)));
    host.querySelector('[data-photo-prev]').addEventListener('click', () => show(current - 1)); host.querySelector('[data-photo-next]').addEventListener('click', () => show(current + 1));
    surface = host.querySelector('.media-surface'); observer.observe(surface);
    show(options.start || 0);
  }
  const onKey = event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); show(current + (event.key === 'ArrowRight' ? 1 : -1), true); } };
  host.addEventListener('keydown', onKey);
  setGallery(keys);
  return { setGallery, destroy() { destroyed = true; observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); host.removeEventListener('keydown', onKey); const image = surface?.querySelector('.media-foreground'); if (image) image.onload = null; }, next() { if (current + 1 >= photoKeys.length) return false; show(current + 1); return true; }, get hasNext() { return current + 1 < photoKeys.length; }, get nextNumber() { return current + 2; }, get count() { return photoKeys.length; } };
}
