// server/src/services/summarizer.js
import path from "node:path";
import fs from "node:fs";
import { PDFParse } from "pdf-parse";
import { generateSummaryText } from "./openai.js";
import { logError } from "../utils/logger.js";

async function extractPdfText(filePath, { maxChars = 6000 } = {}) {
  if (!filePath) return { text: "", meta: "" };
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return { text: "", meta: "" };

    const dataBuffer = await fs.promises.readFile(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText({
      pageJoiner: "\n\n--- PAGE page_number / total_number ---\n\n",
    });
    await parser.destroy?.();

    const cleanText = (textResult?.text || "").replace(/\s+\n/g, "\n").trim();
    const truncated = cleanText.slice(0, maxChars);
    const meta = `PDF 크기 ${(stats.size / 1024 / 1024).toFixed(2)}MB, 페이지 ${textResult?.total ?? "?"}쪽`;
    return { text: truncated, meta };
  } catch (err) {
    logError("Failed to extract PDF text", err, { filePath });
    return { text: "", meta: "" };
  }
}

export async function generatePaperSummary({
  paper,
  uploadRoot,
  pdfName,
  year,
}) {
  const pdfPath = paper?.storedFileName
    ? path.resolve(uploadRoot, paper.storedFileName)
    : null;

  const { text: pdfText, meta: placeholderInfo } = await extractPdfText(pdfPath);

  const summary = await generateSummaryText({
    title: paper?.title || "제목 없는 논문",
    author: paper?.author || "",
    year: year || paper?.uploadedAt?.slice(0, 4) || "",
    pdfName: pdfName || paper?.fileName || "",
    extraContext: placeholderInfo,
    pdfText,
  });

  return summary;
}
