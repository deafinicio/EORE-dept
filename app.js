'use strict';

(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const pad = (number) => String(number).padStart(2, '0');
  const dialogOpen = () => document.querySelector('dialog[open]');
  let current = 0;
  let selectedRole = null;

  const missions = [
    ['Правила простими словами', 'Допомагаємо розібратися в ризиках, пов’язаних із мінами та вибухонебезпечними предметами.'],
    ['Ситуації з повсякденного життя', 'Обговорюємо безпечну поведінку через зрозумілі приклади та запитання учасників.'],
    ['Зрозуміла інформація для громад', 'Допомагаємо громадам отримувати інформацію про ризики та правила безпечної поведінки.'],
  ];
  const roles = {
    communication: { number: '01', title: 'Спілкування з учасниками', description: 'Допомагати людям почуватися впевненіше на заходах і знаходити потрібну інформацію.', example: 'Допомога команді у зустрічі та супроводі учасників заходу.', interest: 'спілкування з учасниками' },
    events: { number: '02', title: 'Організація заходів', description: 'Долучатися до підготовки подій і допомагати команді з організаційними деталями.', example: 'Підготовка простору та матеріалів до погодженого заходу.', interest: 'організація заходів' },
    creative: { number: '03', title: 'Фото, відео та дизайн', description: 'Застосовувати творчі вміння, щоб розповідати про роботу команди та робити інформацію зрозумілішою.', example: 'Допомога з оформленням погодженого матеріалу або фото заходу з дотриманням правил згоди на зйомку.', interest: 'фото, відео та дизайн' },
    education: { number: '04', title: 'Освітня робота після підготовки', description: 'Навчатися пояснювати правила безпечної поведінки та працювати з аудиторією.', example: 'Знайомство з матеріалами й необхідною підготовкою. Освітні завдання - лише після відповідного навчання та погодження.', interest: 'освітня робота' },
  };
  const steps = [
    ['Просто поговорімо', 'Підійди до представника відділу після виступу. Розкажи, що тебе зацікавило, і постав свої запитання.'],
    ['Знайдемо спільне', 'Обговоримо твої інтереси, вміння, доступний час і поточні потреби команди. Разом визначимо можливу роль.'],
    ['Підготуємося до ролі', 'З’ясуємо, яке знайомство з правилами та навчання потрібне для обраних завдань. Підготовка залежить від ролі.'],
    ['Спробуємо на практиці', 'Домовимося про перше конкретне завдання, його обсяг і підтримку команди. Після цього обговоримо враження та наступні кроки.'],
  ];
  const notes = [
    'Почніть із короткого знайомства: хто ви і що робить відділ. Зверніться до аудиторії: «Які ваші вміння могли б допомогти іншим?» Запросіть разом переглянути можливості участі. Не перевантажуйте вступ історією проєктів чи статистикою.',
    'Поясніть фокус інформування про ризики. Перемкніть три пункти, додаючи приклади з власної практики без персональних даних. Чітко поясніть різницю між освітньою роботою та операціями з вибухонебезпечними предметами. Фото ілюструє захід у 2024 році.',
    'Попросіть аудиторію назвати близький їм інтерес і відкрийте відповідну роль. Це приклади можливого внеску. Наявність конкретного завдання, умови участі та необхідну підготовку погоджуйте індивідуально. Освітню роботу пропонуйте лише після відповідного навчання.',
    'Розкажіть один короткий, правдивий приклад розвитку вмінь у команді. Відкрийте відповідний пункт. Уникайте обіцянок гарантованої кар’єри, сертифікатів чи інших переваг, якщо вони не погоджені організацією.',
    'Пройдіть чотири кроки. Поясніть, що для першої розмови не потрібно одразу визначати довгострокові зобов’язання. Умови, зокрема участь неповнолітніх, узгоджуйте за чинними правилами організації.',
    'Завершіть конкретним запрошенням: де саме представники відділу стоятимуть після виступу. Дайте час на запитання. Кнопка відкриває приклад початку розмови, а не надсилає заявку. Для онлайн-залучення спершу додайте погоджений контакт у site.config.js.',
  ];

  function readHash() {
    const index = slides.findIndex((slide) => `#${slide.id}` === location.hash);
    return index >= 0 ? index : 0;
  }

  function showSlide(index, { history = 'push', focus = true } = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= slides.length) return;
    // Close before hiding the old screen so focus never returns to a hidden control.
    $$('dialog[open]').forEach((dialog) => dialog.close());
    current = index;
    slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== current; });
    document.body.classList.toggle('is-finale', current === slides.length - 1);
    $('#current-index').textContent = pad(current + 1);
    $('#current-label').textContent = slides[current].dataset.label;
    $('#prev-button').disabled = current === 0;
    $('#next-button').disabled = current === slides.length - 1;
    $$('.progress-nav button, .overview-grid button').forEach((button) => {
      if (Number(button.dataset.go) === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (history !== 'none') {
      const hash = `#${slides[current].id}`;
      if (location.hash !== hash) window.history[history === 'replace' ? 'replaceState' : 'pushState'](null, '', hash);
    }
    document.title = `${slides[current].dataset.label} · Відділ протимінної діяльності`;
    $('#slide-announcement').textContent = `Слайд ${current + 1} із ${slides.length}. ${slides[current].dataset.label}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Native fragment navigation may scroll after popstate/hashchange.
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    if (focus) slides[current].querySelector('h1, h2').focus({ preventScroll: true });
  }

  $$('[data-go]').forEach((button) => button.addEventListener('click', () => showSlide(Number(button.dataset.go))));
  $('#prev-button').addEventListener('click', () => showSlide(current - 1));
  $('#next-button').addEventListener('click', () => showSlide(current + 1));
  $('.brand').addEventListener('click', (event) => { event.preventDefault(); showSlide(0); });
  $('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    slides[current].querySelector('h1, h2').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  window.addEventListener('popstate', () => showSlide(readHash(), { history: 'none' }));
  window.addEventListener('hashchange', () => {
    const index = readHash();
    if (current !== index) showSlide(index, { history: 'none' });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  });
  window.addEventListener('load', () => window.scrollTo({ top: 0, behavior: 'instant' }));

  function selectMission(index, focus = false) {
    $$('[data-mission]').forEach((button, buttonIndex) => {
      button.setAttribute('aria-selected', String(buttonIndex === index));
      button.tabIndex = buttonIndex === index ? 0 : -1;
      if (focus && buttonIndex === index) button.focus();
    });
    $('#mission-panel').setAttribute('aria-labelledby', `mission-tab-${index}`);
    $('#mission-panel h3').textContent = missions[index][0];
    $('#mission-panel p').textContent = missions[index][1];
  }
  $$('[data-mission]').forEach((button) => {
    button.addEventListener('click', () => selectMission(Number(button.dataset.mission)));
    button.addEventListener('keydown', (event) => {
      const index = Number(button.dataset.mission);
      const directions = { ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2 };
      if (event.key in directions) {
        event.preventDefault(); event.stopPropagation(); selectMission(directions[event.key], true);
      }
    });
  });

  $$('[data-role]').forEach((button) => button.addEventListener('click', () => {
    selectedRole = button.dataset.role;
    const role = roles[selectedRole];
    $$('[data-role]').forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    $('#role-number').textContent = role.number;
    $('#role-title').textContent = role.title;
    $('#role-description').textContent = role.description;
    $('#role-example').textContent = role.example;
    $('#selected-interest').hidden = false;
    $('#selected-interest').textContent = `Твій інтерес: ${role.interest}`;
  }));
  $$('[data-benefit]').forEach((button) => button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    $$('[data-benefit]').forEach((option) => {
      const open = option === button && !expanded;
      option.setAttribute('aria-expanded', String(open));
      option.querySelector('span').textContent = open ? '−' : '+';
      document.getElementById(option.getAttribute('aria-controls')).hidden = !open;
    });
  }));
  $$('[data-step]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    $$('[data-step]').forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    $('#step-number').textContent = pad(index + 1);
    $('#step-title').textContent = steps[index][0];
    $('#step-description').textContent = steps[index][1];
  }));

  function openDialog(selector) {
    $$('dialog[open]').forEach((dialog) => dialog.close());
    $(selector).showModal();
  }
  $$('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  }));
  $('#overview-button').addEventListener('click', () => openDialog('#overview-dialog'));
  $('#help-button').addEventListener('click', () => openDialog('#help-dialog'));
  function openNotes() {
    $('#notes-title').textContent = `${pad(current + 1)} / ${slides[current].dataset.label}`;
    $('#notes-content').textContent = notes[current];
    openDialog('#notes-dialog');
  }
  $('#notes-button').addEventListener('click', openNotes);
  $('#join-button').addEventListener('click', () => {
    $('#conversation-text').textContent = selectedRole
      ? `Привіт! Мене зацікавила ваша команда. Мені близький напрям «${roles[selectedRole].interest}». Як я можу долучитися?`
      : 'Привіт! Мене зацікавила ваша команда. Хочу дізнатися більше про волонтерство й можливі ролі. З чого почати?';
    $('#copy-status').textContent = '';
    openDialog('#join-dialog');
  });
  $('#copy-button').addEventListener('click', async () => {
    const text = $('#conversation-text').textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      $('#copy-status').textContent = 'Скопійовано. Текст можна зберегти у власних нотатках.';
    } catch {
      const range = document.createRange(); range.selectNodeContents($('#conversation-text'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      $('#copy-status').textContent = 'Текст виділено. Скопіюй його вручну або почни розмову своїми словами.';
    }
  });

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  function applyMotion(reduced) {
    document.body.classList.toggle('reduce-motion', reduced);
    $('#motion-button').setAttribute('aria-pressed', String(reduced));
    $('#motion-button').title = reduced ? 'Зменшення руху ввімкнено' : 'Зменшити анімацію';
  }
  applyMotion(motionQuery.matches);
  motionQuery.addEventListener('change', (event) => applyMotion(event.matches));
  $('#motion-button').addEventListener('click', () => applyMotion(!document.body.classList.contains('reduce-motion')));

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      $('#slide-announcement').textContent = 'Браузер не дозволив повний екран. Скористайся його меню.';
    }
  }
  if (!document.fullscreenEnabled) $('#fullscreen-button').hidden = true;
  $('#fullscreen-button').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Вийти з повного екрана' : 'На весь екран';
    $('#fullscreen-button').setAttribute('aria-label', label);
    $('#fullscreen-button').title = `${label} (F)`;
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || dialogOpen()) return;
    if (event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    const key = event.key;
    if ((key === ' ' || key === 'Enter') && event.target.closest('button,a')) return;
    const keys = { ArrowRight: () => showSlide(current + 1), PageDown: () => showSlide(current + 1), ' ': () => showSlide(current + 1), ArrowLeft: () => showSlide(current - 1), PageUp: () => showSlide(current - 1), Home: () => showSlide(0), End: () => showSlide(slides.length - 1), f: toggleFullscreen, F: toggleFullscreen, o: () => openDialog('#overview-dialog'), O: () => openDialog('#overview-dialog'), n: openNotes, N: openNotes, '?': () => openDialog('#help-dialog') };
    if (keys[key]) { event.preventDefault(); keys[key](); }
  });

  let touchStart = null;
  $('main').addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1 || event.target.closest('button,a,[role=tablist]') || dialogOpen()) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  $('main').addEventListener('touchend', (event) => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8) showSlide(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  $('main').addEventListener('touchcancel', () => { touchStart = null; });

  const config = window.EORE_CONFIG || {};
  try {
    if (config.contactUrl) {
      const url = new URL(config.contactUrl);
      if (url.protocol === 'https:') {
        $('#contact-link').href = url.href;
        $('#contact-link').textContent = String(config.contactLabel || 'Зв’язатися з командою');
        $('#contact-link').hidden = false;
      }
    }
  } catch { /* An invalid optional contact must not prevent the presentation. */ }
  showSlide(readHash(), { history: 'replace', focus: false });
})();
