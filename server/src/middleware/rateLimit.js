import rateLimit from "express-rate-limit";

const limit = Number(process.env.RATE_LIMIT_REQUESTS || 60);

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

export const semanticSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Math.max(10, Math.floor(limit / 2)),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.body?.mode !== "semantic",
});
