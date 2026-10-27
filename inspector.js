import { elements, roles, missions, benefits, steps, notes } from './story.js?v=1.2.0';
import { createMedia } from './media.js?v=1.2.0';
const $ = id => document.getElementById(id);
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function createInspector({ onOpen, getRole, onRole, onMediaChange = () => {} }) {
  const dialog = $('inspector'), body = $('inspector-body');
  let missionIndex = 0, benefitIndex = 0;
  function display(label, accent = '#5be7ff', point) {
    onOpen();
    dialog.style.setProperty('--active', accent);
    dialog.style.setProperty('--origin-x', `${Math.max(0, Math.min(100, (point?.[0] ?? innerWidth * .65) / innerWidth * 100))}%`);
    dialog.style.setProperty('--origin-y', `${Math.max(0, Math.min(100, (point?.[1] ?? innerHeight * .45) / innerHeight * 100))}%`);
    $('inspector-breadcrumb').textContent = label;
    body.scrollTop = 0;
    const title = $('inspector-title'); title.tabIndex = -1;
    if (!dialog.open) dialog.showModal(); else title.focus({ preventScroll: true });
  }
  function heading(title, text = '') {
    return `<header class="section-heading"><h2 id="inspector-title">${escape(title)}</h2>${text ? `<p>${escape(text)}</p>` : ''}</header>`;
  }
  function renderMission() {
    body.innerHTML = `<div class="slide-layout"><section class="slide-copy"><span class="slide-number">01 / ЩО МИ РОБИМО</span><h2 id="inspector-title">Безпека починається з розуміння</h2><div class="story-tabs" role="tablist" aria-label="Наша робота">${missions.map((mission, i) => `<button role="tab" id="mission-tab-${i}" aria-selected="${i === 0}" aria-controls="mission-panel" tabindex="${i === 0 ? 0 : -1}" data-mission="${i}">${escape(mission[0])}</button>`).join('')}</div><div id="mission-panel" class="story-panel" role="tabpanel" aria-labelledby="mission-tab-0" tabindex="0"><h3></h3><p></p></div></section><div class="story-media" id="mission-media"></div></div>`;
    const media = createMedia($('mission-media'), { keys: missions[missionIndex][3], label: missions[missionIndex][0], onSelect: photo => onMediaChange('purpose', photo, { mission: missionIndex }) });
    const buttons = [...body.querySelectorAll('[data-mission]')];
    function select(index, focus = false) {
      missionIndex = index;
      buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
      $('mission-panel').setAttribute('aria-labelledby', `mission-tab-${index}`);
      $('mission-panel').querySelector('h3').textContent = missions[index][1]; $('mission-panel').querySelector('p').textContent = missions[index][2];
      media.setGallery(missions[index][3], { label: missions[index][0] });
      if (focus) buttons[index].focus();
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(index));
      button.addEventListener('keydown', event => {
        const target = { ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2 }[event.key];
        if (target !== undefined) { event.preventDefault(); event.stopPropagation(); select(target, true); }
      });
    }); select(missionIndex);
  }
  function renderRoles(roleId) {
    body.innerHTML = `${heading('Що тобі ближче?', 'Обери інтерес. Подивимося, як він може стати корисним команді.')}<div class="roles-layout"><section><div class="role-options" role="group" aria-label="Можливі напрями участі">${roles.map((role, i) => `<button class="role-option" data-role="${role.id}" aria-pressed="false" style="--role-color:${role.color}"><span>${String(i + 1).padStart(2, '0')} / ОБРАТИ ↗</span><strong>${escape(role.name)}</strong></button>`).join('')}</div><div class="role-photo-strip"><img src="assets/experience-team.webp" alt="Члени команди у формі Червоного Хреста"><p>Можливості участі обговорюємо разом.<small>Фото надано відділом</small></p></div></section><section class="role-detail" aria-live="polite" aria-atomic="true"></section></div>`;
    const detail = body.querySelector('.role-detail');
    function select(id, commit = true) {
      const index = roles.findIndex(role => role.id === id); if (index < 0) return; const role = roles[index];
      if (commit) onRole(id);
      body.querySelectorAll('[data-role]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.role === id)));
      detail.style.setProperty('--role-color', role.color);
      detail.innerHTML = `<span class="detail-kicker">МОЖЛИВИЙ ВНЕСОК</span><span class="detail-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h3 id="role-title">${escape(role.title)}</h3><p>${escape(role.text)}</p><div class="role-example"><span>З чого можна почати</span><p>${escape(role.example)}</p></div><button class="choose-role">${getRole() === id ? 'Цей інтерес обрано ✓' : 'Це мені близько ↗'}</button><p class="role-caveat">Конкретні завдання, підготовку й можливості участі обговорюємо разом.</p>`;
      detail.querySelector('.choose-role').addEventListener('click', event => { onRole(id); event.currentTarget.textContent = 'Цей інтерес обрано ✓'; });
    }
    body.querySelectorAll('[data-role]').forEach(button => button.addEventListener('click', () => select(button.dataset.role)));
    select(roleId || getRole() || roles[0].id, !!roleId);
  }
  function renderBenefits(selected = benefitIndex) {
    body.innerHTML = `<div class="slide-layout"><section class="slide-copy"><span class="slide-number">03 / ТВІЙ ДОСВІД</span><h2 id="inspector-title">Вміння ростуть у дії</h2><p>Завдання, у яких можна застосувати свої сильні сторони та розвивати нові.</p><div class="benefits">${benefits.map((benefit, i) => `<button data-benefit="${i}" aria-expanded="${i === 0}" aria-controls="benefit-${i}">${escape(benefit[0])}<span aria-hidden="true">${i === 0 ? '−' : '+'}</span></button><p id="benefit-${i}" ${i ? 'hidden' : ''}>${escape(benefit[1])}</p>`).join('')}</div></section><div class="story-media" id="benefit-media"></div></div>`;
    body.querySelector('.slide-layout').classList.add('experience-story');
    const media = createMedia($('benefit-media'), { keys: benefits[selected][2], label: benefits[selected][0], onSelect: photo => onMediaChange('experience', photo, { benefit: benefitIndex }) });
    const travelButton = body.querySelector('[data-benefit="3"]'); travelButton.classList.add('travel-option');
    travelButton.insertAdjacentHTML('beforeend', '<small>Трохи нашого гумору ↗</small>');
    function select(index) {
      benefitIndex = index;
      body.querySelectorAll('[data-benefit]').forEach(option => { const open = Number(option.dataset.benefit) === index; option.setAttribute('aria-expanded', String(open)); option.querySelector('span').textContent = open ? '−' : '+'; $(option.getAttribute('aria-controls')).hidden = !open; });
      const benefit = benefits[index];
      const copy = $('benefit-' + index);
      if (benefit[3]?.joke && !copy.querySelector('.travel-tagline')) copy.insertAdjacentHTML('afterbegin', `<strong class="travel-tagline">${escape(benefit[3].tagline)}</strong>`);
      media.setGallery(benefit[2], { label: benefit[0], joke: !!benefit[3]?.joke });
    }
    body.querySelectorAll('[data-benefit]').forEach(button => button.addEventListener('click', () => select(Number(button.dataset.benefit))));
    select(selected);
  }
  function renderJourney(step = 0) {
    body.innerHTML = `${heading('Усе починається зі знайомства', 'Твій темп і можливості важливі. Підготовка залежить від погодженої ролі.')}<div class="journey-layout"><div class="journey-steps" role="group" aria-label="Кроки до участі">${steps.map((item, i) => `<button data-step="${i}" aria-pressed="false"><span>${String(i + 1).padStart(2, '0')}</span>${escape(item[0])}</button>`).join('')}</div><section class="journey-detail" aria-live="polite" aria-atomic="true"><span class="step-number" id="step-number" aria-hidden="true"></span><h3 id="step-title"></h3><p id="step-description"></p><div class="journey-bottom">Перше завдання та підтримку команди погоджуємо разом.</div></section></div>`;
    function select(index) {
      if (index < 0 || index >= steps.length) return;
      body.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index)));
      $('step-number').textContent = String(index + 1).padStart(2, '0'); $('step-title').textContent = steps[index][1]; $('step-description').textContent = steps[index][2];
    }
    body.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => select(Number(button.dataset.step)))); select(step);
  }
  function openElement(id, point, { role, step, mission, benefit } = {}) {
    const element = elements.find(item => item.id === id); if (!element) return;
    if (id === 'purpose') { if (mission !== undefined) missionIndex = mission; renderMission(); } else if (id === 'roles') renderRoles(role); else if (id === 'experience') renderBenefits(benefit ?? benefitIndex); else renderJourney(step ?? 0);
    display(element.name, element.accent, point);
  }
  function catalog(point) {
    body.innerHTML = `${heading('Досліджуй відділ', 'Чотири історії про роботу команди та можливості участі.')}<div class="catalog-grid">${elements.map((element, i) => `<button class="catalog-card" data-element="${element.id}" style="--card-color:${element.accent}"><span>${String(i + 1).padStart(2, '0')} / ВІДКРИТИ ↗</span><strong>${escape(element.name)}</strong><small>${escape(element.action)}</small></button>`).join('')}</div>`;
    body.querySelectorAll('[data-element]').forEach(button => button.addEventListener('click', () => openElement(button.dataset.element)));
    display('Каталог історій', '#5be7ff', point);
  }
  function join(point) {
    const role = roles.find(item => item.id === getRole());
    const message = role ? `Привіт! Мене зацікавила ваша команда. Мені близький напрям «${role.interest}». Як я можу долучитися?` : 'Привіт! Мене зацікавила ваша команда. Хочу дізнатися більше про волонтерство й можливі ролі. З чого почати?';
    body.innerHTML = `<section class="conversation"><span class="detail-kicker" style="--role-color:#ff829b">ПЕРШИЙ КРОК ДО КОМАНДИ</span><h2 id="inspector-title">Є з чого почати розмову</h2><p>Підійди до команди після виступу. Можеш почати так:</p><blockquote id="conversation-text">${escape(message)}</blockquote><div class="conversation-actions"><button id="copy-button" class="primary">Скопіювати текст ↗</button><a id="contact-link" class="contact-link" hidden target="_blank" rel="noopener noreferrer"></a></div><p id="copy-status" class="copy-status" role="status"></p><p class="privacy-note">Це підказка для розмови. Заявка не надсилається. Обраний інтерес зберігається лише в пам’яті цієї сторінки.</p></section>`;
    try {
      const config = window.EORE_CONFIG || {}; if (config.contactUrl) {
        const url = new URL(config.contactUrl); if (url.protocol === 'https:') { $('contact-link').href = url.href; $('contact-link').textContent = String(config.contactLabel || 'Зв’язатися з командою'); $('contact-link').hidden = false; }
      }
    } catch { /* Ignore invalid optional contacts. */ }
    $('copy-button').addEventListener('click', async () => {
      try { if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable'); await navigator.clipboard.writeText(message); $('copy-status').textContent = 'Скопійовано. Можеш зберегти текст у власних нотатках.'; }
      catch { const range = document.createRange(); range.selectNodeContents($('conversation-text')); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); $('copy-status').textContent = 'Текст виділено. Скопіюй його вручну або почни розмову своїми словами.'; }
    });
    display('Продовжимо знайомство', '#ff829b', point);
  }
  function openNotes(index) {
    body.innerHTML = `${heading('Нотатки доповідача')}<p class="notes-copy">${escape(notes[index])}</p><p class="notes-warning">Це вікно відкривається на тому самому екрані. Під час спільного показу його бачить аудиторія.</p>`;
    display('Нотатки до поточного кроку');
  }
  function close() { if (dialog.open) dialog.close(); }
  $('close-inspector').addEventListener('click', close); $('inspector-done').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); });
  return { openElement, catalog, join, openNotes, close, get isOpen() { return dialog.open; } };
}
