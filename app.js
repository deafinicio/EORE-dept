import { chapters, elements, roles, FINAL_INDEX } from './story.js?v=1.4.2';
import { createInspector } from './inspector.js?v=1.4.2';
import { createCinema } from './cinema.js?v=1.4.2';
import { createPrintDeck } from './print.js?v=1.4.2';
const $ = id => document.getElementById(id);
const pad = number => String(number).padStart(2, '0');
let index = 0, scene = null, cinema, autoTimer = null, selectedRole = null, showingOverview = false, detailShown = false, finaleShown = false;
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches;
function stopAuto() {
  clearInterval(autoTimer); autoTimer = null;
  $('autoplay').setAttribute('aria-pressed', 'false'); $('play-icon').textContent = '▷'; $('play-label').textContent = 'Автопоказ';
}
const inspector = createInspector({
  onChange: () => { if (inspector.current === chapters[index].id) detailShown = true; if (inspector.current === 'join') finaleShown = true; syncGuide(); },
  onPresenterKey: presenterKey,
  onOpen: () => { stopAuto(); cinema?.close(); $('help-dialog').close(); },
  getRole: () => selectedRole,
  onRole: id => { selectedRole = id; updateInterest(); },
  onMediaChange: (id, photo, selection) => scene?.setStoryPhoto(id, photo, selection),
});
cinema = createCinema({
  isReduced: () => reduced,
  onShot: (kind, step, shot) => { stopAuto(); scene?.cinematicShot(kind, step, shot); },
  onExit: () => { scene?.clearCinematic(); const chapter = chapters[index]; scene?.setChapter(index, chapter.camera, chapter.look, { instant: true }); },
  onComplete: kind => { if (kind === 'intro') go(1); else inspector.join(); },
});
function updateInterest() {
  $('quick-actions').replaceChildren();
  if (index === FINAL_INDEX && selectedRole) {
    const label = document.createElement('p'); label.className = 'interest-label'; label.id = 'selected-interest'; label.textContent = `Твій інтерес: ${roles.find(role => role.id === selectedRole).interest}`; $('quick-actions').append(label);
  }
}
function update() {
  const chapter = chapters[index], count = Math.min(elements.length, index);
  document.documentElement.style.setProperty('--active', chapter.accent);
  document.body.dataset.chapter = chapter.id;
  $('eyebrow').textContent = `${pad(index + 1)} / ${index ? chapter.name.toUpperCase() : 'ЗНАЙОМСТВО З КОМАНДОЮ'}`;
  const accent = document.createElement('em'); accent.textContent = chapter.title[1]; $('title').replaceChildren(document.createTextNode(chapter.title[0]), document.createElement('br'), accent);
  $('description').textContent = chapter.description;
  $('layer-count').textContent = pad(count); $('layer-caption').textContent = count === elements.length ? 'Усі складові на платформі' : count ? elements[count - 1].name : 'Початок знайомства';
  $('layer-indicator').querySelectorAll('i').forEach((bar, i) => bar.classList.toggle('on', i < count));
  $('step-counter').textContent = `${pad(index + 1)} / ${pad(chapters.length)}`;
  $('chapters').querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('active', i === index); button.classList.toggle('passed', i < index);
    if (i === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
  $('open-section').hidden = index === 0;
  $('open-label').textContent = index === FINAL_INDEX ? 'Обрати свій інтерес' : chapter.action;
  $('next-label').textContent = index === 0 ? 'Відкрити нашу роботу' : index === FINAL_INDEX ? 'Почати розмову' : chapter.next;
  $('next').lastElementChild.textContent = index === FINAL_INDEX ? '↗' : '+';
  $('previous').disabled = index === 0; $('overview').disabled = index === 0;
  $('overview').setAttribute('aria-pressed', 'false');
  $('scene-caption').textContent = index === 0 ? 'Додавай об’єкти. Натискай, щоб дізнатися більше.' : 'Натисни на об’єкт або його підпис, щоб відкрити історію.';
  $('cinema-start').hidden = index !== 0 && index !== FINAL_INDEX;
  $('cinema-start').textContent = index === 0 ? '▷ Коротке знайомство' : '▷ Перший крок до команди';
  updateInterest(); syncGuide();
  $('announcement').textContent = `Крок ${index + 1} із ${chapters.length}. ${chapter.name}.`;
  $('narrative').classList.remove('changing'); requestAnimationFrame(() => $('narrative').classList.add('changing'));
}
function go(next, { automated = false, instant = false, history = 'push', focus = true } = {}) {
  if (!Number.isInteger(next) || next < 0 || next > FINAL_INDEX) return;
  cinema.close(); inspector.close(); $('help-dialog').close();
  if (!automated) stopAuto();
  index = next; showingOverview = false; detailShown = false; finaleShown = false;
  const chapter = chapters[index]; scene?.setChapter(index, chapter.camera, chapter.look, { instant }); update();
  if (history !== 'none' && location.hash !== `#${chapter.id}`) window.history[history === 'replace' ? 'replaceState' : 'pushState'](null, '', `#${chapter.id}`);
  document.title = `${chapter.name} · Відділ протимінної діяльності`;
  if (focus) $('title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (index === FINAL_INDEX) stopAuto();
}
function syncGuide() {
  const label = inspector.isOpen ? inspector.nextLabel : index === 0 ? 'Додати першу сцену' : index === FINAL_INDEX ? (finaleShown ? 'Почати спочатку' : 'Почати розмову') : !detailShown ? `Відкрити: ${chapters[index].name}` : index + 1 === FINAL_INDEX ? 'До запрошення в команду' : `Додати: ${chapters[index + 1].name}`;
  $('guided-label').textContent = label;
  $('guided-next').setAttribute('aria-label', label);
  $('guided-step').textContent = inspector.isOpen ? 'ІСТОРІЯ / ДАЛІ' : `СЦЕНА ${pad(index + 1)} / ${pad(chapters.length)}`;
}
function guidedNext() {
  stopAuto();
  if (cinema.active) { cinema.next(); return; }
  if ($('help-dialog').open) { $('help-dialog').close(); return; }
  if (inspector.isOpen) { inspector.advance(); syncGuide(); return; }
  if (index === 0) go(1);
  else if (index === FINAL_INDEX) { if (finaleShown) go(0); else { finaleShown = true; inspector.join(); } }
  else if (!detailShown) { detailShown = true; inspector.openElement(chapters[index].id); }
  else go(index + 1);
  syncGuide();
}
function presenterKey(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || cinema?.active || $('help-dialog').open) return;
  if (event.key !== 'PageDown' && event.target?.closest?.('input,textarea,select,[contenteditable=true]')) return;
  if (event.key === 'PageDown' || event.key === 'ArrowRight' || event.code === 'Space') {
    event.preventDefault(); event.stopImmediatePropagation(); if (event.repeat) return; guidedNext();
    // Keep focus in the parent presentation after forwarding a key from a live map.
    if (event.view && event.view !== window) $('guided-next').focus({ preventScroll: true });
  }
}
window.addEventListener('keydown', presenterKey, true);
$('guided-next').addEventListener('click', guidedNext);
function currentFromHash() { const current = chapters.findIndex(chapter => `#${chapter.id}` === location.hash); return current < 0 ? 0 : current; }
function openCurrent() { if (index === 0) inspector.catalog(); else if (index === FINAL_INDEX) inspector.join(); else inspector.openElement(chapters[index].id); }
function launchCinema() {
  if (!scene) { $('announcement').textContent = '3D недоступне або ще завантажується. Скористайся кнопками історій.'; return; }
  inspector.close(); $('help-dialog').close(); stopAuto(); cinema.start(index === FINAL_INDEX ? 'finale' : 'intro');
}
chapters.forEach((chapter, i) => {
  const button = document.createElement('button'); button.className = 'chapter'; button.dataset.go = String(i); button.setAttribute('aria-label', `${i + 1}. ${chapter.name}`);
  const number = document.createElement('span'); number.textContent = pad(i + 1); button.append(number, document.createTextNode(chapter.short)); button.addEventListener('click', () => go(i)); $('chapters').append(button);
});
elements.forEach(() => $('layer-indicator').append(document.createElement('i')));
$('next').addEventListener('click', () => index === FINAL_INDEX ? inspector.join() : go(index + 1));
$('previous').addEventListener('click', () => go(index - 1)); $('restart').addEventListener('click', () => go(0));
$('home').addEventListener('click', event => { event.preventDefault(); go(0); });
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); $('title').focus({ preventScroll: true }); });
$('open-section').addEventListener('click', () => index === FINAL_INDEX ? inspector.openElement('roles') : openCurrent());
$('catalog').addEventListener('click', () => inspector.catalog()); $('cinema-start').addEventListener('click', launchCinema);
$('overview').addEventListener('click', () => {
  stopAuto(); showingOverview = !showingOverview;
  const chapter = showingOverview ? chapters[FINAL_INDEX] : chapters[index]; scene?.overview(chapter.camera, chapter.look);
  $('overview').setAttribute('aria-pressed', String(showingOverview));
  $('scene-caption').textContent = showingOverview ? 'Усі вже додані об’єкти залишаються інтерактивними.' : 'Натисни на об’єкт, щоб відкрити історію.';
});
$('autoplay').addEventListener('click', () => {
  if (autoTimer) { stopAuto(); return; } if (reduced) return;
  if (index === FINAL_INDEX) go(0);
  $('autoplay').setAttribute('aria-pressed', 'true'); $('play-icon').textContent = 'Ⅱ'; $('play-label').textContent = 'Зупинити показ';
  go(index + 1, { automated: true });
  if (index < FINAL_INDEX) autoTimer = setInterval(() => go(index + 1, { automated: true }), 9000);
});
function applyMotion() {
  document.body.classList.toggle('no-motion', reduced); $('motion').setAttribute('aria-pressed', String(reduced));
  const label = reduced ? 'Увімкнути анімацію' : 'Зменшити анімацію'; $('motion').setAttribute('aria-label', label); $('motion').title = label;
  $('autoplay').disabled = reduced; $('autoplay').title = reduced ? 'Автопоказ вимкнено в режимі зменшення руху' : 'Автоматично перемикати кроки';
  stopAuto(); scene?.setReduced(reduced); cinema.motionChanged();
}
$('motion').addEventListener('click', () => { reduced = !reduced; applyMotion(); });
motionQuery.addEventListener('change', event => { reduced = event.matches; applyMotion(); });
function togglePresenter() {
  const active = !document.body.classList.contains('presenter-mode'); document.body.classList.toggle('presenter-mode', active); $('presenter').setAttribute('aria-pressed', String(active)); $('presenter-hint').hidden = !active; scene?.resize();
}
$('presenter').addEventListener('click', togglePresenter);
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }
  catch { $('announcement').textContent = 'Браузер не дозволив повний екран. Скористайся його меню.'; }
}
if (!document.fullscreenEnabled) $('fullscreen').hidden = true;
$('fullscreen').addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', () => { const label = document.fullscreenElement ? 'Вийти з повного екрана' : 'На весь екран'; $('fullscreen').setAttribute('aria-label', label); $('fullscreen').title = `${label} · F`; });
function showHelp() { stopAuto(); inspector.close(); $('help-dialog').showModal(); }
$('help').addEventListener('click', showHelp); $('show-notes').addEventListener('click', () => inspector.openNotes(index));
$('help-dialog').querySelector('[data-close]').addEventListener('click', () => $('help-dialog').close());
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || inspector.isOpen || cinema.active || $('help-dialog').open || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (event.key === 'Enter' && !event.target.closest('button,a')) { event.preventDefault(); openCurrent(); return; }
  const handlers = { ArrowLeft: () => go(index - 1), PageUp: () => go(index - 1), Home: () => go(0), End: () => go(FINAL_INDEX), p: togglePresenter, P: togglePresenter, f: fullscreen, F: fullscreen, o: () => inspector.catalog(), O: () => inspector.catalog(), n: () => inspector.openNotes(index), N: () => inspector.openNotes(index), '?': showHelp, Escape: () => { if (document.body.classList.contains('presenter-mode')) togglePresenter(); } };
  if (handlers[event.key]) { event.preventDefault(); handlers[event.key](); }
});
function readNavigation() { const current = currentFromHash(); if (index !== current) go(current, { history: 'none' }); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })); }
window.addEventListener('popstate', readNavigation); window.addEventListener('hashchange', readNavigation);
window.addEventListener('load', () => window.scrollTo({ top: 0, behavior: 'instant' }));
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); });
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer); resizeTimer = setTimeout(() => {
    scene?.resize(); if (cinema.active) cinema.resize(); else { const chapter = showingOverview ? chapters[FINAL_INDEX] : chapters[index]; scene?.overview(chapter.camera, chapter.look); }
  }, 120);
});
let touch = null;
$('viewport').addEventListener('touchstart', event => { if (event.touches.length !== 1 || event.target.closest('button') || inspector.isOpen || cinema.active) { touch = null; return; } touch = [event.touches[0].clientX, event.touches[0].clientY]; }, { passive: true });
$('viewport').addEventListener('touchend', event => {
  if (!touch || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - touch[0], dy = event.changedTouches[0].clientY - touch[1]; touch = null;
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8) go(index + (dx < 0 ? 1 : -1));
}, { passive: true });
$('viewport').addEventListener('touchcancel', () => { touch = null; });
function fallback(message) {
  scene?.dispose(); scene = null; $('loading')?.remove(); $('scene-fallback').hidden = false; $('viewport').dataset.ready = 'fallback'; $('cinema-start').disabled = true; $('announcement').textContent = message;
}
$('retry-scene').addEventListener('click', () => location.reload());
applyMotion(); go(currentFromHash(), { history: 'replace', instant: true, focus: false });
createPrintDeck(() => selectedRole);
try {
  await document.fonts.load('500 24px Rubik').catch(() => {});
  const { createDepartmentScene } = await import('./scene.js?v=1.4.2');
  scene = createDepartmentScene($('viewport'), { reduced, onOpen: data => inspector.openElement(data.element, data.point, data), onReady: () => $('loading')?.remove(), onError: fallback });
  const chapter = chapters[index]; scene.setChapter(index, chapter.camera, chapter.look, { instant: true });
} catch (error) { console.warn('3D unavailable:', error.message); fallback('3D недоступне. Усі історії залишаються доступними через кнопки й каталог.'); }
