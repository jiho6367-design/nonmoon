// src/services/api.js
const API_BASE = "http://localhost:4000/api";

// 2번: 인용 구절 정리
export async function normalizeQuote(text, { creatorName } = {}) {
  const res = await fetch(`${API_BASE}/ai/normalize-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, creatorName }),
  });
  return res.json();
}

// 3번: 인용구 내보내기
export async function formatCitation(hint) {
  const res = await fetch(`${API_BASE}/ai/format-citation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hint }),
  });
  return res.json();
}

// 5번: 검색
export async function searchCards({
  query = "",
  author = "",
  year = "",
  sort = "recent",
  mode = "text",
  minScore,
  limit,
  onlyBookmarked = false,
} = {}) {
  const payload = { query, author, year, sort, mode, onlyBookmarked };
  if (mode === "semantic" && typeof minScore === "number") {
    payload.minScore = minScore;
  }
  if (typeof limit === "number") {
    payload.limit = limit;
  }

  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to search cards");
  }

  return res.json();
}

// 6번: 북마크 토글
export async function toggleBookmark(id) {
  const res = await fetch(`${API_BASE}/cards/${id}/bookmark`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to toggle bookmark");
  }
  return res.json();
}

// 카드 필드 업데이트
export async function updateCard(id, patch) {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to update card");
  }

  return res.json();
}

export async function deleteCard(id) {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 204) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to delete card");
  }
}

// Papers
export async function fetchPapers() {
  const res = await fetch(`${API_BASE}/papers`);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to load papers");
  }
  return res.json();
}

export async function uploadPaper({ title, author, file, uploader }) {
  const formData = new FormData();
  formData.append("title", title);
  if (author) {
    formData.append("author", author);
  }
  if (uploader) {
    formData.append("uploader", uploader);
  }
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/papers`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to upload paper");
  }

  return res.json();
}

export async function updatePaperMeta(id, patch) {
  const res = await fetch(`${API_BASE}/papers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to update paper");
  }

  return res.json();
}

export async function deletePaper(id) {
  const res = await fetch(`${API_BASE}/papers/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to delete paper");
  }
}

// Summaries
export async function fetchSummaries(paperId) {
  const res = await fetch(`${API_BASE}/papers/${paperId}/summaries`);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to load summaries");
  }
  return res.json();
}

export async function createSummary(paperId, payload) {
  const res = await fetch(`${API_BASE}/papers/${paperId}/summaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to create summary");
  }

  return res.json();
}

export async function updateSummary(paperId, summaryId, patch) {
  const res = await fetch(`${API_BASE}/papers/${paperId}/summaries/${summaryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to update summary");
  }
  return res.json();
}

export async function deleteSummary(paperId, summaryId) {
  const res = await fetch(`${API_BASE}/papers/${paperId}/summaries/${summaryId}`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 204) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to delete summary");
  }
}
