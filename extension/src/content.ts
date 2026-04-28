export interface ScrapedPost {
  id: string;
  title: string;
  url: string;
  upvotes: number;
  commentCount: number;
  comments: string[];
}

function scrapeNewReddit(): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  // New Reddit uses shreddit-post web components
  const postElements = document.querySelectorAll("shreddit-post");

  postElements.forEach((el) => {
    const id = el.getAttribute("id") || el.getAttribute("name") || crypto.randomUUID();
    const title = el.getAttribute("post-title") ||
      el.querySelector("h3")?.textContent?.trim() || "";
    const permalink = el.getAttribute("permalink") || "";
    const url = permalink ? `https://www.reddit.com${permalink}` : "";
    const upvotesStr = el.getAttribute("score") || "0";
    const upvotes = parseInt(upvotesStr, 10) || 0;
    const commentStr = el.getAttribute("comment-count") || "0";
    const commentCount = parseInt(commentStr, 10) || 0;

    if (title) {
      posts.push({ id, title, url, upvotes, commentCount, comments: [] });
    }
  });

  // Fallback: look for article elements
  if (posts.length === 0) {
    document.querySelectorAll("article, [data-testid='post-container']").forEach((el) => {
      const titleEl = el.querySelector("h3, [data-click-id='text'] h3");
      const title = titleEl?.textContent?.trim() || "";
      const linkEl = el.querySelector("a[href*='/comments/']") as HTMLAnchorElement | null;
      const url = linkEl?.href || "";
      const id = url.match(/\/comments\/([a-z0-9]+)\//)?.[1] || crypto.randomUUID();

      const scoreEl = el.querySelector("[id^='vote-arrows'] + *") ||
        el.querySelector("[data-click-id='upvote']")?.closest("div")?.querySelector("span");
      const upvotes = parseInt(scoreEl?.textContent?.replace(/[^0-9]/g, "") || "0", 10) || 0;

      const commentEl = el.querySelector("a[href*='comments']");
      const commentCount = parseInt(
        commentEl?.textContent?.replace(/[^0-9]/g, "") || "0",
        10
      ) || 0;

      if (title) {
        posts.push({ id, title, url, upvotes, commentCount, comments: [] });
      }
    });
  }

  return posts;
}

function scrapeOldReddit(): ScrapedPost[] {
  const posts: ScrapedPost[] = [];

  document.querySelectorAll(".thing.link").forEach((el) => {
    const id = (el as HTMLElement).dataset.fullname?.replace("t3_", "") || crypto.randomUUID();
    const titleEl = el.querySelector("a.title") as HTMLAnchorElement | null;
    const title = titleEl?.textContent?.trim() || "";
    const url = el.querySelector("a.title")
      ? `https://www.reddit.com${el.querySelector<HTMLAnchorElement>("a.comments")?.href}` ||
        (el.querySelector("a.title") as HTMLAnchorElement).href
      : "";
    const scoreEl = el.querySelector(".score.unvoted, .score.likes, .score.dislikes");
    const upvotes = parseInt(scoreEl?.getAttribute("title") || "0", 10) || 0;
    const commentsEl = el.querySelector("a.comments");
    const commentCount = parseInt(
      commentsEl?.textContent?.replace(/[^0-9]/g, "") || "0",
      10
    ) || 0;

    if (title) {
      posts.push({ id, title, url, upvotes, commentCount, comments: [] });
    }
  });

  return posts;
}

function isOldReddit(): boolean {
  return window.location.hostname === "old.reddit.com";
}

export function scrapePosts(): ScrapedPost[] {
  return isOldReddit() ? scrapeOldReddit() : scrapeNewReddit();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCRAPE_POSTS") {
    const posts = scrapePosts();
    sendResponse({ posts });
  }
  return true; // keep channel open for async
});
