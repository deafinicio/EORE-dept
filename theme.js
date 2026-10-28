// Keep the same five accent families; use deeper inks against white surfaces.
const lightAccents = {
  '#5be7ff': '#00667f', '#ff829b': '#b02955', '#b494ff': '#6842a3', '#ffd379': '#805400', '#63f5c5': '#006958',
};
const darkAccents = Object.fromEntries(Object.entries(lightAccents).map(([dark, light]) => [light, dark]));
export function accentForTheme(color, theme) {
  const key = String(color).trim().toLowerCase();
  return (theme === 'light' ? lightAccents[key] : darkAccents[key]) || color;
}
export function createThemeController(onChange) {
  const root = document.documentElement;
  let value = root.dataset.theme === 'light' ? 'light' : 'dark';
  const properties = ['--active', '--role-color', '--card-color', '--marker-color', '--photo-tint'];
  const sun = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 14A8.5 8.5 0 0 1 10 3a8.5 8.5 0 1 0 10 11Z"/></svg>';
  function recolor(element) {
    if (!element.style) return;
    for (const property of properties) {
      const current = element.style.getPropertyValue(property).trim();
      const next = accentForTheme(current, value);
      if (current && current !== next) element.style.setProperty(property, next);
    }
  }
  function recolorTree(element) { recolor(element); element.querySelectorAll?.('[style]').forEach(recolor); }
  function setTheme(next) {
    value = next === 'light' ? 'light' : 'dark'; root.dataset.theme = value;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', value === 'light' ? '#ffffff' : '#060b16');
    try { localStorage.setItem('eore-theme', value); } catch { /* Private storage can be unavailable. */ }
    recolorTree(root);
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const label = value === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему';
      button.innerHTML = value === 'dark' ? sun : moon;
      button.title = label; button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(value === 'light'));
    });
    onChange(value);
  }
  document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => setTheme(value === 'dark' ? 'light' : 'dark')));
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') recolor(record.target);
      else record.addedNodes.forEach(node => { if (node.nodeType === 1) recolorTree(node); });
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  setTheme(value);
  return { setTheme, get value() { return value; } };
}
