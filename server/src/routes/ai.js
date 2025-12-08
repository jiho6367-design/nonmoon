// server/src/routes/ai.js
import { Router } from "express";
import crypto from "node:crypto";
import { normalizeQuote, formatCitation } from "../services/openai.js";
import { addCard } from "../data/cardsRepo.js";
import { refreshCardEmbedding } from "../services/embedding.js";
import {
  validateNormalizeQuotePayload,
  validateCitationPayload,
} from "../utils/validation.js";
import { logError } from "../utils/logger.js";
import { aiRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/normalize-quote", aiRateLimiter, async (req, res, next) => {
  try {
    const { text, creatorName } = validateNormalizeQuotePayload(req.body);
    const normalized = await normalizeQuote(text);

    const deriveTopic = () => {
      const rawTopic = normalized.topic?.trim();
      if (rawTopic && rawTopic !== "제목 없음") return rawTopic;
      if (Array.isArray(normalized.keywords) && normalized.keywords.length > 0) {
        return normalized.keywords[0];
      }
      const firstSentence = normalized.quote
        ?.split(/([.?!\n])/)
        .slice(0, 2)
        .join("")
        .trim();
      if (firstSentence) {
        return firstSentence.slice(0, 60);
      }
      return "임시 제목";
    };

    const card = addCard({
      id: crypto.randomUUID(),
      quote: normalized.quote,
      topic: deriveTopic(),
      note: normalized.note,
      keywords: normalized.keywords || [],
      author: normalized.author ?? null,
      year: normalized.year ?? null,
      sourceTitle: normalized.sourceTitle ?? null,
      venue: null,
      citationStyle: "",
      isBookmarked: false,
      creatorName: creatorName ?? null,
    });

    refreshCardEmbedding(card).catch((error) =>
      logError("Background embedding generation failed", error, {
        cardId: card.id,
      })
    );

    res.json(card);
  } catch (err) {
    next(err);
  }
});

router.post("/format-citation", aiRateLimiter, async (req, res, next) => {
  try {
    const { hint } = validateCitationPayload(req.body);
    const citation = await formatCitation(hint);
    res.json(citation);
  } catch (err) {
    next(err);
  }
});

export default router;
