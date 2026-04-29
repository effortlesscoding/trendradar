import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./config.ts";
import postsRouter from "./routes/posts.ts";
import sessionRouter from "./routes/session.ts";
import analyzeRouter from "./routes/analyze.ts";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.use((req, _res, next) => {
  const isJson =
    typeof req.headers["content-type"] === "string" &&
    req.headers["content-type"].includes("application/json");
  const body =
    isJson && req.body && Object.keys(req.body).length > 0
      ? " " + JSON.stringify(req.body)
      : "";
  // console.log(`[http] ${req.method} ${req.path}${body}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, version: config.version });
});

app.post("/log", (req, res) => {
  const { log, level } = req.body as { level: string, log?: string[] };
  if (!Array.isArray(log) || log.some((item) => typeof item !== "string")) {
    res.status(400).json({ error: "body must be { log: string[] }" });
    return;
  }
  console.log(`[client] [${level}] `, Date.now(), ' ', ...log);
  res.json({ ok: true });
});

app.use("/", sessionRouter);
app.use("/", postsRouter);
app.use("/", analyzeRouter);

app.listen(config.port, () => {
  console.log(`[server] Reddit Research API running on http://localhost:${config.port}`);
  console.log(`[server] Version ${config.version}`);
});
