import { Router } from "express";
import type { Request, Response } from "express";
import {
  initSession,
  getSession,
  resetSession,
} from "../session.ts";

const router = Router();

router.post("/session/start", (req: Request, res: Response) => {
  const { subreddits } = req.body as { subreddits?: string[] };
  if (!Array.isArray(subreddits) || subreddits.length === 0) {
    res.status(400).json({ error: "subreddits must be a non-empty array" });
    return;
  }

  const cleaned = subreddits.map((s) =>
    s.replace(/^r\//i, "").replace(/\s/g, "")
  );
  initSession(cleaned);
  console.log(`[session] started for: ${cleaned.join(", ")}`);
  res.json({ ok: true, subreddits: cleaned });
});

router.get("/session/status", (_req: Request, res: Response) => {
  res.json(getSession());
});

router.post("/session/reset", (_req: Request, res: Response) => {
  resetSession();
  console.log("[session] reset");
  res.json({ ok: true });
});

export default router;
