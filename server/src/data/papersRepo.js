import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logError } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_ROOT = process.env.PAPERS_DATA_DIR
  ? path.resolve(process.cwd(), process.env.PAPERS_DATA_DIR)
  : __dirname;
const DATA_FILE = path.join(DATA_ROOT, "papers.data.json");

const papers = loadPapers();
let persistTimer = null;

function loadPapers() {
  if (!existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((paper) => hydratePaper(paper));
  } catch (err) {
    logError("Failed to load papers data", err);
    return [];
  }
}

function hydratePaper(raw = {}) {
  const now = new Date().toISOString();
  return {
    id: raw.id || randomUUID(),
    title: raw.title || "",
    author: raw.author || "",
    memoCount: Number.isFinite(raw.memoCount) ? raw.memoCount : 0,
    fileName: raw.fileName || "",
    storedFileName: raw.storedFileName || "",
    fileSize: raw.fileSize || null,
    uploader: raw.uploader || "",
    uploadedAt: raw.uploadedAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

function persist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    try {
      mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify(papers, null, 2), "utf-8");
    } catch (err) {
      logError("Failed to save papers data", err);
    }
  }, 50);
}

export function listPapers() {
  return papers;
}

export function addPaper({
  title,
  author = "",
  memoCount = 0,
  fileName,
  storedFileName,
  fileSize = null,
  uploader = "",
}) {
  const now = new Date().toISOString();
  const paper = hydratePaper({
    title,
    author,
    memoCount,
    fileName,
    storedFileName,
    fileSize,
    uploader,
    uploadedAt: now,
    updatedAt: now,
  });
  papers.unshift(paper);
  persist();
  return paper;
}

export function getPaperById(id) {
  return papers.find((paper) => paper.id === id) ?? null;
}

export function updatePaper(id, patch = {}) {
  const idx = papers.findIndex((paper) => paper.id === id);
  if (idx === -1) return null;

  const next = hydratePaper({
    ...papers[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  papers[idx] = next;
  persist();
  return next;
}

export function removePaper(id) {
  const idx = papers.findIndex((paper) => paper.id === id);
  if (idx === -1) return null;
  const [removed] = papers.splice(idx, 1);
  persist();
  return removed;
}
