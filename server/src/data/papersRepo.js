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

let persistTimer = null;
let needsInitialPersist = false;
const papers = loadPapers();
if (needsInitialPersist) {
  persist();
}

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
    return parsed.map((paper) => {
      const hydrated = hydratePaper(paper);
      if (hydrated.fileName !== (paper?.fileName || "")) {
        needsInitialPersist = true;
      }
      return hydrated;
    });
  } catch (err) {
    logError("Failed to load papers data", err);
    return [];
  }
}

function hydratePaper(raw = {}) {
  const fileName = normalizeFileName(raw.fileName);
  const now = new Date().toISOString();
  return {
    id: raw.id || randomUUID(),
    title: raw.title || "",
    author: raw.author || "",
    memoCount: Number.isFinite(raw.memoCount) ? raw.memoCount : 0,
    fileName,
    storedFileName: raw.storedFileName || "",
    fileSize: raw.fileSize || null,
    uploader: raw.uploader || "",
    uploadedAt: raw.uploadedAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

// Older uploads could store mojibake (latin1-decoded) filenames; normalize back to UTF-8.
function normalizeFileName(name) {
  if (!name) return "";
  const hasNonLatin1 = [...name].some((ch) => ch.charCodeAt(0) > 255);
  if (hasNonLatin1) return name;
  try {
    return Buffer.from(name, "latin1").toString("utf8");
  } catch (_err) {
    return name;
  }
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
