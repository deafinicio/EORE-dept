const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const { chromium } = require('playwright');
const root = require('node:path').resolve(__dirname, '..');
const base = 'http://127.0.0.1:8794';
let browser, server;
before(async () => {
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

test('Real WebGL scene, local resources, six chapters and desktop visual fit', async () => {
  const { context, page } = await open();
  try {
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => document.querySelector('#viewport').dataset.ready === 'true');
    assert.equal(await page.locator('#viewport canvas').count(), 1);
    assert.equal(await page.locator('.chapter').count(), 6);
    assert.equal(await page.locator('#viewport canvas').evaluate(canvas => !!canvas.getContext('webgl2')), true);
    for (const [index, id] of ['intro', 'purpose', 'roles', 'experience', 'journey', 'join'].entries()) {
      await go(page, index); await active(page, id); await page.waitForTimeout(350);
      assert.equal(await page.locator('#viewport').getAttribute('data-visible-count'), String(Math.min(index, 4)));
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
    await page.keyboard.press('PageDown'); await active(page, 'roles');
    await page.goBack(); await active(page, 'purpose'); await page.goForward(); await active(page, 'roles');
    await page.keyboard.press('End'); await active(page, 'join'); await page.keyboard.press('ArrowRight'); await active(page, 'join');
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
    await marker.click(); assert.match(await page.locator('#inspector-title').textContent(), /Безпека/); await page.keyboard.press('Escape');
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
    await page.locator('#mission-tab-0').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#mission-tab-1').getAttribute('aria-selected'), 'true'); await active(page, 'purpose');
    assert.match(await page.locator('#mission-panel h3').textContent(), /Ситуації/); await page.keyboard.press('Escape');
    await go(page, 2); await page.locator('#open-section').click(); await page.locator('[data-role="education"]').click();
    assert.match(await page.locator('#role-title').textContent(), /після підготовки/);
    await page.locator('[data-role="creative"]').click(); await page.keyboard.press('Escape');
    await go(page, 3); await page.locator('#open-section').click(); await page.locator('[data-benefit="1"]').click();
    assert.equal(await page.locator('#benefit-1').isVisible(), true); assert.equal(await page.locator('#benefit-0').isVisible(), false); await page.keyboard.press('Escape');
    await go(page, 4); await page.locator('#open-section').click(); await page.locator('[data-step="3"]').click();
    assert.equal(await page.locator('#step-number').textContent(), '04'); await page.keyboard.press('Escape');
    await go(page, 5); assert.match(await page.locator('#selected-interest').textContent(), /фото, відео та дизайн/);
    await page.locator('#next').click(); assert.match(await page.locator('#conversation-text').textContent(), /фото, відео та дизайн/);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
    await page.locator('#copy-button').click(); assert.match(await page.locator('#copy-status').textContent(), /вручну/);
    assert.deepEqual(writes, []);
  } finally { await context.close(); }
});

test('Cinematic camera sequence, focus isolation, completion and return', async () => {
  const { context, page } = await open();
  try {
    await page.locator('#cinema-start').click(); assert.equal(await page.locator('#cinema').isVisible(), true);
    assert.equal(await page.locator('main').evaluate(el => el.inert), true);
    for (const count of ['1', '2', '4']) { await page.keyboard.press('PageDown'); assert.equal(await page.locator('#viewport').getAttribute('data-visible-count'), count); }
    assert.equal(await page.locator('#cinema-count').textContent(), '04 / 04');
    await page.locator('#cinema-next').click(); await active(page, 'purpose');
    assert.equal(await page.locator('#cinema').isVisible(), false); assert.equal(await page.locator('main').evaluate(el => el.inert), false);
    await go(page, 5); await page.locator('#cinema-start').click(); await page.keyboard.press('ArrowRight'); await page.locator('#cinema-next').click();
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
    await go(page, 4); await page.locator('#autoplay').click(); await active(page, 'join'); assert.equal(await page.locator('#autoplay').getAttribute('aria-pressed'), 'false');
    // A manual toggle is retained until the system setting actually changes.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
    await page.waitForTimeout(150);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#autoplay').disabled);
    assert.equal(await page.locator('#autoplay').isDisabled(), true);
  } finally { await context.close(); }
});

test('Mobile composition, longest role, dialog focus and swipe', async () => {
  for (const width of [390, 320]) {
    const { context, page } = await open({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    try {
      for (const [index, id] of ['intro', 'purpose', 'roles', 'experience', 'journey', 'join'].entries()) {
        await go(page, index); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}: ${id}`);
        const fit = await page.locator('.narrative').evaluate(el => { const r = el.getBoundingClientRect(), footer = document.querySelector('.timeline').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 75 && r.bottom < footer.top; });
        assert.ok(fit, `${width}: ${id} narrative fits`);
        if (width === 390) await page.screenshot({ path: `${root}/test-results/mobile-${id}.png`, fullPage: true });
      }
      await go(page, 2); await page.locator('#open-section').click(); await page.locator('[data-role="education"]').click();
      await page.locator('.role-caveat').scrollIntoViewIfNeeded(); assert.equal(await page.locator('.role-caveat').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${root}/test-results/mobile-role-${width}.png`, fullPage: true });
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#open-section').evaluate(el => el === document.activeElement), true);
      await go(page, 0);
      await page.locator('#viewport').evaluate(el => {
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: el, clientX: 290, clientY: 180 })], bubbles: true }));
        el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch({ identifier: 1, target: el, clientX: 60, clientY: 185 })], bubbles: true }));
      }); await active(page, 'purpose');
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
      await go(page, 5); await page.locator('#next').click(); assert.equal(await page.locator('#contact-link').isVisible(), visible); await page.keyboard.press('Escape');
    }
  } finally { await context.close(); }
});

test('Print keeps six pages and the JavaScript-free introduction remains readable', async () => {
  const { context, page } = await open();
  try { const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true }); assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 6); }
  finally { await context.close(); }
  const fallback = await browser.newContext({ javaScriptEnabled: false });
  try { const page = await fallback.newPage(); await page.goto(base); assert.equal(await page.locator('.noscript-note').isVisible(), true); }
  finally { await fallback.close(); }
});
