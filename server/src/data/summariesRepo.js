// server/src/data/summariesRepo.js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { logError } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_ROOT = process.env.SUMMARIES_DATA_DIR
  ? path.resolve(process.cwd(), process.env.SUMMARIES_DATA_DIR)
  : __dirname;
const DATA_FILE = path.join(DATA_ROOT, "summaries.data.json");

const BASE_SUMMARY = {
  id: "",
  paperId: "",
  title: "",
  author: "",
  year: "",
  pdfName: "",
  storedFileName: "",
  summary: "",
  uploader: "",
  createdAt: null,
  updatedAt: null,
};

let persistTimer = null;

function hydrateSummary(raw = {}) {
  const now = new Date().toISOString();
  return {
    ...BASE_SUMMARY,
    ...raw,
    id: raw.id || randomUUID(),
    paperId: raw.paperId || "",
    title: raw.title || "제목 없는 논문",
    author: raw.author || "",
    year: raw.year || "",
    pdfName: raw.pdfName || "",
    storedFileName: raw.storedFileName || "",
    summary: raw.summary || "",
    uploader: raw.uploader || "",
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

function loadSummaries() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => hydrateSummary(item)) : [];
  } catch (err) {
    logError("Failed to load summaries data", err);
    return [];
  }
}

function saveNow(list) {
  try {
    mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    logError("Failed to save summaries data", err);
  }
}

function persist(list) {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => saveNow(list), 50);
}

const summaries = loadSummaries();

export function listSummariesByPaper(paperId) {
  return summaries
    .filter((s) => s.paperId === paperId)
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
}

export function listAllSummaries() {
  return summaries
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
}

export function addSummary(payload) {
  const summary = hydrateSummary(payload);
  summaries.unshift(summary);
  persist(summaries);
  return summary;
}

export function getSummaryById(paperId, id) {
  return summaries.find((s) => s.paperId === paperId && s.id === id) ?? null;
}

export function updateSummary(paperId, id, patch = {}) {
  const idx = summaries.findIndex((s) => s.paperId === paperId && s.id === id);
  if (idx === -1) return null;
  const next = hydrateSummary({
    ...summaries[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  summaries[idx] = next;
  persist(summaries);
  return next;
}

export function updateSummaryById(id, patch = {}) {
  const idx = summaries.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const next = hydrateSummary({
    ...summaries[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  summaries[idx] = next;
  persist(summaries);
  return next;
}

export function removeSummary(paperId, id) {
  const idx = summaries.findIndex((s) => s.paperId === paperId && s.id === id);
  if (idx === -1) return false;
  summaries.splice(idx, 1);
  persist(summaries);
  return true;
}

export function removeSummaryById(id) {
  const idx = summaries.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  summaries.splice(idx, 1);
  persist(summaries);
  return true;
}
