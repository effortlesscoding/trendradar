export const config = {
  port: 3457,
  postsPerSubreddit: 50,
  commentsPerPost: 10,
  delayBetweenRequests: 1500, // ms
  minSignalScore: 2,
  llmTopN: 30,
  version: "1.0.0",
} as const;
