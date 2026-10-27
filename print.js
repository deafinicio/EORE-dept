import { chapters, roles, missions, benefits, steps } from './story.js';

export function createPrintDeck(getRole) {
  const root = document.createElement('div'); root.id = 'print-deck'; root.setAttribute('aria-hidden', 'true');
  for (const [index, chapter] of chapters.entries()) {
    const section = document.createElement('section'); section.className = 'print-slide';
    const kicker = document.createElement('p'); kicker.className = 'print-kicker'; kicker.textContent = `${String(index + 1).padStart(2, '0')} / ВІДДІЛ ПРОТИМІННОЇ ДІЯЛЬНОСТІ / ХОО ТЧХУ`;
    const title = document.createElement('h2'); title.textContent = chapter.title.join(' ');
    const description = document.createElement('p'); description.className = 'print-description'; description.textContent = chapter.description;
    section.append(kicker, title, description);
    if ([0, 1, 3].includes(index)) {
      const figure = document.createElement('figure'); const image = document.createElement('img');
      image.src = index === 0 ? 'assets/team.webp' : chapter.image; image.alt = 'Захід Українського Червоного Хреста у Харкові';
      const caption = document.createElement('figcaption'); caption.textContent = 'Фото: Український Червоний Хрест, 2024'; figure.append(image, caption); section.append(figure);
    }
    const items = index === 1 ? missions.map(item => [item[1], item[2]]) : index === 2 ? roles.map(role => [role.title, role.text]) : index === 3 ? benefits : index === 4 ? steps.map(item => [item[1], item[2]]) : [];
    if (items.length) {
      const list = document.createElement('div'); list.className = 'print-items';
      for (const [name, text] of items) { const article = document.createElement('article'), heading = document.createElement('h3'), copy = document.createElement('p'); heading.textContent = name; copy.textContent = text; article.append(heading, copy); list.append(article); }
      section.append(list);
    }
    if (index === 2) { const note = document.createElement('p'); note.className = 'print-note'; note.textContent = 'Конкретні завдання, підготовку й можливості участі обговорюємо разом.'; section.append(note); }
    if (index === 5) { const note = document.createElement('p'); note.id = 'print-interest'; section.append(note); }
    root.append(section);
  }
  document.body.append(root);
  window.addEventListener('beforeprint', () => { const role = roles.find(item => item.id === getRole()); document.getElementById('print-interest').textContent = role ? `Твій інтерес: ${role.interest}` : 'Почнімо з розмови. Підійди до представника відділу після виступу.'; });
}
