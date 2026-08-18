import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);

test("manifest is a minimal Manifest V3 extension", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", projectRoot), "utf8")
  );

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://www.youtube.com/*"
  ]);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test("content script parses and contains both requested destinations", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");

  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /\["Subscriptions", "\/feed\/subscriptions"\]/);
  assert.match(source, /\["Watch Later", "\/playlist\?list=WL"\]/);
});

test("home recommendations are limited to two reveals per local day", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /DAILY_RECOMMENDATION_LIMIT = 2/);
  assert.match(source, /RECOMMENDATION_USAGE_KEY/);
  assert.match(source, /Show recommendations/);
  assert.match(source, /getLocalDayKey/);
  assert.match(styles, /yt-focus-recommendations-open ytd-page-manager/);
});

test("home removes the native chip strip and follows YouTube light/dark theme", async () => {
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(styles, /ytd-feed-filter-chip-bar-renderer/);
  assert.match(styles, /#frosted-glass/);
  assert.match(styles, /:root\.yt-focus-minimal\[dark\]/);
  assert.match(styles, /--yt-focus-background:\s*#fff/);
  assert.match(styles, /--yt-focus-background:\s*#000/);
});

test("home recommendations keep only ordinary video cards", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /cleanHomeRecommendations/);
  assert.match(source, /HOME_NON_VIDEO_VALUE/);
  assert.match(source, /ytd-rich-shelf-renderer/);
  assert.match(source, /yt-playables-section-view-model/);
  assert.match(source, /ytd-membership-offer-renderer/);
  assert.match(source, /start_radio/);
  assert.match(styles, /home-non-video/);
});

test("minimal mode covers subscriptions, Watch Later, search and watching", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");

  assert.match(source, /\/feed\/subscriptions/);
  assert.match(source, /location\.pathname === "\/playlist"/);
  assert.match(source, /location\.pathname === "\/watch"/);
  assert.match(source, /yt-focus-minimal/);
});

test("subscriptions cleanup removes the Most relevant shelf", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /MOST_RELEVANT_TITLES/);
  assert.match(source, /ytd-rich-shelf-renderer/);
  assert.match(source, /subscriptions-most-relevant/);
  assert.match(styles, /subscriptions-most-relevant/);
});

test("subscriptions use a four-column grid", async () => {
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(styles, /--ytd-rich-grid-items-per-row:\s*4/);
  assert.match(styles, /--ytd-rich-grid-posts-per-row:\s*4/);
});

test("subscriptions add a native one-click Watch Later preview action", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /enhanceSubscriptionPreviews/);
  assert.match(source, /isSaveToWatchLaterLabel/);
  assert.match(source, /yt-list-view-model button\[role="menuitem"\]/);
  assert.match(source, /nativeMenuButton\.click\(\)/);
  assert.match(styles, /yt-focus-subscriptions__watch-later/);
  assert.match(styles, /top:\s*112px/);
  assert.match(styles, /border-radius:\s*50%/);
});

test("fully watched subscription cards are eighty percent transparent", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /markFullyWatchedSubscriptionVideos/);
  assert.match(source, /ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment/);
  assert.match(source, /width >= 99/);
  assert.match(styles, /data-yt-focus-fully-watched/);
  assert.match(styles, /opacity:\s*0\.2/);
});

test("search cleanup preserves organic results and rejects inserted modules", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");

  assert.match(source, /YTD-VIDEO-RENDERER/);
  assert.match(source, /YTD-CHANNEL-RENDERER/);
  assert.match(source, /YTD-PLAYLIST-RENDERER/);
  assert.match(source, /ytd-search-pyv-renderer/);
  assert.match(source, /inserted-module/);
});

test("search mutations are filtered incrementally instead of rescanning the page", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");

  assert.match(source, /scheduleSearchCleanup\(mutations\)/);
  assert.match(source, /pendingSearchRoots\.add\(node\)/);
  assert.match(source, /pendingRoot\.contains\(node\)/);
  assert.match(source, /cleanSearch\(root\)/);
  assert.match(source, /mode === "search" && lastMode === "search"/);
});

test("watch mode hides comments and recommendations", async () => {
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(styles, /yt-focus-watch ytd-watch-flexy #secondary/);
  assert.match(styles, /yt-focus-watch ytd-watch-flexy #comments/);
  assert.doesNotMatch(styles, /yt-focus-watch ytd-watch-flexy #description/);
});

test("header keeps native controls and changes only their fill", async () => {
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(styles, /ytd-masthead #end \{/);
  assert.match(styles, /ytd-masthead #end \.ytSpecButtonShapeNextHost/);
  assert.match(styles, /background:\s*transparent/);
  assert.doesNotMatch(styles, /--yt-spec-base-background/);
  assert.doesNotMatch(styles, /yt-formatted-string,/);
});

test("Watch Later removes its hero and preserves a full-width list", async () => {
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(styles, /> ytd-playlist-header-renderer/);
  assert.match(styles, /ytd-playlist-video-list-renderer/);
  assert.match(styles, /max-width:\s*1200px/);
  assert.match(styles, /padding:\s*0 !important/);
});

test("the YouTube favicon and extension icons use the red cross", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", projectRoot), "utf8")
  );

  assert.match(source, /replaceFavicon/);
  assert.match(source, /stroke="#f00"/);
  assert.equal(manifest.icons[128], "icons/icon128.png");
});

test("Watch Later adds a one-click native remove action beside each menu", async () => {
  const source = await readFile(new URL("content.js", projectRoot), "utf8");
  const styles = await readFile(new URL("styles.css", projectRoot), "utf8");

  assert.match(source, /enhanceWatchLater/);
  assert.match(source, /Remove from Watch Later/i);
  assert.match(source, /nativeMenuButton\.click\(\)/);
  assert.match(source, /removeItem\.click\(\)/);
  assert.match(styles, /yt-focus-watch-later__remove/);
});
