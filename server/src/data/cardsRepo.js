// server/src/data/cardsRepo.js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logError } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = process.env.CARDS_DATA_DIR
  ? path.resolve(process.cwd(), process.env.CARDS_DATA_DIR)
  : __dirname;
const DATA_FILE = path.join(DATA_ROOT, "cards.data.json");

const BASE_CARD = {
  quote: "",
  topic: "제목 없음",
  note: "",
  keywords: [],
  author: null,
  year: null,
  sourceTitle: null,
  venue: null,
  citationStyle: "",
  isBookmarked: false,
  embedding: [],
  embeddingUpdatedAt: null,
  embeddingFailedAt: null,
};

function hydrateCard(raw = {}) {
  const now = new Date().toISOString();
  return {
    ...BASE_CARD,
    ...raw,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    isBookmarked: Boolean(raw.isBookmarked),
    embedding: Array.isArray(raw.embedding) ? raw.embedding : [],
    embeddingUpdatedAt: raw.embeddingUpdatedAt ?? null,
    embeddingFailedAt: raw.embeddingFailedAt ?? null,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

function loadCards() {
  if (!existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((card) => hydrateCard(card)) : [];
  } catch (err) {
    logError("Failed to load cards data", err);
    return [];
  }
}

let persistTimer = null;
function persist(cards) {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    try {
      mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), "utf-8");
    } catch (err) {
      logError("Failed to save cards data", err);
    }
  }, 50);
}

function saveNow(cards) {
  try {
    mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), "utf-8");
  } catch (err) {
    logError("Failed to save cards data", err);
  }
}

const cards = loadCards();

export function addCard(card) {
  const hydrated = hydrateCard(card);
  cards.push(hydrated);
  persist(cards);
  return hydrated;
}

export function getAllCards() {
  return cards;
}

export function getCardById(id) {
  return cards.find((card) => card.id === id) ?? null;
}

export function updateCard(id, patch) {
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const next = {
    ...cards[idx],
    ...patch,
    keywords: Array.isArray(patch?.keywords)
      ? patch.keywords
      : cards[idx].keywords,
    updatedAt: new Date().toISOString(),
  };
  cards[idx] = hydrateCard(next);
  persist(cards);
  return cards[idx];
}

export function toggleBookmark(id) {
  const card = cards.find((c) => c.id === id);
  if (!card) return null;
  return updateCard(id, { isBookmarked: !card.isBookmarked });
}

export function removeCard(id) {
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  cards.splice(idx, 1);
  persist(cards);
  return true;
}

export function setCardEmbedding(id, embedding = []) {
  const card = getCardById(id);
  if (!card) return null;
  card.embedding = Array.isArray(embedding) ? embedding : [];
  card.embeddingUpdatedAt = new Date().toISOString();
  card.embeddingFailedAt = null;
  saveNow(cards);
  return card;
}

export function markCardEmbeddingFailed(id) {
  const card = getCardById(id);
  if (!card) return null;
  card.embedding = [];
  card.embeddingFailedAt = new Date().toISOString();
  saveNow(cards);
  return card;
}

export function queryCards({
  query = "",
  author = "",
  year = "",
  sort = "recent",
  onlyBookmarked = false,
} = {}) {
  const q = query.trim().toLowerCase();
  const authorQ = author.trim().toLowerCase();
  const yearDigits = year.trim().replace(/[^0-9]/g, "");

  let result = cards.filter((card) => {
    if (onlyBookmarked && !card.isBookmarked) {
      return false;
    }
    if (authorQ && !(card.author || "").toLowerCase().includes(authorQ)) {
      return false;
    }

    if (yearDigits) {
      const cardYearDigits = String(card.year ?? "").replace(/[^0-9]/g, "");
      if (!cardYearDigits.includes(yearDigits)) {
        return false;
      }
    }

    if (!q) return true;

    const haystacks = [
      card.quote,
      card.topic,
      card.note,
      card.author,
      card.sourceTitle,
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase());

    return haystacks.some((haystack) => haystack.includes(q));
  });

  const sorter = sort === "oldest" ? 1 : -1;
  result = result.slice().sort((a, b) => {
    const aDate = Date.parse(a.createdAt || 0);
    const bDate = Date.parse(b.createdAt || 0);
    return sorter * (aDate - bDate);
  });

  return result;
}
