import { Router } from "express";
import path from "node:path";
import { getPaperById } from "../data/papersRepo.js";
import {
  addSummary,
  getSummaryById,
  listSummariesByPaper,
  removeSummary,
  updateSummary,
} from "../data/summariesRepo.js";
import { validateSummaryCreate, validateSummaryPatch } from "../utils/validation.js";
import { generatePaperSummary } from "../services/summarizer.js";
import { logError } from "../utils/logger.js";

const router = Router();

const uploadRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.cwd(), process.env.UPLOAD_ROOT)
  : path.resolve(process.cwd(), "uploads");

router.get("/papers/:paperId/summaries", (req, res) => {
  const { paperId } = req.params;
  const paper = getPaperById(paperId);
  if (!paper) {
    return res.status(404).json({ error: "paper not found" });
  }
  return res.json(listSummariesByPaper(paperId));
});

router.post("/papers/:paperId/summaries", async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const paper = getPaperById(paperId);
    if (!paper) {
      return res.status(404).json({ error: "paper not found" });
    }

    const payload = validateSummaryCreate(req.body);
    const summaryText =
      payload.summary?.trim() ||
      (await generatePaperSummary({
        paper,
        uploadRoot,
        pdfName: payload.pdfName || paper.fileName,
        year: payload.year,
      }));

    const summary = addSummary({
      paperId,
      title: payload.title || paper.title || "제목 없는 논문",
      author: payload.author || paper.author || "",
      year: payload.year || paper.uploadedAt?.slice(0, 4) || "",
      pdfName: payload.pdfName || paper.fileName || "",
      uploader: payload.uploader || "",
      summary: summaryText,
    });

    return res.status(201).json(summary);
  } catch (err) {
    logError("Failed to create summary", err);
    return next(err);
  }
});

router.patch("/papers/:paperId/summaries/:summaryId", (req, res, next) => {
  try {
    const { paperId, summaryId } = req.params;
    const paper = getPaperById(paperId);
    if (!paper) {
      return res.status(404).json({ error: "paper not found" });
    }

    const patch = validateSummaryPatch(req.body);
    const updated = updateSummary(paperId, summaryId, patch);
    if (!updated) {
      return res.status(404).json({ error: "summary not found" });
    }
    return res.json(updated);
  } catch (err) {
    logError("Failed to update summary", err);
    return next(err);
  }
});

router.delete("/papers/:paperId/summaries/:summaryId", (req, res) => {
  const { paperId, summaryId } = req.params;
  const paper = getPaperById(paperId);
  if (!paper) {
    return res.status(404).json({ error: "paper not found" });
  }

  const removed = removeSummary(paperId, summaryId);
  if (!removed) {
    return res.status(404).json({ error: "summary not found" });
  }
  return res.status(204).send();
});

export default router;
