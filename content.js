(() => {
  "use strict";

  const MINIMAL_CLASS = "yt-focus-minimal";
  const HOME_CLASS = "yt-focus-home";
  const SEARCH_CLASS = "yt-focus-search";
  const SUBSCRIPTIONS_CLASS = "yt-focus-subscriptions";
  const WATCH_LATER_CLASS = "yt-focus-watch-later";
  const WATCH_CLASS = "yt-focus-watch";
  const COMMENTS_OPEN_CLASS = "yt-focus-comments-open";
  const RECOMMENDATIONS_CLASS = "yt-focus-recommendations-open";
  const HOME_ID = "yt-focus-home";
  const HIDDEN_ATTRIBUTE = "data-yt-focus-hidden";
  const HOME_NON_VIDEO_VALUE = "home-non-video";
  const RECOMMENDATION_USAGE_KEY = "yt-focus-recommendations-v1";
  const DAILY_RECOMMENDATION_LIMIT = 2;
  const REMOVE_BUTTON_CLASS = "yt-focus-watch-later__remove";
  const SUBSCRIPTION_WATCH_BUTTON_CLASS =
    "yt-focus-subscriptions__watch-later";
  const COMMENTS_BUTTON_CLASS = "yt-focus-watch__comments-toggle";
  const FULLY_WATCHED_ATTRIBUTE = "data-yt-focus-fully-watched";

  const PLAIN_HOME_VIDEO_RENDERERS = new Set([
    "YT-LOCKUP-VIEW-MODEL",
    "YTD-RICH-GRID-MEDIA",
    "YTD-VIDEO-RENDERER",
    "YTD-GRID-VIDEO-RENDERER"
  ]);

  const MINIMAL_MODES = new Set([
    "home",
    "search",
    "subscriptions",
    "watch-later",
    "watch"
  ]);

  const MODE_CLASSES = new Map([
    ["home", HOME_CLASS],
    ["search", SEARCH_CLASS],
    ["subscriptions", SUBSCRIPTIONS_CLASS],
    ["watch-later", WATCH_LATER_CLASS],
    ["watch", WATCH_CLASS]
  ]);

  const MOST_RELEVANT_TITLES = new Set([
    "most relevant",
    "самое актуальное",
    "самые актуальные",
    "наиболее актуальное",
    "les plus pertinents",
    "les plus pertinentes"
  ]);

  let scheduled = false;
  let lastMode = "";
  let activeWatchVideoId = "";

  function getLocalDayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readRecommendationUsage() {
    const today = getLocalDayKey();

    try {
      const stored = JSON.parse(localStorage.getItem(RECOMMENDATION_USAGE_KEY));
      if (stored?.day === today && Number.isFinite(stored.count)) {
        return {
          day: today,
          count: Math.min(
            DAILY_RECOMMENDATION_LIMIT,
            Math.max(0, stored.count)
          )
        };
      }
    } catch {
      // A malformed or unavailable value simply starts a fresh daily allowance.
    }

    return { day: today, count: 0 };
  }

  function writeRecommendationUsage(usage) {
    try {
      localStorage.setItem(RECOMMENDATION_USAGE_KEY, JSON.stringify(usage));
    } catch {
      // YouTube normally allows localStorage; the home still works if it does not.
    }
  }

  function updateRecommendationButton(button) {
    const isOpen = document.documentElement.classList.contains(
      RECOMMENDATIONS_CLASS
    );
    const usage = readRecommendationUsage();
    const remaining = Math.max(0, DAILY_RECOMMENDATION_LIMIT - usage.count);

    button.setAttribute("aria-expanded", String(isOpen));
    button.disabled = !isOpen && remaining === 0;

    if (isOpen) {
      button.textContent = "Hide recommendations";
    } else if (remaining === 0) {
      button.textContent = "Recommendations available tomorrow";
    } else {
      button.textContent = `Show recommendations · ${remaining} left today`;
    }
  }

  function getMode() {
    // Allows the bundled local fixture to exercise the exact production code.
    // The manifest never injects this script on localhost for real users.
    const previewMode = new URLSearchParams(location.search).get(
      "yt_focus_preview"
    );
    const isLocalPreview =
      location.hostname === "127.0.0.1" || location.hostname === "localhost";

    if (isLocalPreview && MINIMAL_MODES.has(previewMode)) {
      return previewMode;
    }

    if (location.pathname === "/") {
      return "home";
    }

    if (location.pathname === "/results") {
      return "search";
    }

    if (location.pathname === "/feed/subscriptions") {
      return "subscriptions";
    }

    if (
      location.pathname === "/playlist" &&
      new URLSearchParams(location.search).get("list") === "WL"
    ) {
      return "watch-later";
    }

    if (location.pathname === "/watch") {
      return "watch";
    }

    return "youtube";
  }

  function buildHome() {
    if (!document.body || document.getElementById(HOME_ID)) {
      return;
    }

    const home = document.createElement("main");
    home.id = HOME_ID;
    home.setAttribute("aria-label", "YouTube shortcuts");

    const content = document.createElement("div");
    content.className = "yt-focus-home__content";

    const links = document.createElement("nav");
    links.className = "yt-focus-home__links";
    links.setAttribute("aria-label", "YouTube library shortcuts");

    const destinations = [
      ["Subscriptions", "/feed/subscriptions"],
      ["Watch Later", "/playlist?list=WL"]
    ];

    for (const [label, href] of destinations) {
      const link = document.createElement("a");
      link.className = "yt-focus-home__link";
      link.href = href;
      link.textContent = label;
      links.append(link);
    }

    const recommendationsButton = document.createElement("button");
    recommendationsButton.type = "button";
    recommendationsButton.className = "yt-focus-home__recommendations-button";
    recommendationsButton.setAttribute("aria-controls", "page-manager");
    recommendationsButton.addEventListener("click", () => {
      const root = document.documentElement;
      const isOpen = root.classList.contains(RECOMMENDATIONS_CLASS);

      if (isOpen) {
        root.classList.remove(RECOMMENDATIONS_CLASS);
        updateRecommendationButton(recommendationsButton);
        return;
      }

      const usage = readRecommendationUsage();
      if (usage.count >= DAILY_RECOMMENDATION_LIMIT) {
        updateRecommendationButton(recommendationsButton);
        return;
      }

      usage.count += 1;
      writeRecommendationUsage(usage);
      root.classList.add(RECOMMENDATIONS_CLASS);
      updateRecommendationButton(recommendationsButton);
    });

    updateRecommendationButton(recommendationsButton);
    content.append(links, recommendationsButton);
    home.append(content);
    document.body.append(home);
  }

  function removeHome() {
    document.documentElement.classList.remove(RECOMMENDATIONS_CLASS);
    document.getElementById(HOME_ID)?.remove();
  }

  function isPlainVideoRecommendation(item) {
    if (item.tagName === "YTD-RICH-SECTION-RENDERER") {
      return false;
    }

    if (item.tagName === "YTD-RICH-ITEM-RENDERER") {
      const renderer = item.querySelector(":scope > #content")?.firstElementChild;

      if (!renderer || !PLAIN_HOME_VIDEO_RENDERERS.has(renderer.tagName)) {
        return false;
      }
    }

    if (
      item.querySelector(
        "ytd-ad-slot-renderer, " +
          "ytd-in-feed-ad-layout-renderer, " +
          "ytd-promoted-video-renderer, " +
          "ytd-display-ad-renderer, " +
          "ytd-feed-nudge-renderer, " +
          "ytd-rich-shelf-renderer, " +
          "ytd-reel-shelf-renderer, " +
          "yt-playables-section-view-model, " +
          "yt-game-card-view-model, " +
          "ytd-membership-offer-renderer, " +
          "yt-membership-offer-view-model, " +
          "ytd-sponsorships-offer-renderer, " +
          "ytd-membership-posts-shelf-renderer, " +
          "ytd-backstage-post-thread-renderer, " +
          "ytd-post-renderer, " +
          "ytd-channel-renderer, " +
          "ytd-playlist-renderer, " +
          "ytd-radio-renderer, " +
          "ytd-movie-renderer, " +
          '[href*="googleadservices.com"], ' +
          '[href*="doubleclick.net"]'
      )
    ) {
      return false;
    }

    const watchLink = item.querySelector('a[href^="/watch?"]');
    if (!watchLink) {
      return false;
    }

    try {
      const target = new URL(watchLink.getAttribute("href"), location.origin);
      const list = target.searchParams.get("list") || "";
      return (
        target.pathname === "/watch" &&
        target.searchParams.has("v") &&
        !target.searchParams.has("start_radio") &&
        !list.startsWith("RD")
      );
    } catch {
      return false;
    }
  }

  function cleanHomeRecommendations() {
    if (getMode() !== "home") {
      return;
    }

    const contents = document.querySelectorAll(
      "ytd-rich-grid-renderer > #contents"
    );

    for (const list of contents) {
      for (const item of list.children) {
        if (
          item.tagName === "YTD-CONTINUATION-ITEM-RENDERER" ||
          isPlainVideoRecommendation(item)
        ) {
          if (item.getAttribute(HIDDEN_ATTRIBUTE) === HOME_NON_VIDEO_VALUE) {
            item.removeAttribute(HIDDEN_ATTRIBUTE);
          }
        } else {
          item.setAttribute(HIDDEN_ATTRIBUTE, HOME_NON_VIDEO_VALUE);
        }
      }
    }
  }

  function isRemoveFromWatchLaterLabel(text) {
    const label = text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const exactLabels = [
      "remove from watch later",
      "удалить из списка «смотреть позже»",
      "удалить из смотреть позже",
      "supprimer de la playlist à regarder plus tard",
      "supprimer de à regarder plus tard",
      "aus ‚später ansehen‘ entfernen",
      "aus später ansehen entfernen",
      "quitar de ver más tarde",
      "remover de assistir mais tarde",
      "rimuovi da guarda più tardi"
    ];

    if (exactLabels.includes(label)) {
      return true;
    }

    const hasDestination =
      /watch later|смотреть позже|regarder plus tard|später ansehen|ver más tarde|assistir mais tarde|guarda più tardi/.test(
        label
      );
    const hasRemoveVerb =
      /remove|удалить|supprimer|entfernen|quitar|remover|rimuovi/.test(label);
    return hasDestination && hasRemoveVerb;
  }

  function isSaveToWatchLaterLabel(text) {
    const label = text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const hasDestination =
      /watch later|смотреть позже|regarder plus tard|später ansehen|ver más tarde|assistir mais tarde|guarda più tardi/.test(
        label
      );
    const hasSaveVerb =
      /save|добавить|сохранить|enregistrer|ajouter|speichern|guardar|salvar|salva/.test(
        label
      );
    return hasDestination && hasSaveVerb;
  }

  function getVisibleMenuItems() {
    const items = document.querySelectorAll(
      'ytd-menu-popup-renderer ytd-menu-service-item-renderer[role="menuitem"], ' +
        'ytd-menu-popup-renderer tp-yt-paper-item[role="menuitem"], ' +
        'yt-list-view-model button[role="menuitem"]'
    );

    return [...items].filter((item) => {
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function findVisibleMenuItem(predicate) {
    for (const item of getVisibleMenuItems()) {
      if (predicate(item.textContent || "")) {
        return item;
      }
    }

    return null;
  }

  function waitForMenuItem(predicate, timeout = 1800) {
    return new Promise((resolve) => {
      const started = performance.now();

      function check() {
        const item = findVisibleMenuItem(predicate);
        if (item) {
          resolve(item);
        } else if (performance.now() - started >= timeout) {
          resolve(null);
        } else {
          requestAnimationFrame(check);
        }
      }

      check();
    });
  }

  function findSubscriptionCardForPreview(preview) {
    const previewRect = preview.getBoundingClientRect();
    let bestCard = null;
    let bestOverlap = 0;

    for (const card of document.querySelectorAll("ytd-rich-item-renderer")) {
      const thumbnail = card.querySelector(
        'a.ytLockupViewModelContentImage[href^="/watch?"], ' +
          'a#thumbnail[href^="/watch?"]'
      );

      if (!thumbnail) {
        continue;
      }

      const rect = thumbnail.getBoundingClientRect();
      const overlapWidth = Math.max(
        0,
        Math.min(previewRect.right, rect.right) -
          Math.max(previewRect.left, rect.left)
      );
      const overlapHeight = Math.max(
        0,
        Math.min(previewRect.bottom, rect.bottom) -
          Math.max(previewRect.top, rect.top)
      );
      const overlap = overlapWidth * overlapHeight;

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestCard = card;
      }
    }

    return bestCard;
  }

  function syncSubscriptionWatchButton(preview, button) {
    const card = findSubscriptionCardForPreview(preview);
    const href = card
      ?.querySelector('a[href^="/watch?"]')
      ?.getAttribute("href");
    let videoId = "";

    try {
      videoId = new URL(href, location.origin).searchParams.get("v") || "";
    } catch {
      videoId = "";
    }

    if (button.dataset.videoId !== videoId) {
      button.dataset.videoId = videoId;
      button.dataset.state = "";
      button.disabled = !videoId;
      button.title = "Add to Watch Later";
      button.setAttribute("aria-label", "Add to Watch Later");
    }

    return card;
  }

  async function addSubscriptionVideoToWatchLater(preview, button) {
    const card = syncSubscriptionWatchButton(preview, button);
    const nativeMenuButton = card?.querySelector(
      'button[aria-label="More actions"], button[aria-label="Action menu"]'
    );

    if (!card || !nativeMenuButton || button.disabled) {
      return;
    }

    button.disabled = true;
    button.dataset.state = "working";
    nativeMenuButton.click();

    const action = await waitForMenuItem(
      (text) =>
        isSaveToWatchLaterLabel(text) || isRemoveFromWatchLaterLabel(text),
      1800
    );

    if (action && isSaveToWatchLaterLabel(action.textContent || "")) {
      action.click();
      button.dataset.state = "added";
      button.title = "Added to Watch Later";
      button.setAttribute("aria-label", "Added to Watch Later");
      return;
    }

    if (action && isRemoveFromWatchLaterLabel(action.textContent || "")) {
      nativeMenuButton.click();
      button.dataset.state = "added";
      button.title = "Already in Watch Later";
      button.setAttribute("aria-label", "Already in Watch Later");
      return;
    }

    button.disabled = false;
    button.dataset.state = "error";
    button.title = "Could not add to Watch Later";
    window.setTimeout(() => {
      if (button.isConnected && button.dataset.state === "error") {
        button.dataset.state = "";
        button.title = "Add to Watch Later";
      }
    }, 1800);
  }

  function enhanceSubscriptionPreviews() {
    for (const preview of document.querySelectorAll("ytd-video-preview")) {
      let button = preview.querySelector(`.${SUBSCRIPTION_WATCH_BUTTON_CLASS}`);

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = SUBSCRIPTION_WATCH_BUTTON_CLASS;
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<circle cx="10" cy="11" r="7"></circle>' +
          '<path d="M10 7v4l3 2M18 16v6M15 19h6"></path></svg>';
        button.addEventListener("mouseenter", () => {
          syncSubscriptionWatchButton(preview, button);
        });
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          addSubscriptionVideoToWatchLater(preview, button);
        });
        preview.append(button);
      }

      syncSubscriptionWatchButton(preview, button);
    }
  }

  function markFullyWatchedSubscriptionVideos() {
    const cards = document.querySelectorAll(
      "ytd-rich-item-renderer, ytd-grid-video-renderer"
    );

    for (const card of cards) {
      const progress = card.querySelector(
        ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment, " +
          "ytd-thumbnail-overlay-resume-playback-renderer #progress, " +
          "#progress.ytd-thumbnail-overlay-resume-playback-renderer"
      );
      const width = Number.parseFloat(progress?.style?.width || "0");
      card.toggleAttribute(FULLY_WATCHED_ATTRIBUTE, width >= 99);
    }
  }

  function enhanceWatchLater() {
    if (getMode() !== "watch-later") {
      return;
    }

    for (const row of document.querySelectorAll("ytd-playlist-video-renderer")) {
      if (row.querySelector(`.${REMOVE_BUTTON_CLASS}`)) {
        continue;
      }

      const menu = row.querySelector("#menu");
      const nativeMenuButton = row.querySelector(
        'ytd-menu-renderer button[aria-label="Action menu"], ' +
          'ytd-menu-renderer button[aria-label="More actions"]'
      );

      if (!menu || !nativeMenuButton) {
        continue;
      }

      const title = row.querySelector("#video-title")?.textContent?.trim();
      const button = document.createElement("button");
      button.type = "button";
      button.className = REMOVE_BUTTON_CLASS;
      button.setAttribute(
        "aria-label",
        title ? `Remove ${title} from Watch Later` : "Remove from Watch Later"
      );
      button.title = "Remove from Watch Later";
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
        "<span>Remove</span>";

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (button.disabled) {
          return;
        }

        button.disabled = true;
        button.dataset.state = "working";
        nativeMenuButton.click();

        const removeItem = await waitForMenuItem(
          isRemoveFromWatchLaterLabel
        );
        if (removeItem) {
          removeItem.click();
          window.setTimeout(() => {
            if (button.isConnected) {
              button.disabled = false;
              button.dataset.state = "";
            }
          }, 2500);
          return;
        }

        button.disabled = false;
        button.dataset.state = "error";
        button.title = "Could not open Remove from Watch Later";
        window.setTimeout(() => {
          button.dataset.state = "";
          button.title = "Remove from Watch Later";
        }, 1800);
      });

      menu.prepend(button);
    }
  }

  function getWatchVideoId() {
    return new URLSearchParams(location.search).get("v") || "";
  }

  function updateCommentsButton(button) {
    const isOpen = document.documentElement.classList.contains(
      COMMENTS_OPEN_CLASS
    );
    button.textContent = isOpen ? "Hide comments" : "Show comments";
    button.setAttribute("aria-expanded", String(isOpen));
  }

  function resetWatchEnhancements() {
    document.documentElement.classList.remove(COMMENTS_OPEN_CLASS);
    document.querySelectorAll(`.${COMMENTS_BUTTON_CLASS}`).forEach((button) => {
      button.remove();
    });
    activeWatchVideoId = "";
  }

  function enhanceWatch() {
    if (getMode() !== "watch") {
      return;
    }

    const videoId = getWatchVideoId();
    if (videoId !== activeWatchVideoId) {
      document.documentElement.classList.remove(COMMENTS_OPEN_CLASS);
      document
        .querySelectorAll(`.${COMMENTS_BUTTON_CLASS}`)
        .forEach((button) => button.remove());
      activeWatchVideoId = videoId;
    }

    if (document.querySelector(`.${COMMENTS_BUTTON_CLASS}`)) {
      return;
    }

    const description = document.querySelector(
      "ytd-watch-metadata #description, " +
        "ytd-watch-metadata #description-inline-expander"
    );
    if (!description) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = COMMENTS_BUTTON_CLASS;
    button.setAttribute("aria-controls", "comments");
    updateCommentsButton(button);
    button.addEventListener("click", () => {
      document.documentElement.classList.toggle(COMMENTS_OPEN_CLASS);
      updateCommentsButton(button);

      if (document.documentElement.classList.contains(COMMENTS_OPEN_CLASS)) {
        requestAnimationFrame(() => {
          document
            .querySelector("ytd-watch-flexy #comments")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    });

    description.insertAdjacentElement("afterend", button);
  }

  function cleanSubscriptions() {
    if (getMode() !== "subscriptions") {
      return;
    }

    const shelves = document.querySelectorAll(
      'ytd-browse[page-subtype="subscriptions"] ytd-rich-shelf-renderer, ' +
        'ytd-browse[page-subtype="subscriptions"] ytd-shelf-renderer'
    );

    for (const shelf of shelves) {
      const heading =
        shelf.querySelector("#title-text #title") ||
        shelf.querySelector("#title") ||
        shelf.querySelector('[role="heading"][aria-level="2"]') ||
        shelf.querySelector("h2") ||
        shelf.querySelector("#title-container #title");
      const title = (heading?.textContent || shelf.textContent || "")
        .trim()
        .split("\n", 1)[0]
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();

      if (MOST_RELEVANT_TITLES.has(title)) {
        const section = shelf.closest("ytd-rich-section-renderer") || shelf;
        section.setAttribute(HIDDEN_ATTRIBUTE, "subscriptions-most-relevant");
      }
    }

    markFullyWatchedSubscriptionVideos();
    enhanceSubscriptionPreviews();
  }

  function applyMode() {
    scheduled = false;

    const mode = getMode();
    const root = document.documentElement;

    root.classList.toggle(MINIMAL_CLASS, MINIMAL_MODES.has(mode));

    for (const [classMode, className] of MODE_CLASSES) {
      root.classList.toggle(className, mode === classMode);
    }

    root.dataset.ytFocusMode = mode;

    if (mode === "home") {
      buildHome();
    } else {
      removeHome();
    }

    if (mode === "subscriptions") {
      cleanSubscriptions();
    }

    if (mode === "watch-later") {
      enhanceWatchLater();
    }

    if (mode === "home") {
      cleanHomeRecommendations();
    }

    if (mode === "watch") {
      enhanceWatch();
    } else if (lastMode === "watch" || activeWatchVideoId) {
      resetWatchEnhancements();
    }

    lastMode = mode;
  }

  function scheduleApply() {
    if (scheduled) {
      return;
    }

    scheduled = true;
    requestAnimationFrame(applyMode);
  }

  // YouTube is a single-page app, so URL changes do not always reload scripts.
  document.addEventListener("yt-navigate-start", scheduleApply, true);
  document.addEventListener("yt-navigate-finish", scheduleApply, true);
  document.addEventListener("yt-page-data-updated", scheduleApply, true);
  window.addEventListener("popstate", scheduleApply);
  window.addEventListener("pageshow", scheduleApply);

  const observer = new MutationObserver(() => {
    const mode = getMode();

    if (mode === "search" && lastMode === "search") {
      return;
    }

    scheduleApply();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  applyMode();
})();
