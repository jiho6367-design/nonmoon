// src/services/api.js
const API_BASE = "http://localhost:4000/api";

// 2번: 인용 구절 정리
export async function normalizeQuote(text) {
  const res = await fetch(`${API_BASE}/ai/normalize-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
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
// ------------------------------
// AUTH API
// ------------------------------

// 회원가입
export async function register(username, password, passwordConfirm) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, passwordConfirm }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "회원가입 중 오류가 발생했습니다.");
  }

  return res.json();
}

// 로그인
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "로그인 실패");
  }

  return res.json();
}

// 로그인한 사용자 정보 가져오기
export async function fetchMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;
  return res.json();
}
