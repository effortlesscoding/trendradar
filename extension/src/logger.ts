const API_BASE = "http://localhost:3457";

type Level = "log" | "info" | "warn" | "error" | "debug";

function serialize(args: unknown[]): string[] {
  return args.map((a) => (typeof a === "string" ? a : JSON.stringify(a)));
}

function send(level: Level, args: unknown[]): void {
  fetch(`${API_BASE}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, log: serialize(args) }),
  }).catch(() => {});
}

export const logger = {
  log: (...args: unknown[]) => { console.log(...args); send("log", args); },
  info: (...args: unknown[]) => { console.info(...args); send("info", args); },
  warn: (...args: unknown[]) => { console.warn(...args); send("warn", args); },
  error: (...args: unknown[]) => { console.error(...args); send("error", args); },
  debug: (...args: unknown[]) => { console.debug(...args); send("debug", args); },
};
