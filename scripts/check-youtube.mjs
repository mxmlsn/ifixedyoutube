// Optional live smoke check: uses public YouTube in a fresh, signed-out browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('../', import.meta.url);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('https://www.youtube.com/watch?v=0QxKD3d_MsU&hl=en', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('ytd-watch-metadata h1')?.textContent.trim() && document.querySelector('video')?.readyState >= 2);
  await page.addStyleTag({ content: await readFile(new URL('styles.css', root), 'utf8') });
  // DevTools evaluation avoids YouTube's TrustedScript restriction on script tags.
  await page.evaluate(await readFile(new URL('content.js', root), 'utf8'));
  const video = page.locator('video').first();
  if (await video.evaluate(v => v.paused)) await page.locator('.ytp-play-button').click();
  await page.waitForFunction(() => !document.querySelector('video').paused);
  await video.evaluate(v => v.pause());
  const focusPage = () => page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
  const start = await video.evaluate(v => v.currentTime);
  await focusPage();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(start => Math.abs(document.querySelector('video').currentTime - start - 5) < 0.5, start);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.ytp-chrome-bottom')).opacity) > 0);
  const muted = await video.evaluate(v => v.muted);
  await focusPage();
  await page.keyboard.press('m');
  assert.equal(await video.evaluate(v => v.muted), !muted);
  await focusPage();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.querySelector('video').paused);
  await page.waitForTimeout(350);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('video').paused);
  console.log('PASS live: native seeking, mute, playback and visible controls');

  await page.locator('.html5-video-player').hover();
  await page.locator('.ytp-fullscreen-button').click();
  await page.waitForFunction(() => document.querySelector('ytd-watch-flexy').hasAttribute('fullscreen') && document.querySelector('.html5-video-player').clientHeight === innerHeight);
  const fullscreenState = () => page.evaluate(() => {
    const r = document.querySelector('.html5-video-player').getBoundingClientRect();
    return [r.x, r.y, r.width, r.height, scrollY, document.querySelector('ytd-app').scrollTop];
  });
  const beforeWheel = await fullscreenState();
  assert.deepEqual(beforeWheel.slice(0, 4), [0, 0, 1440, 1000]);
  await page.evaluate(() => {
    window.fullscreenWheelEvents = 0;
    document.addEventListener('wheel', () => window.fullscreenWheelEvents++);
  });
  for (const [x, y] of [[720, 300], [720, 950], [30, 500]]) {
    await page.mouse.move(x, y);
    for (const [dx, dy] of [[0, 900], [0, -900], [900, 0]]) {
      await page.mouse.wheel(dx, dy);
      await page.waitForTimeout(100);
      assert.deepEqual(await fullscreenState(), beforeWheel);
    }
  }
  assert.equal(await page.evaluate(() => window.fullscreenWheelEvents), 0);
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => !document.querySelector('ytd-watch-flexy').hasAttribute('fullscreen'));
  console.log('PASS live: native fullscreen fills viewport and does not scroll');

  await page.locator('.html5-video-player').hover();
  await page.locator('.ytp-chapter-title').filter({ visible: true }).first().click();
  await page.waitForFunction(() => document.querySelector('ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]'));
  await page.waitForFunction(() => {
    const player = document.querySelector('.html5-video-player').getBoundingClientRect();
    return ['video', '.ytp-chrome-bottom'].every(selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return r.width > 0 && r.left >= player.left - 1 && r.right <= player.right + 1;
    });
  });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1440);
  assert.equal(await page.locator('ytd-watch-flexy #player').evaluate(el => getComputedStyle(el).overflow), 'visible');
  await page.mouse.move(700, 800);
  await page.mouse.wheel(1800, 0);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => scrollX), 0);
  assert.ok(await page.evaluate(() => window.fullscreenWheelEvents) > 0);
  console.log('PASS live: chapter panel, native sizing, unclipped ambient container, horizontal scrolling blocked and normal wheel restored');
} finally {
  await browser.close();
}
