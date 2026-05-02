import { execFile, execFileSync } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function findClaudeBinary(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("which", ["claude"]);
    const p = stdout.trim();
    if (p) return p;
  } catch {
    // fall through to common install paths
  }

  const candidates = [
    "/usr/local/bin/claude",
    "/usr/bin/claude",
    `${process.env.HOME}/.local/bin/claude`,
    `${process.env.HOME}/.npm-global/bin/claude`,
  ];

  for (const p of candidates) {
    try {
      execFileSync(p, ["--version"], { stdio: "ignore" });
      return p;
    } catch {
      // not found here
    }
  }

  throw new Error(
    "claude binary not found — install with: npm install -g @anthropic-ai/claude-code"
  );
}

export async function runClaude(prompt: string): Promise<string> {
  const binary = await findClaudeBinary();
  console.log(`[claude] Running this prompt:`, prompt);

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frame = 0;
  let seconds = 0;
  const spinner = setInterval(() => {
    frame = (frame + 1) % frames.length;
    if (frame === 0) seconds++;
    process.stderr.write(`\r${frames[frame]} Running Claude... ${seconds}s`);
  }, 80);

  try {
    const { stdout } = await execFileAsync(
      binary,
      ["-p", prompt],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout;
  } finally {
    clearInterval(spinner);
    process.stderr.write("\r\x1b[K");
  }
}