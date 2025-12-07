// =======================================
// 📌 API BASE 주소 분리
// =======================================

// 🔹 quote 기능 API 서버 (기존 프로젝트)
const QUOTE_API = "http://localhost:4000/api";

// 🔹 로그인/회원가입/팀원 관리 서버 (user-auth/server.js → 3001)
const AUTH_API = "http://localhost:3001";
// 팀/그룹 관리 API 서버 주소 (server/server.js:4000)
const TEAM_API = "http://localhost:4000";

// =======================================
// 1) 🔐 AUTH API (세션 기반 로그인 / 회원가입)
// =======================================

// 회원가입
export async function register(username, password, passwordConfirm) {
  const res = await fetch(`${AUTH_API}/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: username,
      userPassword: password,
      userPassword2: passwordConfirm,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "회원가입 실패");
  }

  return res.json();
}

// 로그인
export async function login(username, password) {
  const res = await fetch(`${AUTH_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 세션 유지
    body: JSON.stringify({
      userId: username,
      userPassword: password,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "로그인 실패");
  }

  return res.json();
}

// 세션 기반 로그인은 JWT가 아니므로 fetchMe는 null 반환
export async function fetchMe() {
  return null;
}

// =======================================
// 2) 📝 QUOTE 기능 API (4000번 서버)
// =======================================

// 인용구 정리
export async function normalizeQuote(text) {
  const res = await fetch(`${QUOTE_API}/ai/normalize-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error("인용구 정리 실패");
  }

  return res.json();
}

// 인용구 서식화
export async function formatCitation(hint) {
  const res = await fetch(`${QUOTE_API}/ai/format-citation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hint }),
  });

  if (!res.ok) {
    throw new Error("인용구 서식화 실패");
  }

  return res.json();
}

// 검색 기능
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

  const res = await fetch(`${QUOTE_API}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "카드 검색 실패");
  }

  return res.json();
}

// 북마크 토글
export async function toggleBookmark(id) {
  const res = await fetch(`${QUOTE_API}/cards/${id}/bookmark`, {
    method: "PATCH",
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "북마크 실패");
  }

  return res.json();
}

// 카드 수정
export async function updateCard(id, patch) {
  const res = await fetch(`${QUOTE_API}/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "카드 수정 실패");
  }

  return res.json();
}

// 카드 삭제
export async function deleteCard(id) {
  const res = await fetch(`${QUOTE_API}/cards/${id}`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 204) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "카드 삭제 실패");
  }
}
export async function createGroup(groupName) {
  const res = await fetch(`${TEAM_API}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: groupName })
  });

  if (!res.ok) throw new Error("그룹 생성 오류");
  return res.json();
}
export async function fetchGroups() {
  const res = await fetch(`${TEAM_API}/groups`);
  if (!res.ok) throw new Error("그룹 목록 불러오기 오류");
  return res.json();
}
export async function addMember(memberName, groupId) {
  const res = await fetch(`${TEAM_API}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: memberName, groupId })
  });

  if (!res.ok) throw new Error("멤버 추가 오류");
  return res.json();
}
export async function fetchMembers() {
  const res = await fetch(`${TEAM_API}/members`);
  if (!res.ok) throw new Error("멤버 목록 불러오기 오류");
  return res.json();
}
