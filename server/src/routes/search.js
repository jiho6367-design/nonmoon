// server/src/routes/search.js
import { Router } from "express";
import { queryCards } from "../data/cardsRepo.js";
import { semanticSearch } from "../services/embedding.js";
import { validateSearchPayload } from "../utils/validation.js";
import { logError } from "../utils/logger.js";
import { semanticSearchLimiter } from "../middleware/rateLimit.js";

const router = Router();

// POST /api/search
router.post("/search", semanticSearchLimiter, async (req, res, next) => {
  try {
    const filters = validateSearchPayload(req.body);

    if (filters.mode === "semantic") {
      if (!filters.query?.trim()) {
        return res.status(400).json({ error: "query is required for semantic mode" });
      }
      const semanticResults = await semanticSearch(filters.query, {
        limit: filters.limit,
        minScore: filters.minScore,
        onlyBookmarked: filters.onlyBookmarked,
      });
      return res.json(semanticResults);
    }

    const result = queryCards({
      query: filters.query,
      author: filters.author,
      year: filters.year,
      sort: filters.sort,
      onlyBookmarked: filters.onlyBookmarked,
    });

    return res.json(result);
  } catch (err) {
    logError("Search request failed", err);
    next(err);
  }
});

export default router;
