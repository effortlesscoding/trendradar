import { getSessionStatus, resetSession } from "./api-client.js";

const DEFAULT_SUBREDDITS = [
  "MachineLearning",
  "learnmachinelearning",
  "artificial",
  "deeplearning",
  "MLQuestions",
  "compsci",
  "learnprogramming",
].join("\n");

const DEFAULT_POSTS_PER_SUB = 50;

// Elements
const subredditTextarea = document.getElementById(
  "subreddits"
) as HTMLTextAreaElement;
const postsPerSubInput = document.getElementById(
  "postsPerSub"
) as HTMLInputElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const statusContainer = document.getElementById(
  "statusContainer"
) as HTMLDivElement;
const globalStatus = document.getElementById("globalStatus") as HTMLDivElement;
const apiError = document.getElementById("apiError") as HTMLDivElement;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

function getSubreddits(): string[] {
  return subredditTextarea.value
    .split("\n")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}

function setBadge(sub: string, status: string, postCount: number): HTMLElement {
  const existing = document.getElementById(`badge-${sub}`);
  const badge = existing || document.createElement("div");
  badge.id = `badge-${sub}`;
  badge.className = `badge badge-${status}`;
  badge.innerHTML = `
    <span class="badge-sub">r/${sub}</span>
    <span class="badge-status">${status}</span>
    ${postCount ? `<span class="badge-count">${postCount} posts</span>` : ""}
  `;
  if (!existing) statusContainer.appendChild(badge);
  return badge;
}

async function pollStatus(): Promise<void> {
  try {
    apiError.style.display = "none";
    const session = await getSessionStatus();

    const subs = Object.entries(session.subreddits);
    statusContainer.innerHTML = "";

    for (const [sub, state] of subs) {
      setBadge(sub, state.status, state.postCount);
    }

    const allDone =
      subs.length > 0 &&
      subs.every(([, s]) => s.status === "done" || s.status === "error");
    const anyRunning = subs.some(([, s]) => s.status === "scraping");

    if (allDone) {
      if (session.analysisTriggered) {
        globalStatus.textContent = "✓ Analysis complete — check tmp/ for results";
        globalStatus.className = "global-status done";
      } else {
        globalStatus.textContent = "✓ Scraping done — running Claude analysis...";
        globalStatus.className = "global-status analyzing";
      }
      stopPolling();
      setRunning(false);
    } else if (anyRunning || session.startedAt) {
      globalStatus.textContent = "⟳ Scraping in progress...";
      globalStatus.className = "global-status running";
    }
  } catch {
    apiError.style.display = "block";
    apiError.textContent = "Cannot reach API — is server running on :3457?";
  }
}

function startPolling(): void {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(pollStatus, 1500);
  pollStatus();
}

function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function setRunning(running: boolean): void {
  isRunning = running;
  startBtn.disabled = running;
  stopBtn.disabled = !running;
  subredditTextarea.disabled = running;
  postsPerSubInput.disabled = running;
}

startBtn.addEventListener("click", async () => {
  const subs = getSubreddits();
  if (subs.length === 0) {
    apiError.style.display = "block";
    apiError.textContent = "Enter at least one subreddit";
    return;
  }

  const postsPerSub = parseInt(postsPerSubInput.value, 10) || DEFAULT_POSTS_PER_SUB;

  setRunning(true);
  statusContainer.innerHTML = "";
  globalStatus.textContent = "Starting...";
  globalStatus.className = "global-status";

  // Tell background to start
  chrome.runtime.sendMessage(
    { type: "START_SCRAPE", subreddits: subs, postsPerSub },
    (response) => {
      if (!response?.ok) {
        apiError.style.display = "block";
        apiError.textContent = response?.error || "Failed to start";
        setRunning(false);
        return;
      }
      startPolling();
    }
  );
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_SCRAPE" });
  stopPolling();
  setRunning(false);
  globalStatus.textContent = "Stopped";
  globalStatus.className = "global-status";
});

resetBtn.addEventListener("click", async () => {
  stopPolling();
  setRunning(false);
  await resetSession().catch(() => {});
  statusContainer.innerHTML = "";
  globalStatus.textContent = "Ready";
  globalStatus.className = "global-status";
});

// Init
subredditTextarea.value = DEFAULT_SUBREDDITS;
postsPerSubInput.value = String(DEFAULT_POSTS_PER_SUB);
globalStatus.textContent = "Ready";

// Check if already running
chrome.runtime.sendMessage({ type: "IS_RUNNING" }, (response) => {
  if (response?.isRunning) {
    setRunning(true);
    startPolling();
  }
});
