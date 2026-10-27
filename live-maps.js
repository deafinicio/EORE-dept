// Display the real applications; data freshness and connection state belong to each map.
export function createLiveMap(host, map, { onChange = () => {}, onPresenterKey = () => {} } = {}) {
  let selected = 0, timeout, destroyed = false, detach = () => {};
  host.innerHTML = `<section class="map-story"><header class="map-heading"><span class="detail-kicker">ЦИФРОВІ ІНСТРУМЕНТИ КОМАНДИ</span><h2 id="inspector-title">${map.name}</h2><div class="story-tabs map-tabs" role="tablist" aria-label="Демонстрація ${map.name}"><button id="map-about-tab" role="tab" aria-controls="map-about" aria-selected="true">Про інструмент</button><button id="map-live-tab" role="tab" aria-controls="map-live" aria-selected="false" tabindex="-1">Жива мапа ↗</button></div></header><section id="map-about" role="tabpanel" aria-labelledby="map-about-tab" class="map-about"><div><h3>${map.summary}</h3><p>${map.description}</p><ol>${map.features.map(text => `<li>${text}</li>`).join('')}</ol><p class="map-note">${map.note}</p></div><div class="map-invitation"><span class="map-orbit" aria-hidden="true"><svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 23V12h11m18 0h11v11m0 18v11H41m-18 0H12V41M32 9v10m0 26v10M9 32h10m26 0h10"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="3" fill="currentColor"/></svg></span><span>ВІДКРИЙ І ДОСЛІДИ</span><strong>${map.name}</strong><p>Масштаб, фільтри, картки — повний інтерфейс у наступній вкладці.</p><button class="primary" data-open-live>До живої демонстрації →</button></div></section><section id="map-live" role="tabpanel" aria-labelledby="map-live-tab" hidden><div class="map-toolbar"><span class="map-load-state" role="status">Очікуємо завантаження інтерфейсу…</span><button data-map-reload>↻ Оновити</button><button data-map-focus>До кнопки показу ↓</button><a href="${map.url}" target="_blank" rel="noopener noreferrer">Окрема вкладка ↗</a></div><div class="map-frame-shell"></div><p class="map-connection-note">Потрібен інтернет. Актуальність даних і стан підключення показано всередині самої мапи.</p></section></section>`;
  const about = host.querySelector('#map-about'), live = host.querySelector('#map-live'), tabs = [...host.querySelectorAll('.map-tabs button')], shell = host.querySelector('.map-frame-shell');
  function load() {
    clearTimeout(timeout); detach();
    const status = host.querySelector('.map-load-state'); status.textContent = 'Завантажуємо інтерфейс…';
    const frame = document.createElement('iframe'); frame.title = `Жива демонстрація ${map.name}`; frame.src = map.url; frame.referrerPolicy = 'strict-origin-when-cross-origin'; frame.allowFullscreen = true;
    frame.addEventListener('load', () => {
      if (destroyed) return; clearTimeout(timeout);
      status.textContent = 'Інтерфейс завантажено · стан даних дивись на мапі';
      // Both production apps share the Pages origin. Capture presenter keys even after a map click.
      try { const win = frame.contentWindow; const forward = event => onPresenterKey(event); win.addEventListener('keydown', forward, true); detach = () => { try { win.removeEventListener('keydown', forward, true); } catch {} }; } catch { /* Separate-tab and return-focus controls remain available cross-origin. */ }
    });
    frame.addEventListener('error', () => { status.textContent = 'Не вдалося завантажити. Спробуй оновити або відкрити окрему вкладку.'; });
    shell.replaceChildren(frame);
    timeout = setTimeout(() => { if (!destroyed) status.textContent = 'Завантаження триває. Якщо мапа не з’явилась, онови або відкрий окрему вкладку.'; }, 15000);
  }
  function select(index, focus = false) {
    selected = index; about.hidden = index !== 0; live.hidden = index !== 1;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    if (index === 1 && !shell.firstChild) load();
    if (focus) tabs[index].focus(); host.scrollTop = 0; onChange();
  }
  tabs.forEach((tab, i) => { tab.addEventListener('click', () => select(i)); tab.addEventListener('keydown', event => { const target = { ArrowLeft: 1 - i, Home: 0, End: 1 }[event.key]; if (target !== undefined) { event.preventDefault(); select(target, true); } }); });
  host.querySelector('[data-open-live]').addEventListener('click', () => select(1));
  host.querySelector('[data-map-reload]').addEventListener('click', load);
  host.querySelector('[data-map-focus]').addEventListener('click', () => document.querySelector('#guided-next').focus());
  return { next() { if (selected === 0) { select(1); return true; } return false; }, get nextLabel() { return selected === 0 ? 'Відкрити живу мапу' : 'Закрити сцену'; }, destroy() { destroyed = true; clearTimeout(timeout); detach(); shell.replaceChildren(); } };
}
