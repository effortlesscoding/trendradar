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

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, version: config.version });
});

app.use("/", sessionRouter);
app.use("/", postsRouter);
app.use("/", analyzeRouter);

app.listen(config.port, () => {
  console.log(`[server] Reddit Research API running on http://localhost:${config.port}`);
  console.log(`[server] Version ${config.version}`);
});
