import {
  startSession,
  sendPostBatch,
  resetSession,
  type ScrapedPost,
} from "./api-client.js";
import { logger } from "./logger.js";

const BATCH_SIZE = 20;
const SCROLL_DELAY = 2000;
const TAB_DELAY = 3000;
const POSTS_PER_SUB = 50;

interface ScrapeJob {
  subreddit: string;
  postsTarget: number;
}

let isRunning = false;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrollToLoadPosts(tabId: number, targetCount: number): Promise<void> {
  let attempts = 0;
  const maxAttempts = Math.ceil(targetCount / 10) + 3;

  while (attempts < maxAttempts) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await sleep(SCROLL_DELAY);
    attempts++;
  }
}

async function scrapeTab(tabId: number): Promise<ScrapedPost[]> {
  // The tab is activated before this is called, so the declarative content script
  // should be injected. Retry a few times to handle any remaining race condition.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await new Promise<ScrapedPost[] | null>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: "SCRAPE_POSTS" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response?.posts ?? []);
      });
    });

    if (result !== null) return result;

    logger.warn(`[bg] content script not ready in tab ${tabId}, retrying (${attempt}/3)`);
    await sleep(1000);
  }

  logger.error(`[bg] content script never responded in tab ${tabId}`);
  return [];
}

async function sendInBatches(
  subreddit: string,
  posts: ScrapedPost[]
): Promise<void> {
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const isLast = i + BATCH_SIZE >= posts.length;
    await sendPostBatch(subreddit, batch, isLast);
  }

  // If no posts, still signal done
  if (posts.length === 0) {
    await sendPostBatch(subreddit, [], true);
  }
}

async function processSub(job: ScrapeJob): Promise<void> {
  const { subreddit } = job;
  const url = `https://www.reddit.com/r/${subreddit}/?sort=hot`;

  logger.log(`[bg] opening tab for r/${subreddit}`);
  const tab = await chrome.tabs.create({ url, active: false });
  const tabId = tab.id!;

  await new Promise<void>((resolve) => {
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  logger.log(`[bg] r/${subreddit} page loaded, waiting for JS render`);

  await sleep(2000);

  await chrome.tabs.update(tabId, { active: true });
  logger.log(`[bg] r/${subreddit} tab activated`);

  logger.log(`[bg] r/${subreddit} scrolling to load ~${job.postsTarget} posts`);
  await scrollToLoadPosts(tabId, job.postsTarget);

  logger.log(`[bg] r/${subreddit} scraping DOM`);
  const posts = await scrapeTab(tabId);
  logger.info(`[bg] r/${subreddit} scraped ${posts.length} posts`);

  await chrome.tabs.remove(tabId);
  logger.log(`[bg] r/${subreddit} tab closed`);

  const toSend = posts.slice(0, job.postsTarget);
  logger.log(`[bg] r/${subreddit} sending ${toSend.length} posts to API in batches of ${BATCH_SIZE}`);
  await sendInBatches(subreddit, toSend);
  logger.info(`[bg] r/${subreddit} done`);

  await sleep(TAB_DELAY);
}

async function runScrape(subreddits: string[], postsPerSub: number): Promise<void> {
  isRunning = true;

  try {
    logger.info("[bg] scrape started", `subreddits: ${subreddits.join(", ")}`, `postsPerSub: ${postsPerSub}`);
    await resetSession();
    logger.log("[bg] session reset");
    await startSession(subreddits);
    logger.log("[bg] session started on server");

    for (const subreddit of subreddits) {
      if (!isRunning) {
        logger.warn("[bg] scrape stopped early by user");
        break;
      }
      try {
        await processSub({ subreddit, postsTarget: postsPerSub });
      } catch (err) {
        logger.error(`[bg] error scraping r/${subreddit}`, String(err));
        await sendPostBatch(subreddit, [], true).catch(() => {});
      }
    }
  } finally {
    isRunning = false;
    logger.info("[bg] scrape complete");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_SCRAPE") {
    if (isRunning) {
      logger.warn("[bg] START_SCRAPE received but already running");
      sendResponse({ ok: false, error: "Already running" });
      return;
    }
    logger.log("[bg] START_SCRAPE received");
    runScrape(message.subreddits, message.postsPerSub ?? POSTS_PER_SUB).catch(
      (err) => logger.error("[bg] runScrape unhandled error", String(err))
    );
    sendResponse({ ok: true });
  }

  if (message.type === "STOP_SCRAPE") {
    isRunning = false;
    sendResponse({ ok: true });
  }

  if (message.type === "IS_RUNNING") {
    sendResponse({ isRunning });
  }
});
