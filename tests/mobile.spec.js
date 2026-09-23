const { test, expect } = require('@playwright/test');

const TOYS = ['tinker','shapes','creature','marbles','basketball','bowling','numbers','logic','balance','circuits','machine','sounds'];

test.beforeEach(async ({ page }) => {
  page.on('pageerror', err => { throw err; });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function openToy(page, id) {
  await page.click(`[data-toy="${id}"]`);
  await expect(page.locator('#gameScreen')).toHaveClass(/active/);
  await page.waitForTimeout(400);
}

for (const id of TOYS) {
  test(`${id} fits the phone screen`, async ({ page }) => {
    await openToy(page, id);
    const layout = await page.evaluate(() => {
      const vw = innerWidth;
      const canvases = [...document.querySelectorAll('#gameMount canvas')].map(c => {
        const r = c.getBoundingClientRect();
        return { w: r.width, h: r.height, touchAction: getComputedStyle(c).touchAction };
      });
      return { vw, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, canvases };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.vw);
    // A runaway canvas (e.g. unstyled canvas + ResizeObserver) makes the page thousands of px tall.
    expect(layout.scrollHeight).toBeLessThan(2500);
    for (const c of layout.canvases) {
      expect(c.w).toBeGreaterThan(200);
      expect(c.w).toBeLessThanOrEqual(layout.vw);
      expect(c.h).toBeGreaterThan(200);
      expect(c.touchAction).toBe('none');
    }
  });
}

test('balance beam stays centred on the post', async ({ page }) => {
  await openToy(page, 'balance');
  const { beam, scale } = await page.evaluate(() => {
    const b = document.querySelector('#balanceBeam').getBoundingClientRect();
    const s = document.querySelector('.balance-scale').getBoundingClientRect();
    return { beam: b.left + b.width / 2, scale: s.left + s.width / 2 };
  });
  expect(Math.abs(beam - scale)).toBeLessThan(4);
});

test('balance puzzle survives a quick reset after solving', async ({ page }) => {
  await openToy(page, 'balance');
  let remaining = Number(await page.textContent('#balanceTarget'));
  for (const v of [5, 3, 2, 1]) while (remaining >= v) { await page.click(`[data-weight="${v}"]`); remaining -= v; }
  await page.click('#resetButton');
  await page.waitForTimeout(1500);
  const shown = Number(await page.textContent('#balanceTarget'));
  const pan = await page.$$eval('#balanceLeft .balance-block', a => a.reduce((s, e) => s + Number(e.textContent), 0));
  expect(shown).toBe(pan);
});

test('parent gate cancel closes the dialog', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.click('#parentHotspot', { force: true });
  await expect(page.locator('#parentGate')).toHaveJSProperty('open', true);
  await page.click('#gateCancel');
  await expect(page.locator('#parentGate')).toHaveJSProperty('open', false);
});

test('parent settings persist across reloads', async ({ page }) => {
  for (let i = 0; i < 5; i++) await page.click('#parentHotspot', { force: true });
  await page.fill('#gateAnswer', '11');
  await page.click('#gateSubmit');
  await page.uncheck('[data-setting-toy="bowling"]');
  await page.selectOption('#choiceCountSelect', '8');
  await page.click('#settingsForm button[value="save"]');
  await page.reload();
  const toys = await page.$$eval('[data-toy]', a => a.map(x => x.dataset.toy));
  expect(toys).not.toContain('bowling');
  expect(toys).toHaveLength(8);
});

test('opening a toy starts at the top of the page', async ({ page }) => {
  await page.evaluate(() => scrollTo(0, 900));
  await openToy(page, 'machine');
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
