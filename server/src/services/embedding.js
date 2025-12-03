import { embed } from "./openai.js";
import {
  getAllCards,
  setCardEmbedding,
  markCardEmbeddingFailed,
} from "../data/cardsRepo.js";
import { logError, logInfo } from "../utils/logger.js";

const TEXT_FIELDS = ["quote", "topic", "note", "author", "sourceTitle"];

function buildEmbeddingText(card) {
  const keywords = (card.keywords || []).join(", ");
  const mainText = TEXT_FIELDS.map((key) => card[key]).filter(Boolean).join("\n");
  return [mainText, keywords].filter(Boolean).join("\n");
}

export async function refreshCardEmbedding(card) {
  try {
    const input = buildEmbeddingText(card);
    if (!input) {
      markCardEmbeddingFailed(card.id);
      return null;
    }
    const vector = await embed(input);
    if (!vector?.length) {
      throw new Error("Empty embedding response");
    }
    const updated = setCardEmbedding(card.id, vector);
    logInfo("Card embedding updated", { cardId: card.id });
    return updated;
  } catch (error) {
    logError("Failed to refresh card embedding", error, { cardId: card.id });
    markCardEmbeddingFailed(card.id);
    return null;
  }
}

function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function semanticSearch(
  query,
  { limit = 10, minScore = 0.65, onlyBookmarked = false } = {}
) {
  if (!query?.trim()) {
    return [];
  }

  const cappedLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
  const threshold = Math.min(Math.max(0, Number(minScore) || 0.65), 1);

  const queryVector = await embed(query);
  const candidates = getAllCards().filter((card) => {
    if (onlyBookmarked && !card.isBookmarked) {
      return false;
    }
    return Array.isArray(card.embedding) && card.embedding.length;
  });

  return candidates
    .map((card) => ({
      card,
      score: cosineSimilarity(queryVector, card.embedding),
    }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, cappedLimit)
    .map((item) => ({
      ...item.card,
      similarity: Number(item.score.toFixed(4)),
    }));
}
