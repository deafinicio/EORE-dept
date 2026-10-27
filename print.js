import { chapters, roles, missions, benefits, steps, photos, maps } from './story.js?v=1.3.0';

export function createPrintDeck(getRole) {
  const root = document.createElement('div'); root.id = 'print-deck'; root.setAttribute('aria-hidden', 'true');
  for (const [index, chapter] of chapters.entries()) {
    const section = document.createElement('section'); section.className = 'print-slide';
    const kicker = document.createElement('p'); kicker.className = 'print-kicker'; kicker.textContent = `${String(index + 1).padStart(2, '0')} / ВІДДІЛ ПРОТИМІННОЇ ДІЯЛЬНОСТІ / ХОО ТЧХУ`;
    const title = document.createElement('h2'); title.textContent = chapter.title.join(' ');
    const description = document.createElement('p'); description.className = 'print-description'; description.textContent = chapter.description;
    section.append(kicker, title, description);
    if (['intro', 'purpose', 'experience'].includes(chapter.id)) {
      const figure = document.createElement('figure'); const image = document.createElement('img');
      const photo = index === 0 ? photos.team : photos[chapter.photo];
      image.src = photo.src; image.alt = photo.alt;
      const caption = document.createElement('figcaption'); caption.textContent = photo.credit; figure.append(image, caption); section.append(figure);
    }
    const items = chapter.id === 'purpose' ? missions.map(item => [item[1], item[2]]) : chapter.id === 'roles' ? roles.map(role => [role.title, role.text]) : chapter.id === 'experience' ? benefits : chapter.id === 'journey' ? steps.map(item => [item[1], item[2]]) : [];
    if (maps[chapter.id]) { const map = maps[chapter.id]; const copy = document.createElement('p'); copy.className = 'print-map-description'; copy.textContent = map.features.join(' ') + ' ' + map.note; const link = document.createElement('a'); link.href = map.url; link.textContent = map.url; section.append(copy, link); }
    if (items.length) {
      const list = document.createElement('div'); list.className = 'print-items';
      for (const [name, text] of items) { const article = document.createElement('article'), heading = document.createElement('h3'), copy = document.createElement('p'); heading.textContent = name; copy.textContent = text; article.append(heading, copy); list.append(article); }
      section.append(list);
    }
    if (chapter.id === 'roles') { const note = document.createElement('p'); note.className = 'print-note'; note.textContent = 'Конкретні завдання, підготовку й можливості участі обговорюємо разом.'; section.append(note); }
    if (chapter.id === 'join') { const note = document.createElement('p'); note.id = 'print-interest'; section.append(note); }
    root.append(section);
  }
  document.body.append(root);
  window.addEventListener('beforeprint', () => { const role = roles.find(item => item.id === getRole()); document.getElementById('print-interest').textContent = role ? `Твій інтерес: ${role.interest}` : 'Почнімо з розмови. Підійди до представника відділу після виступу.'; });
}
