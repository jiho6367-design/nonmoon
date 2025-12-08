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
        ? `<tr><td colspan="7" class="empty">카드가 없습니다.</td></tr>`
        : cards
            .map(
              (card) => `
          <tr>
            <td>${esc(card.topic || "제목 없음")}</td>
            <td>${esc(card.creatorName || "-")}</td>
            <td>${esc(card.author || "")}</td>
            <td>${esc(card.year || "")}</td>
            <td class="bookmark-cell">
              ${
                card.isBookmarked
                  ? '<span class="star-icon" title="북마크됨">★</span>'
                  : '<span class="star-icon muted" title="북마크 아님">☆</span>'
              }
            </td>
            <td class="quote-cell">${esc(card.quote || "")}</td>
            <td class="actions-cell">
              <button
                data-action="edit"
                data-quote="${encodeURIComponent(card.quote || "")}"
                class="ghost-btn icon-btn"
                title="수정"
                aria-label="수정"
              >
                ✏️
              </button>
              <button
                data-action="delete"
                data-card-id="${esc(card.id)}"
                class="danger-btn icon-btn"
                title="삭제"
                aria-label="삭제"
              >
                🗑️
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
    :root {
      --indigo-50: #eef2ff;
      --indigo-100: #e0e7ff;
      --indigo-500: #6366f1;
      --indigo-600: #4f46e5;
      --slate-900: #0f172a;
      --slate-700: #334155;
      --slate-100: #f8fafc;
      --amber-400: #fbbf24;
      --amber-500: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans KR", "Pretendard", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      margin: 24px;
      color: var(--slate-900);
      background: linear-gradient(135deg, #0f1727 0%, #1f2937 45%, #111827 100%);
      min-height: 100vh;
    }
    h1 {
      margin: 0 0 16px;
      color: #fff;
      letter-spacing: -0.01em;
    }
    .card-shell {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(99, 102, 241, 0.18);
      border-radius: 20px;
      padding: 18px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      vertical-align: top;
      font-size: 0.95rem;
      color: var(--slate-700);
    }
    th {
      background: linear-gradient(135deg, var(--indigo-600), var(--indigo-500));
      color: #fff;
      text-align: left;
      font-weight: 700;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    tr:hover td {
      background: #f8fafc;
    }
    .toolbar {
      margin-bottom: 12px;
      display:flex;
      gap:8px;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .close-btn {
      padding:10px 16px;
      border-radius: 12px;
      font-size:0.95rem;
      color:#fff;
      border:none;
      cursor:pointer;
      background: linear-gradient(135deg, var(--indigo-600), var(--indigo-500));
      box-shadow: 0 12px 24px rgba(79, 70, 229, 0.25);
    }
    .ghost-btn, .danger-btn {
      padding: 6px 8px;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 0.88rem;
      margin: 0 2px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .ghost-btn {
      background: var(--indigo-50);
      border-color: var(--indigo-100);
      color: var(--indigo-600);
    }
    .ghost-btn:hover {
      background: var(--indigo-100);
      transform: translateY(-1px);
      box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
    }
    .danger-btn {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }
    .danger-btn:hover {
      background: #fee2e2;
      transform: translateY(-1px);
      box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
    }
    .bookmark-cell {
      text-align: center;
      width: 72px;
    }
    .star-icon {
      color: var(--amber-500);
      font-size: 1.2rem;
      filter: drop-shadow(0 4px 10px rgba(245, 158, 11, 0.35));
    }
    .star-icon.muted {
      color: #cbd5e1;
      filter: none;
    }
    .quote-cell {
      max-width: 600px;
      word-break: break-word;
    }
    .actions-cell {
      white-space: nowrap;
      text-align: center;
    }
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 10px;
    }
    .empty {
      text-align:center;
      color:#94a3b8;
      padding: 16px;
    }
  </style>
</head>
<body>
  <h1>인용 카드 리스트</h1>
  <div class="card-shell">
    <div class="toolbar">
      <button class="close-btn" id="close-cards">인용 카드 리스트 닫기</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>제목</th>
          <th>작성자</th>
          <th>저자</th>
          <th>연도</th>
          <th>북마크</th>
          <th>인용 문장</th>
          <th>작업</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
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

    const closeBtn = document.getElementById("close-cards");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        if (window.close) {
          window.close();
        } else if (history.length > 1) {
          history.back();
        }
      });
    }

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;

      if (action === "edit") {
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
        button.textContent = "삭제 중..";
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
      .send("<h1>서버 오류</h1><p>다시 시도해 주세요</p>");
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
