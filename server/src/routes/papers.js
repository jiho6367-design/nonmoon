import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import {
  addPaper,
  getPaperById,
  listPapers,
  removePaper,
  updatePaper,
} from "../data/papersRepo.js";
import { ValidationError, validatePaperCreate, validatePaperPatch } from "../utils/validation.js";
import { logError, logWarn } from "../utils/logger.js";

const router = Router();

const uploadRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.cwd(), process.env.UPLOAD_ROOT)
  : path.resolve(process.cwd(), "uploads");
const papersDir = path.join(uploadRoot, "papers");
fs.mkdirSync(papersDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, papersDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]+/g, "-") || "paper";
    const uniqueName = `${Date.now()}-${base}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_PAPER_SIZE || 25 * 1024 * 1024), // default 25MB
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return cb(new ValidationError("Only PDF uploads are allowed", 400));
    }
    cb(null, true);
  },
});

function buildFileUrl(req, storedRelativePath) {
  if (!storedRelativePath) return null;
  const normalized = storedRelativePath.replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}/uploads/${normalized}`;
}

function serializePaper(req, paper) {
  return {
    ...paper,
    fileUrl: buildFileUrl(req, paper.storedFileName),
  };
}

router.get("/papers", (req, res) => {
  const papers = listPapers().map((paper) => serializePaper(req, paper));
  return res.json(papers);
});

router.get("/papers/:id", (req, res) => {
  const paper = getPaperById(req.params.id);
  if (!paper) {
    return res.status(404).json({ error: "paper not found" });
  }
  return res.json(serializePaper(req, paper));
});

router.get("/papers/:id/download", (req, res, next) => {
  const paper = getPaperById(req.params.id);
  if (!paper) {
    return res.status(404).json({ error: "paper not found" });
  }
  const filePath = path.resolve(uploadRoot, paper.storedFileName);
  return res.download(filePath, paper.fileName || undefined, (err) => {
    if (err) {
      logError("Failed to download paper", err, { paperId: paper.id });
      return next(err);
    }
  });
});

router.post("/papers", upload.single("file"), (req, res, next) => {
  try {
    const payload = validatePaperCreate(req.body);
    if (!req.file) {
      throw new ValidationError("PDF file is required");
    }

    const storedRelativePath = path.relative(uploadRoot, req.file.path).replace(/\\/g, "/");

    const paper = addPaper({
      ...payload,
      fileName: req.file.originalname,
      storedFileName: storedRelativePath,
      fileSize: req.file.size,
    });

    return res.status(201).json(serializePaper(req, paper));
  } catch (err) {
    if (req.file?.path) {
      // Clean up uploaded file on failure
      fs.unlink(req.file.path, () => {});
    }
    return next(err);
  }
});

router.patch("/papers/:id", (req, res, next) => {
  try {
    const patch = validatePaperPatch(req.body);
    const updated = updatePaper(req.params.id, patch);
    if (!updated) {
      return res.status(404).json({ error: "paper not found" });
    }
    return res.json(serializePaper(req, updated));
  } catch (err) {
    return next(err);
  }
});

router.delete("/papers/:id", (req, res) => {
  const removed = removePaper(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: "paper not found" });
  }
  if (removed.storedFileName) {
    const filePath = path.resolve(uploadRoot, removed.storedFileName);
    fs.unlink(filePath, (err) => {
      if (err) {
        logWarn("Failed to delete uploaded paper file", { filePath, error: err.message });
      }
    });
  }
  return res.status(204).send();
});

export default router;
