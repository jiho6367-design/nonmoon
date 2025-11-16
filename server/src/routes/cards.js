// server/src/routes/cards.js
import { Router } from "express";
import {
  toggleBookmark,
  updateCard,
  removeCard,
  getAllCards,
} from "../data/cardsRepo.js";
import { validateCardPatch } from "../utils/validation.js";
import { refreshCardEmbedding } from "../services/embedding.js";
import { logError } from "../utils/logger.js";

const router = Router();

const EMBEDDING_FIELDS = ["quote", "topic", "note", "keywords", "author", "sourceTitle"];
const needsEmbeddingRefresh = (patch = {}) =>
  EMBEDDING_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(patch, field));

// GET /api/cards - JSON list
router.get("/cards", (_req, res) => {
  return res.json(getAllCards());
});

// GET /api/cards/view - HTML table
router.get("/cards/view", (_req, res) => {
  try {
    const cards = getAllCards();
    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const rows =
      cards.length === 0
        ? `<tr><td colspan="7" style="text-align:center;color:#6b7280;">카드가 없습니다.</td></tr>`
        : cards
            .map(
              (card) => `
          <tr>
            <td>${esc(card.topic || "제목 없음")}</td>
            <td>${esc(card.author || "")}</td>
            <td>${esc(card.year || "")}</td>
            <td style="text-align:center;">${card.isBookmarked ? "★" : ""}</td>
            <td>${esc((card.keywords || []).join(", "))}</td>
            <td style="max-width:600px;word-break:break-word;">${esc(card.quote || "")}</td>
            <td style="white-space:nowrap;">
              <button
                data-action="copy"
                data-quote="${encodeURIComponent(card.quote || "")}"
                class="ghost-btn"
                title="인용문 복사"
              >
                복사
              </button>
              <button
                data-action="delete"
                data-card-id="${esc(card.id)}"
                class="danger-btn"
                title="카드 삭제"
              >
                삭제
              </button>
            </td>
          </tr>`
            )
            .join("\n");

    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>인용 카드 리스트</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #0f172a; background: #f8fafc; }
    h1 { margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); }
    th, td { border: 1px solid #e5e7eb; padding: 10px; vertical-align: top; font-size: 0.95rem; }
    th { background: #eef2ff; text-align: left; }
    .toolbar { margin-bottom: 12px; display:flex; gap:8px; flex-wrap: wrap; }
    .badge { padding:6px 10px; border:1px solid #c7d2fe; border-radius: 6px; font-size:0.85rem; color:#4338ca; text-decoration:none; background:#eef2ff; }
    .ghost-btn, .danger-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font-size: 0.85rem; margin-right: 6px; }
    .ghost-btn { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
    .ghost-btn:hover { background: #e0e7ff; }
    .danger-btn { background: #fee2e2; border-color: #fecaca; color: #b91c1c; }
    .danger-btn:hover { background: #fecaca; }
  </style>
</head>
<body>
  <h1>인용 카드 리스트</h1>
  <div class="toolbar">
    <a class="badge" href="/api/cards">JSON 보기</a>
    <a class="badge" href="/api/cards/view">새로고침</a>
  </div>
  <table>
    <thead>
      <tr>
        <th>주제</th>
        <th>저자</th>
        <th>연도</th>
        <th>★</th>
        <th>키워드</th>
        <th>인용 문장</th>
        <th>작업</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script>
    async function copyText(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    }

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;

      if (action === "copy") {
        const encoded = button.dataset.quote || "";
        const text = decodeURIComponent(encoded);
        try {
          await copyText(text);
          button.textContent = "복사됨";
          setTimeout(() => (button.textContent = "복사"), 1200);
        } catch (error) {
          alert("복사에 실패했습니다.");
          console.error(error);
        }
        return;
      }

      if (action === "delete") {
        const cardId = button.dataset.cardId;
        if (!cardId) return;
        const confirmed = confirm("이 카드를 삭제할까요?");
        if (!confirmed) return;
        button.disabled = true;
        button.textContent = "삭제 중...";
        try {
          const res = await fetch(\`/api/cards/\${cardId}\`, { method: "DELETE" });
          if (!res.ok && res.status !== 204) {
            throw new Error("삭제 실패");
          }
          const row = button.closest("tr");
          row?.remove();
        } catch (error) {
          alert("카드를 삭제하지 못했습니다.");
          console.error(error);
          button.disabled = false;
          button.textContent = "삭제";
        }
      }
    });
  </script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    return res
      .status(500)
      .send("<h1>서버 오류</h1><p>잠시 후 다시 시도해 주세요.</p>");
  }
});

// PATCH /api/cards/:id - update arbitrary fields
router.patch("/cards/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const patch = validateCardPatch(req.body);

    const updated = updateCard(id, patch);
    if (!updated) {
      return res.status(404).json({ error: "card not found" });
    }

    if (needsEmbeddingRefresh(patch)) {
      refreshCardEmbedding(updated).catch((error) =>
        logError("Failed to refresh embedding after patch", error, { cardId: id })
      );
    }

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cards/:id/bookmark
router.patch("/cards/:id/bookmark", (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = toggleBookmark(id);
    if (!updated) {
      return res.status(404).json({ error: "card not found" });
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cards/:id
router.delete("/cards/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = removeCard(id);
    if (!removed) {
      return res.status(404).json({ error: "card not found" });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
