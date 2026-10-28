const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const { statSync } = require('node:fs');
const { chromium } = require('playwright');
const root = require('node:path').resolve(__dirname, '..');
const base = 'http://127.0.0.1:8794';
let browser, server;
before(async () => {
  for (const name of ['support-cooperation', 'support-session', 'experience-communication', 'experience-team', 'experience-creative', 'experience-growth', 'travel-rubtsi', 'travel-balakliia', 'travel-map', 'mission-discussion', 'role-communication', 'role-organization', 'role-creative', 'role-education']) assert.ok(statSync(`${root}/assets/${name}.webp`).size > 1000, `${name}: nonempty photo`);
  server = spawn('python3', ['-m', 'http.server', '8794', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.ok(ready, 'Local server starts');
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await mkdir(`${root}/test-results`, { recursive: true });
});
after(async () => { await browser?.close(); server?.kill(); });
async function open(options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', ...options });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('viewport').dataset.ready, { timeout: 30000 });
  return { context, page };
}
async function go(page, index) { await page.locator(`.chapter[data-go="${index}"]`).click(); await page.waitForTimeout(130); }
async function active(page, id) { assert.equal(await page.locator('body').getAttribute('data-chapter'), id); }

async function fittedPhoto(image) {
  await image.evaluate(el => el.decode());
  await image.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const frame = await image.evaluate(el => { const r = el.getBoundingClientRect(), bounds = el.closest('.media-surface').getBoundingClientRect(); return { fit: getComputedStyle(el).objectFit, ratio: r.width / r.height, natural: el.naturalWidth / el.naturalHeight, inside: r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom }; });
  assert.equal(frame.fit, 'contain'); assert.ok(Math.abs(frame.ratio - frame.natural) < .01, 'Full image preserves its source ratio'); assert.ok(frame.inside, 'All image edges stay inside the display frame');
}

test('Real WebGL scene, local resources, eight chapters and desktop visual fit', async () => {
  const { context, page } = await open();
  try {
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => document.querySelector('#viewport').dataset.ready === 'true');
    assert.equal(await page.locator('#viewport canvas').count(), 1);
    await page.waitForFunction(() => document.querySelector('#viewport').dataset.eoreLetters === '4');
    assert.equal((await page.locator('#viewport').getAttribute('data-eore-colors')).split(',').length, 4);
    assert.equal(await page.locator('.chapter').count(), 8);
    assert.equal(await page.locator('#viewport').getAttribute('data-perimeter-stakes'), '6');
    assert.equal(await page.locator('#viewport canvas').evaluate(canvas => !!canvas.getContext('webgl2')), true);
    for (const [index, id] of ['intro', 'purpose', 'roles', 'experience', 'mine-map', 'air-map', 'journey', 'join'].entries()) {
      await go(page, index); await active(page, id); await page.waitForTimeout(350);
      assert.equal(await page.locator('#viewport').getAttribute('data-visible-count'), String(Math.min(index, 6)));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const overlap = await page.locator('.narrative').evaluate(el => el.getBoundingClientRect().bottom > document.querySelector('.timeline').getBoundingClientRect().top);
      assert.equal(overlap, false, `${id}: text remains above the timeline`);
      await page.screenshot({ path: `${root}/test-results/desktop-${id}.png` });
    }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  } finally { await context.close(); }
});

test('Keyboard, boundaries, direct links, browser history and catalog', async () => {
  const { context, page } = await open();
  try {
    await page.keyboard.press('ArrowLeft'); await active(page, 'intro');
    await page.keyboard.press('ArrowRight'); await active(page, 'purpose');
    await page.keyboard.press('PageDown'); assert.equal(await page.locator('#mission-tab-0').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Escape');
    await page.keyboard.press('PageDown'); await active(page, 'roles');
    await page.goBack(); await active(page, 'purpose'); await page.goForward(); await active(page, 'roles');
    await page.keyboard.press('End'); await active(page, 'join');
    await page.keyboard.press('o'); assert.equal(await page.locator('#inspector').isVisible(), true);
    await page.locator('.catalog-card[data-element="experience"]').click(); assert.match(await page.locator('#inspector-title').textContent(), /Вміння/);
    await page.keyboard.press('Escape'); await page.keyboard.press('Home'); await active(page, 'intro');
    await page.goto(`${base}/#journey`); await active(page, 'journey');
    await page.keyboard.press('n'); assert.match(await page.locator('.notes-copy').textContent(), /чотири кроки/);
  } finally { await context.close(); }
});

test('3D marker and raycasting both open the actual object story', async () => {
  const { context, page } = await open();
  try {
    await go(page, 1); const marker = page.locator('.scene-marker[data-element="purpose"]'); await marker.waitFor({ state: 'visible' });
    await marker.click(); assert.match(await page.locator('#inspector-title').textContent(), /Безпека/);
    assert.equal(await page.locator('#mission-tab-0').getAttribute('aria-selected'), 'true'); await page.keyboard.press('Escape');
    const bounds = await marker.boundingBox(); let opened = false;
    for (const offset of [55, 85, 110]) {
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height + offset);
      if (await page.locator('#inspector').isVisible()) { opened = true; break; }
    }
    assert.ok(opened, 'Click on the rendered 3D board/podium opens its story');
    assert.match(await page.locator('#inspector-title').textContent(), /Безпека/);
  } finally { await context.close(); }
});

test('Interactive mission, role memory, benefits, journey and personalized invitation', async () => {
  const { context, page } = await open();
  try {
    const writes = []; page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
    await go(page, 1); await page.locator('#open-section').click();
    await page.locator('#mission-tab-1').click();
    assert.equal(await page.locator('#mission-tab-1').getAttribute('aria-selected'), 'true'); await active(page, 'purpose');
    assert.match(await page.locator('#mission-panel h3').textContent(), /Ситуації/); await page.keyboard.press('Escape');
    await go(page, 2); await page.locator('#open-section').click(); await page.locator('[data-role="education"]').click();
    assert.match(await page.locator('#role-title').textContent(), /після підготовки/);
    await page.locator('[data-role="creative"]').click(); await page.keyboard.press('Escape');
    await go(page, 3); await page.locator('#open-section').click(); await page.locator('[data-benefit="1"]').click();
    assert.equal(await page.locator('#benefit-1').isVisible(), true); assert.equal(await page.locator('#benefit-0').isVisible(), false); await page.keyboard.press('Escape');
    await go(page, 6); await page.locator('#open-section').click(); await page.locator('[data-step="3"]').click();
    assert.equal(await page.locator('#step-number').textContent(), '04'); await page.keyboard.press('Escape');
    await go(page, 7); assert.match(await page.locator('#selected-interest').textContent(), /фото, відео та дизайн/);
    await page.locator('#guided-next').click(); assert.match(await page.locator('#conversation-text').textContent(), /фото, відео та дизайн/);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
    await page.locator('#copy-button').click(); assert.match(await page.locator('#copy-status').textContent(), /вручну/);
    assert.deepEqual(writes, []);
  } finally { await context.close(); }
});

test('Named photos, support gallery and humorous travel card stay linked to the 3D display', async () => {
  const { context, page } = await open();
  try {
    const shaderErrors = []; page.on('console', message => { if (message.type() === 'error') shaderErrors.push(message.text()); });
    await go(page, 1); await page.locator('#open-section').click(); await page.locator('#mission-tab-2').click();
    const support = page.locator('#mission-media');
    assert.match(await support.locator('.media-foreground').getAttribute('src'), /support-cooperation/);
    assert.equal(await support.locator('[data-photo]').count(), 2); await fittedPhoto(support.locator('.media-foreground'));
    await support.locator('[data-photo-next]').click(); assert.match(await support.locator('.media-foreground').getAttribute('src'), /support-session/);
    await fittedPhoto(support.locator('.media-foreground'));
    assert.match(await page.locator('#viewport').getAttribute('data-purpose-photo'), /support-session/);
    await page.waitForFunction(() => document.querySelector('#viewport').dataset.purposePhotoLoaded?.includes('support-session'));
    assert.doesNotMatch(await support.locator('.media-credit').textContent(), /2024/);
    await page.screenshot({ path: `${root}/test-results/support-gallery.png` });
    await page.keyboard.press('Escape'); await go(page, 3); await page.locator('#open-section').click();
    for (const [index, path] of [[0, 'experience-communication'], [1, 'experience-team'], [2, 'experience-creative']]) {
      await page.locator(`[data-benefit="${index}"]`).click(); assert.match(await page.locator('#benefit-media .media-foreground').getAttribute('src'), new RegExp(path));
      await fittedPhoto(page.locator('#benefit-media .media-foreground'));
    }
    await page.locator('[data-benefit="3"]').click();
    assert.match(await page.locator('#benefit-3').textContent(), /власні цілі/);
    assert.doesNotMatch(await page.locator('#benefit-3').textContent(), /мер|нагород/i);
    assert.match(await page.locator('#benefit-media .media-foreground').getAttribute('src'), /experience-growth/);
    await fittedPhoto(page.locator('#benefit-media .media-foreground'));
    await page.screenshot({ path: `${root}/test-results/experience-growth.png` });
    await page.locator('.travel-option').click();
    assert.match(await page.locator('#benefit-4').textContent(), /туристичний клуб/);
    const gallery = page.locator('#benefit-media');
    assert.equal(await gallery.locator('[data-photo]').count(), 3);
    for (const [index, path] of ['travel-rubtsi', 'travel-balakliia', 'travel-map'].entries()) {
      await gallery.locator('[data-photo]').nth(index).click();
      assert.match(await gallery.locator('.media-foreground').getAttribute('src'), new RegExp(path));
      assert.match(await page.locator('#viewport').getAttribute('data-experience-photo'), new RegExp(path));
      await page.waitForFunction(expected => document.querySelector('#viewport').dataset.experiencePhotoLoaded?.includes(expected), path);
      const image = gallery.locator('.media-foreground'); await fittedPhoto(image);
      assert.equal(await image.evaluate(el => getComputedStyle(el).objectFit), 'contain');
    }
    await page.screenshot({ path: `${root}/test-results/travel-gallery.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    await page.screenshot({ path: `${root}/test-results/travel-object.png` });
    assert.deepEqual(shaderErrors, []);
  } finally { await context.close(); }
});

test('Cinematic camera sequence, focus isolation, completion and return', async () => {
  const { context, page } = await open();
  try {
    await page.locator('#cinema-start').click(); assert.equal(await page.locator('#cinema').isVisible(), true);
    assert.equal(await page.locator('main').evaluate(el => el.inert), true);
    for (const count of ['1', '2', '6']) { await page.keyboard.press('PageDown'); assert.equal(await page.locator('#viewport').getAttribute('data-visible-count'), count); }
    assert.equal(await page.locator('#cinema-count').textContent(), '04 / 04');
    await page.locator('#cinema-next').click(); await active(page, 'purpose');
    assert.equal(await page.locator('#cinema').isVisible(), false); assert.equal(await page.locator('main').evaluate(el => el.inert), false);
    await go(page, 7); await page.locator('#cinema-start').click(); await page.keyboard.press('ArrowRight'); await page.locator('#cinema-next').click();
    assert.equal(await page.locator('#inspector').isVisible(), true); assert.match(await page.locator('#inspector-title').textContent(), /розмову/);
  } finally { await context.close(); }
});

test('Presenter mode, reduced motion, auto show stops on interaction and at finale', async () => {
  const { context, page } = await open();
  try {
    assert.equal(await page.locator('#autoplay').isDisabled(), true);
    await page.keyboard.press('p'); assert.equal(await page.locator('.timeline').isVisible(), false);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.timeline').isVisible(), true);
    await page.locator('#motion').click(); assert.equal(await page.locator('#autoplay').isDisabled(), false);
    await page.locator('#autoplay').click(); await active(page, 'purpose');
    assert.equal(await page.locator('#autoplay').getAttribute('aria-pressed'), 'true');
    await page.locator('#open-section').click(); assert.equal(await page.locator('#autoplay').getAttribute('aria-pressed'), 'false'); await page.keyboard.press('Escape');
    await go(page, 6); await page.locator('#autoplay').click(); await active(page, 'join'); assert.equal(await page.locator('#autoplay').getAttribute('aria-pressed'), 'false');
    await page.locator('#motion').click();
    assert.equal(await page.locator('#autoplay').isDisabled(), true);
  } finally { await context.close(); }
});

test('Mobile composition, longest role, dialog focus and swipe', async () => {
  for (const width of [390, 320]) {
    const { context, page } = await open({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    try {
      for (const [index, id] of ['intro', 'purpose', 'roles', 'experience', 'mine-map', 'air-map', 'journey', 'join'].entries()) {
        await go(page, index); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}: ${id}`);
        const fit = await page.locator('.narrative').evaluate(el => { const r = el.getBoundingClientRect(), footer = document.querySelector('.timeline').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 75 && r.bottom < footer.top; });
        assert.ok(fit, `${width}: ${id} narrative fits`);
        if (width === 390) await page.screenshot({ path: `${root}/test-results/mobile-${id}.png`, fullPage: true });
      }
      await go(page, 2); await page.locator('#open-section').click(); await page.locator('[data-role="education"]').click();
      assert.equal(await page.locator('.role-options').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'Role choices fit the mobile column');
      await page.locator('.role-caveat').scrollIntoViewIfNeeded(); assert.equal(await page.locator('.role-caveat').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${root}/test-results/mobile-role-${width}.png`, fullPage: true });
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#open-section').evaluate(el => el === document.activeElement), true);
      await go(page, 3); await page.locator('#open-section').click(); await page.locator('.travel-option').click();
      await page.locator('#benefit-media').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${root}/test-results/mobile-travel-${width}.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await go(page, 4); await page.locator('#open-section').click();
      assert.equal(await page.locator('#map-about-tab').getAttribute('aria-selected'), 'true');
      await page.waitForTimeout(80); assert.equal(await page.locator('#inspector-body').evaluate(el => el.scrollTop), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${root}/test-results/mobile-map-about-${width}.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await go(page, 0);
      await page.locator('#viewport').evaluate(el => {
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: el, clientX: 290, clientY: 180 })], bubbles: true }));
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch({ identifier: 1, target: el, clientX: 60, clientY: 185 })], bubbles: true }));
      }); await active(page, 'purpose');
      await go(page, 0); await page.locator('.header .theme-toggle').click();
      await page.waitForFunction(() => document.querySelector('#viewport').dataset.sceneTheme === 'light');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${root}/test-results/light-mobile-${width}.png`, fullPage: true });
    } finally { await context.close(); }
  }
});

test('WebGL failure retains every story and validates optional contact', async () => {
  const { context, page } = await open({}, () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); };
  });
  try {
    assert.equal(await page.locator('#viewport').getAttribute('data-ready'), 'fallback');
    await page.locator('#catalog').click(); await page.locator('[data-element="roles"]').click();
    await page.locator('[data-role="events"]').click(); await page.keyboard.press('Escape');
    for (const [contactUrl, visible] of [['https://example.org/contact', true], ['javascript:alert(1)', false]]) {
      await page.evaluate(url => { window.EORE_CONFIG = { contactUrl: url, contactLabel: 'Контакт команди' }; }, contactUrl);
      await go(page, 7); await page.locator('#guided-next').click(); assert.equal(await page.locator('#contact-link').isVisible(), visible); await page.keyboard.press('Escape');
    }
  } finally { await context.close(); }
});

test('Print keeps eight pages and the JavaScript-free introduction remains readable', async () => {
  const { context, page } = await open();
  try { const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true }); assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 8); }
  finally { await context.close(); }
  const fallback = await browser.newContext({ javaScriptEnabled: false });
  try { const page = await fallback.newPage(); await page.goto(base); assert.equal(await page.locator('.noscript-note').isVisible(), true); }
  finally { await fallback.close(); }
});


test('One button traverses every scene, tab and photo in order, including maps and invitation', async () => {
  const { context, page } = await open();
  try {
    await page.route('https://deafinicio.github.io/*-map/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Map test transport</title><p>Map application response</p>' }));
    const next = async () => { await page.locator('#guided-next').click(); await page.waitForTimeout(40); };
    await next(); await active(page, 'purpose'); assert.equal(await page.locator('#inspector').isVisible(), false);
    await next(); assert.equal(await page.locator('#mission-tab-0').getAttribute('aria-selected'), 'true'); await fittedPhoto(page.locator('#mission-media .media-foreground'));
    await next(); assert.equal(await page.locator('#mission-tab-1').getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('#mission-media .media-foreground').getAttribute('src'), /mission-discussion/); await fittedPhoto(page.locator('#mission-media .media-foreground'));
    await next(); assert.equal(await page.locator('#mission-tab-2').getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('.media-foreground').getAttribute('src'), /support-cooperation/);
    await next(); assert.match(await page.locator('.media-foreground').getAttribute('src'), /support-session/);
    await next(); assert.equal(await page.locator('#inspector').isVisible(), false); await active(page, 'purpose');
    await next(); await active(page, 'roles'); await next();
    for (const [i, role] of ['communication', 'events', 'creative', 'education'].entries()) {
      if (i) await next(); assert.equal(await page.locator(`[data-role="${role}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.role-photo-strip').count(), 0);
      const filename = ['role-communication', 'role-organization', 'role-creative', 'role-education'][i];
      assert.match(await page.locator('#role-media .media-foreground').getAttribute('src'), new RegExp(filename));
      await fittedPhoto(page.locator('#role-media .media-foreground'));
      assert.equal(await page.locator('#role-media .media-foreground').evaluate(image => getComputedStyle(image).objectFit), 'contain');
      assert.equal(await page.locator('.role-detail').evaluate(el => el.getBoundingClientRect().bottom < document.querySelector('.inspector-footer').getBoundingClientRect().top), true, 'Large role photo fits above the presenter control');
      assert.equal(await page.locator('.role-copy').evaluate(el => { const tabs = document.querySelector('.role-options').getBoundingClientRect(), photo = document.querySelector('#role-media').getBoundingClientRect(), text = el.getBoundingClientRect(); return text.top >= tabs.bottom && text.right < photo.left; }), true, 'Role copy stays below the four choices on the left');
      assert.equal(await page.locator('#role-media .media-surface').evaluate(el => el.getBoundingClientRect().width > document.querySelector('.roles-layout').getBoundingClientRect().width * .5), true, 'Photo uses the full right pane');
      await page.waitForFunction(() => { const image = document.querySelector('#role-media .media-foreground'), frame = image.getBoundingClientRect(); return Math.abs(frame.width / frame.height - image.naturalWidth / image.naturalHeight) < .01; });
      await page.screenshot({ path: `${root}/test-results/role-${role}.png` });
    }
    await next(); assert.equal(await page.locator('#inspector').isVisible(), false); await next(); await active(page, 'experience'); await next();
    for (const [i, photo] of ['experience-communication', 'experience-team', 'experience-creative', 'experience-growth', 'travel-rubtsi', 'travel-balakliia', 'travel-map'].entries()) {
      if (i) await next(); assert.match(await page.locator('.media-foreground').getAttribute('src'), new RegExp(photo));
    }
    await next(); assert.equal(await page.locator('#inspector').isVisible(), false);
    for (const id of ['mine-map', 'air-map']) {
      await next(); await active(page, id); await next();
      assert.equal(await page.locator('#map-about-tab').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('iframe').count(), 0, 'No map runs before its live demonstration');
      await page.screenshot({ path: `${root}/test-results/${id}-about.png` });
      await next(); assert.equal(await page.locator('#map-live-tab').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('.map-frame-shell iframe').getAttribute('src'), `https://deafinicio.github.io/${id === 'mine-map' ? 'mine-risk-map' : 'air-threat-map'}/`);
      assert.equal(await page.locator('.map-frame-shell').evaluate(el => el.getBoundingClientRect().bottom <= document.querySelector('.inspector-footer').getBoundingClientRect().top), true, 'Full map frame fits above presentation controls');
      await page.screenshot({ path: `${root}/test-results/${id}-live-layout.png` });
      await next(); assert.equal(await page.locator('#inspector').isVisible(), false);
      assert.equal(await page.locator('iframe').count(), 0, 'Closed maps stop network polling by removing the frame');
    }
    await next(); await active(page, 'journey'); await next();
    for (let i = 0; i < 4; i++) { if (i) await next(); assert.equal(await page.locator('#step-number').textContent(), String(i + 1).padStart(2, '0')); }
    await next(); assert.equal(await page.locator('#inspector').isVisible(), false); await next(); await active(page, 'join');
    await next(); assert.equal(await page.locator('#conversation-text').isVisible(), true); await next();
    assert.match(await page.locator('#guided-label').textContent(), /спочатку/); await next(); await active(page, 'intro');
  } finally { await context.close(); }
});

test('Every story restarts at its first element and guidance follows manual changes', async () => {
  const { context, page } = await open();
  try {
    for (const [index, selector, first, last] of [[1, '[data-mission]', 'aria-selected', 2], [2, '[data-role]', 'aria-pressed', 3], [3, '[data-benefit]', 'aria-expanded', 4], [6, '[data-step]', 'aria-pressed', 3]]) {
      await go(page, index); await page.locator('#open-section').click(); await page.locator(selector).nth(last).click();
      await page.keyboard.press('Escape'); await page.locator('#open-section').click();
      assert.equal(await page.locator(selector).first().getAttribute(first), 'true');
      await page.keyboard.press('Escape');
    }
    await go(page, 3); await page.locator('#open-section').click(); await page.locator('.travel-option').click();
    await page.locator('[data-photo]').nth(1).click(); assert.match(await page.locator('#guided-label').textContent(), /Фото 3 з 3/);
    await page.keyboard.press('PageDown'); assert.match(await page.locator('.media-foreground').getAttribute('src'), /travel-map/);
    await page.keyboard.press('Space'); assert.equal(await page.locator('#inspector').isVisible(), false);
    await page.keyboard.press('ArrowRight'); await active(page, 'mine-map');
  } finally { await context.close(); }
});

test('Map frame exposes full application controls, forwarding presenter keys on shared origin', async () => {
  const { context, page } = await open();
  try {
    const origin = 'https://deafinicio.github.io';
    await page.route(`${origin}/EORE-dept/**`, async route => {
      const url = new URL(route.request().url());
      const local = base + url.pathname.replace('/EORE-dept', '') + url.search;
      const response = await page.request.get(local); await route.fulfill({ response });
    });
    await page.route(`${origin}/mine-risk-map/`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><button id="filter">Фільтр мапи</button><output></output><script>document.querySelector("button").onclick=()=>document.querySelector("output").textContent="Фільтр змінено"</script>' }));
    await page.goto(`${origin}/EORE-dept/#mine-map`); await page.locator('#open-section').click();
    await page.locator('#guided-next').click();
    const frame = page.frameLocator('.map-frame-shell iframe');
    await frame.locator('#filter').click(); assert.equal(await frame.locator('output').textContent(), 'Фільтр змінено');
    await page.keyboard.press('PageDown'); assert.equal(await page.locator('#inspector').isVisible(), false);
    await page.keyboard.press('PageDown'); await active(page, 'air-map');
  } finally { await context.close(); }
});


test('Light theme covers the scene and stories, persists, and clicker focus stays unobtrusive', async () => {
  const { context, page } = await open();
  try {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.locator('.header .theme-toggle').click();
    await page.waitForFunction(() => document.querySelector('#viewport').dataset.sceneTheme === 'light');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.screenshot({ path: `${root}/test-results/light-intro.png` });
    await go(page, 2); await page.keyboard.press('PageDown');
    assert.equal(await page.locator('#inspector-title').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    const layout = await page.locator('.roles-layout').evaluate(el => {
      const heading = el.querySelector('.section-heading').getBoundingClientRect(), tabs = el.querySelector('.role-options').getBoundingClientRect(), photo = el.querySelector('.role-detail').getBoundingClientRect();
      return Math.abs(heading.left - tabs.left) < 1 && Math.abs(heading.right - tabs.right) < 1 && photo.top <= heading.top + 1;
    }); assert.ok(layout, 'Heading matches the left column; photo starts at the top');
    await fittedPhoto(page.locator('#role-media .media-foreground'));
    const source = await page.locator('#role-media .media-foreground').getAttribute('src');
    await page.screenshot({ path: `${root}/test-results/light-roles.png` });
    await page.locator('#inspector .theme-toggle').click();
    assert.equal(await page.locator('#viewport').getAttribute('data-scene-theme'), 'dark');
    assert.equal(await page.locator('#role-media .media-foreground').getAttribute('src'), source);
    assert.equal(await page.locator('[data-role="communication"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#inspector .theme-toggle').click(); await page.keyboard.press('PageDown');
    assert.equal(await page.locator('[data-role="events"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('clicker-input')), true);
    await page.locator('#inspector-title').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('clicker-input')), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'solid', 'Normal Tab navigation retains its visible focus');
    await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#viewport').dataset.sceneTheme === 'light');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    for (const [index, label] of [[1, 'purpose'], [3, 'experience'], [6, 'journey'], [7, 'join']]) {
      await go(page, index); await page.locator('#guided-next').click();
      await page.screenshot({ path: `${root}/test-results/light-${label}.png` });
      await page.keyboard.press('Escape');
    }
    await go(page, 7); await page.locator('#cinema-start').click();
    await page.screenshot({ path: `${root}/test-results/light-cinema.png` });
    await page.locator('#cinema .theme-toggle').click();
    assert.equal(await page.locator('#viewport').getAttribute('data-scene-theme'), 'dark');
    await page.keyboard.press('Escape'); assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
