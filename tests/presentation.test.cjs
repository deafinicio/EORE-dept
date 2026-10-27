const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { mkdir } = require('node:fs/promises');
const root = require('node:path').resolve(__dirname, '..');
const base = 'http://127.0.0.1:8794';
let browser, server;

before(async () => {
  server = spawn('python3', ['-m', 'http.server', '8794', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(base); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Local server started');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  await mkdir(`${root}/test-results`, { recursive: true });
});
after(async () => { await browser?.close(); server?.kill(); });

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  return { context, page };
}
async function active(page, id) {
  assert.equal(await page.locator('.slide:not([hidden])').count(), 1);
  assert.equal(await page.locator('.slide:not([hidden])').getAttribute('id'), id);
}

test('Six screens, keyboard, boundaries, overview and browser history', async () => {
  const { page, context } = await open();
  try {
    await active(page, 'intro');
    assert.equal(await page.locator('#prev-button').isDisabled(), true);
    await page.keyboard.press('ArrowLeft'); await active(page, 'intro');
    await page.keyboard.press('ArrowRight'); await active(page, 'purpose');
    await page.keyboard.press('PageDown'); await active(page, 'roles');
    await page.goBack(); await active(page, 'purpose');
    await page.goForward(); await active(page, 'roles');
    await page.keyboard.press('End'); await active(page, 'join');
    assert.equal(await page.locator('#next-button').isDisabled(), true);
    await page.keyboard.press('ArrowRight'); await active(page, 'join');
    await page.keyboard.press('o');
    assert.equal(await page.locator('#overview-dialog').isVisible(), true);
    await page.locator('#overview-dialog [data-go="3"]').click(); await active(page, 'experience');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    await page.keyboard.press('Home'); await active(page, 'intro');
    await page.goto(`${base}/#journey`); await active(page, 'journey');
  } finally { await context.close(); }
});

test('Role choice persists across screens and customizes the conversation without sending data', async () => {
  const { page, context } = await open();
  try {
    const mutations = []; page.on('request', r => { if (r.method() !== 'GET') mutations.push(r.url()); });
    await page.locator('.intro [data-go="2"]').click();
    await page.locator('[data-role="creative"]').click();
    assert.match(await page.locator('#role-title').textContent(), /Фото/);
    await page.keyboard.press('End');
    assert.match(await page.locator('#selected-interest').textContent(), /фото, відео та дизайн/);
    await page.locator('#join-button').click();
    assert.match(await page.locator('#conversation-text').textContent(), /фото, відео та дизайн/);
    await page.keyboard.press('ArrowLeft'); await active(page, 'join');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Home'); await page.locator('.intro [data-go="2"]').click();
    assert.equal(await page.locator('[data-role="creative"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(mutations, []);
  } finally { await context.close(); }
});

test('Tabs own arrow keys; benefits, steps, notes and reduced motion respond', async () => {
  const { page, context } = await open();
  try {
    await page.goto(`${base}/#purpose`);
    await page.locator('#mission-tab-0').focus(); await page.keyboard.press('ArrowRight');
    await active(page, 'purpose');
    assert.equal(await page.locator('#mission-tab-1').getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('#mission-panel h3').textContent(), /Ситуації/);
    await page.locator('.progress-nav [data-go="3"]').click();
    await page.locator('[data-benefit="1"]').click();
    assert.equal(await page.locator('#benefit-1').isVisible(), true);
    assert.equal(await page.locator('#benefit-0').isVisible(), false);
    await page.locator('.progress-nav [data-go="4"]').click();
    await page.locator('[data-step="3"]').click();
    assert.equal(await page.locator('#step-number').textContent(), '04');
    assert.match(await page.locator('#step-title').textContent(), /практиці/);
    await page.keyboard.press('n');
    assert.equal(await page.locator('#notes-dialog').isVisible(), true);
    assert.match(await page.locator('#notes-content').textContent(), /чотири кроки/);
    await page.keyboard.press('Escape');
    await page.locator('#motion-button').click();
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('reduce-motion')), true);
  } finally { await context.close(); }
});

test('Desktop slides fit, images load, no console errors or external dependencies', async () => {
  const { page, context } = await open();
  try {
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', r => { if (!r.url().startsWith(base)) external.push(r.url()); });
    await page.reload({ waitUntil: 'networkidle' });
    for (const id of ['intro', 'purpose', 'roles', 'experience', 'journey', 'join']) {
      await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const result = await page.evaluate(() => {
        const slide = document.querySelector('.slide:not([hidden])');
        const bounds = slide.getBoundingClientRect();
        const meaningful = [...slide.querySelectorAll('h1,h2,h3,p,button,.role-options,.role-detail,.journey-steps,.journey-detail')].filter(el => !el.hidden && el.getClientRects().length);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          clipped: meaningful.filter(el => { const r = el.getBoundingClientRect(); return r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1 || r.right > bounds.right + 1 || r.left < bounds.left - 1; }).map(el => el.id || el.className || el.tagName),
          broken: [...slide.querySelectorAll('img')].filter(el => !el.complete || !el.naturalWidth).map(el => el.src),
        };
      });
      assert.equal(result.overflow, false, `${id}: no horizontal overflow`);
      assert.deepEqual(result.clipped, [], `${id}: text and controls fit`);
      assert.deepEqual(result.broken, [], `${id}: photos load`);
      await page.screenshot({ path: `${root}/test-results/desktop-${id}.png` });
    }
    // The longest role must fit too.
    await page.goto(`${base}/#roles`); await page.locator('[data-role="education"]').click();
    const clipped = await page.locator('.role-detail').evaluate(el => el.scrollHeight > el.clientHeight + 1);
    assert.equal(clipped, false, 'Education role fits');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  } finally { await context.close(); }
});

test('Mobile layouts, accessible dialog focus and horizontal swipe', async () => {
  const { page, context } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    for (const id of ['intro', 'purpose', 'roles', 'experience', 'journey', 'join']) {
      await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, id);
      assert.equal(await page.evaluate(() => scrollY), 0, `${id}: direct links retain the header`);
      const clipped = await page.locator('.slide:not([hidden])').evaluate(slide => {
        const bounds = slide.getBoundingClientRect();
        return [...slide.querySelectorAll('h1,h2,h3,p,button')].filter(el => !el.hidden && el.getClientRects().length).some(el => {
          const r = el.getBoundingClientRect();
          return r.bottom > bounds.bottom + 1 || r.right > bounds.right + 1 || r.left < bounds.left - 1;
        });
      });
      assert.equal(clipped, false, `${id}: all text and controls accessible`);
      await page.screenshot({ path: `${root}/test-results/mobile-${id}.png`, fullPage: true });
    }
    await page.goto(`${base}/#intro`);
    await page.locator('main').evaluate(el => {
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: el, clientX: 330, clientY: 200 })], bubbles: true }));
      el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [new Touch({ identifier: 1, target: el, clientX: 70, clientY: 205 })], bubbles: true }));
    });
    await active(page, 'purpose');
    await page.locator('#overview-button').click();
    const focusedInside = await page.locator('#overview-dialog').evaluate(el => el.contains(document.activeElement));
    assert.equal(focusedInside, true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overview-button').evaluate(el => el === document.activeElement), true);
  } finally { await context.close(); }
});

test('Optional contact validates protocol, system reduced motion, clipboard fallback', async () => {
  for (const [contactUrl, visible] of [['https://example.org/contact', true], ['javascript:alert(1)', false], ['invalid', false]]) {
    const { page, context } = await open({ reducedMotion: 'reduce' });
    try {
      await page.route('**/site.config.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.EORE_CONFIG=${JSON.stringify({ contactUrl, contactLabel: 'Контакт команди' })}` }));
      await page.reload(); await page.goto(`${base}/#join`);
      assert.equal(await page.locator('#contact-link').isVisible(), visible);
      assert.equal(await page.locator('body').evaluate(el => el.classList.contains('reduce-motion')), true);
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
      await page.locator('#join-button').click(); await page.locator('#copy-button').click();
      assert.match(await page.locator('#copy-status').textContent(), /вручну/);
    } finally { await context.close(); }
  }
});

test('Print is six pages, and a JavaScript-free fallback exposes all six sections', async () => {
  const { page, context } = await open();
  try {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const count = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
    assert.equal(count, 6);
  } finally { await context.close(); }
  const fallback = await open({ javaScriptEnabled: false });
  try {
    assert.equal(await fallback.page.locator('.slide:visible').count(), 6);
  } finally { await fallback.context.close(); }
});
