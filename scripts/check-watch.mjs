import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('../', import.meta.url);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/test-media.wav') {
      // Two minutes of PCM silence: a real media timeline, no mocked currentTime.
      const samples = 120 * 8000;
      const wav = Buffer.alloc(44 + samples, 128);
      wav.write('RIFF', 0); wav.writeUInt32LE(36 + samples, 4);
      wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28);
      wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34);
      wav.write('data', 36); wav.writeUInt32LE(samples, 40);
      response.setHeader('Content-Type', 'audio/wav');
      response.setHeader('Accept-Ranges', 'bytes');
      const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]);
        const end = range[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
        response.statusCode = 206;
        response.setHeader('Content-Range', `bytes ${start}-${end}/${wav.length}`);
        response.setHeader('Content-Length', end - start + 1);
        response.end(wav.subarray(start, end + 1));
      } else {
        response.setHeader('Content-Length', wav.length);
        response.end(wav);
      }
      return;
    }
    if (!['/test-site/watch.html', '/styles.css', '/content.js'].includes(path)) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript' : 'text/html');
    response.end(await readFile(new URL(path.slice(1), root)));
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/test-site/watch.html?yt_focus_preview=watch&v=first`;
  const visible = async selector => assert.equal(await page.locator(selector).isVisible(), true, selector);
  const hidden = async selector => assert.equal(await page.locator(selector).isVisible(), false, selector);
  const fits = async () => {
    const dimensions = await page.evaluate(() => {
      const root = document.documentElement;
      const selectors = ['#primary', '#player', '#secondary'];
      return {
        viewport: root.clientWidth,
        document: root.scrollWidth,
        boxes: selectors.filter(s => getComputedStyle(document.querySelector(s)).display !== 'none').map(s => {
          const rect = document.querySelector(s).getBoundingClientRect();
          return [s, rect.left, rect.right];
        })
      };
    });
    assert.ok(dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
    for (const [selector, left, right] of dimensions.boxes) {
      assert.ok(left >= 0 && right <= dimensions.viewport + 1, `${selector}: ${JSON.stringify(dimensions)}`);
    }
  };
  for (const width of [1920, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await visible('.yt-focus-watch__comments-toggle');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    await hidden('#secondary');
    await fits();
    await page.getByRole('button', { name: 'Show chapters', exact: true }).click();
    await visible('[data-panel="chapters"]');
    await hidden('#related');
    await fits();
    await page.getByRole('button', { name: 'Chapter 2 — 1:00' }).click();
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), 60);
    await page.getByRole('button', { name: 'Close chapters' }).click();
    await hidden('#secondary');
    await fits();
    for (const selector of ['#ai-companion-button', '[data-open-panel="gemini"]:not(#ai-companion-button)']) {
      await page.locator(selector).click();
      await visible('[data-panel="gemini"]');
      await hidden('[data-panel="chapters"]');
      await hidden('#related');
      await fits();
      await page.locator('#gemini-question').fill('Summarize this video');
      await page.locator('#gemini-send').click();
      assert.match(await page.locator('#gemini-answer').textContent(), /Summarize this video/);
      await page.getByRole('button', { name: 'Close Gemini' }).click();
      await hidden('#secondary');
    }
    await page.getByRole('button', { name: 'Show comments', exact: true }).click();
    await visible('#comments');
    await page.getByRole('button', { name: 'Hide comments', exact: true }).click();
    await hidden('#comments');
    for (const selector of ['.ytp-ce-element', '.ytp-endscreen-content', '.ytp-autonav-endscreen', '.ytp-fullscreen-grid']) await hidden(selector);
    await visible('.ytp-play-button');
    await page.locator('#player').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), 65);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), 60);
    // A native handler must not receive a handled arrow (which would double seek).
    await page.evaluate(() => {
      const player = document.querySelector('#player');
      player.dataset.nativeKeys = '0';
      player.addEventListener('keydown', event => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        player.dataset.nativeKeys = String(Number(player.dataset.nativeKeys) + 1);
        const video = player.querySelector('video');
        video.currentTime += event.key === 'ArrowRight' ? 5 : -5;
      });
    });
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), 65);
    assert.equal(await page.locator('#player').getAttribute('data-native-keys'), '0');
    await page.keyboard.press('Shift+ArrowRight');
    assert.equal(await page.locator('#player').getAttribute('data-native-keys'), '1');
    // Fullscreen keeps native key handling.
    await page.locator('#player').evaluate(player => player.classList.add('ytp-fullscreen'));
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#player').getAttribute('data-native-keys'), '2');
    await page.locator('#player').evaluate(player => player.classList.remove('ytp-fullscreen'));
    // Typing outside the player must not seek the video.
    const beforeTyping = await page.locator('video').evaluate(video => video.currentTime);
    await page.locator('yt-searchbox input').fill('search text');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('video').evaluate(video => video.currentTime), beforeTyping);
    // Native volume controls still receive up/down arrows.
    await page.evaluate(() => {
      const player = document.querySelector('#player');
      player.querySelector('video').volume = 0.5;
      player.addEventListener('keydown', event => {
        const video = player.querySelector('video');
        if (event.key === 'ArrowUp') video.volume += 0.05;
        if (event.key === 'ArrowDown') video.volume -= 0.05;
      });
    });
    await page.locator('#player').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('video').evaluate(video => video.volume), 0.55);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('video').evaluate(video => video.volume), 0.5);
    for (const [time, key, expected] of [[2, 'ArrowLeft', 0], [118, 'ArrowRight', 120]]) {
      await page.locator('video').evaluate((video, time) => { video.currentTime = time; }, time);
      await page.waitForFunction(() => !document.querySelector('video').seeking);
      await page.keyboard.press(key);
      assert.equal(await page.locator('video').evaluate(video => video.currentTime), expected);
    }
    // Even a late native offscreen overlay cannot create horizontal page scrolling.
    await page.evaluate(() => {
      const overflow = document.createElement('div');
      overflow.style.cssText = 'position:absolute;left:120vw;width:500px;height:1px';
      document.body.append(overflow);
      window.scrollTo(500, window.scrollY);
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.scrollX), 0);
    console.log(`PASS ${width}px: chapters, Gemini, comments, recommendations, arrows and overflow`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
