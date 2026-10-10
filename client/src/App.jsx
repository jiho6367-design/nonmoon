import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const PdfReader = lazy(() => import("./PdfReader.jsx"));

const date = (value) =>
  value ? new Date(value).toLocaleDateString("ko-KR") : "—";
const fields = (form) => Object.fromEntries(new FormData(form));
function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <span className="empty-icon">⌑</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Modal({ title, onClose, children, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      aria-labelledby="modal-title"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <header>
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="창 닫기"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const send = async (path, body) => {
    setBusy(true);
    setError("");
    try {
      await api(`/auth/${path}`, { method: "POST", body });
      await onAuth();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand" href="#">
          nonmoon<span>↗</span>
        </a>
        <div>
          <p className="eyebrow">YOUR SHARED RESEARCH SPACE</p>
          <h1>
            읽은 논문이
            <br />
            다음 발견으로.
          </h1>
          <p>
            논문과 생각을 한곳에 모으세요.
            <br />
            함께 읽고, 중요한 문장을 연결하는 연구 공간.
          </p>
          <div className="auth-art">
            <span>01 / READ</span>
            <div>
              “좋은 질문은
              <br />
              기록에서 시작된다.”
            </div>
            <span>COLLECT · CONNECT · DISCOVER</span>
          </div>
        </div>
        <small>Nonmoon · 팀을 위한 논문 아카이브</small>
      </section>
      <section className="auth-form">
        <div>
          <p className="eyebrow">WELCOME TO NONMOON</p>
          <h2>
            {mode === "login" ? "연구를 이어가세요" : "함께할 공간을 만드세요"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "계정으로 로그인하거나 샘플 연구 공간을 둘러보세요."
              : "계정을 만들고 첫 연구팀을 시작하세요."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(
                mode === "login" ? "login" : "register",
                fields(e.currentTarget),
              );
            }}
          >
            {mode === "register" && (
              <Field
                label="이름"
                name="name"
                required
                maxLength={80}
                autoComplete="name"
              />
            )}
            <Field
              label="이메일"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <Field
              label="비밀번호"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "잠시만 기다려 주세요…"
                : mode === "login"
                  ? "로그인 →"
                  : "회원가입 →"}
            </button>
          </form>
          <button
            className="text-button full"
            disabled={busy}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "처음 오셨나요? 회원가입"
              : "이미 계정이 있나요? 로그인"}
          </button>
          <div className="separator">또는</div>
          <button
            className="secondary full"
            disabled={busy}
            onClick={() => send("demo", {})}
          >
            샘플 연구 공간 둘러보기 ↗
          </button>
          <p className="fine">샘플 논문과 카드로 주요 기능을 체험합니다.</p>
        </div>
      </section>
    </main>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(true),
    [teams, setTeams] = useState([]),
    [teamId, setTeamId] = useState(""),
    [view, setView] = useState("papers"),
    [papers, setPapers] = useState([]),
    [cards, setCards] = useState([]),
    [members, setMembers] = useState([]),
    [paper, setPaper] = useState(null),
    [paperCards, setPaperCards] = useState([]),
    [summaries, setSummaries] = useState([]),
    [panel, setPanel] = useState("cards"),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [author, setAuthor] = useState(""),
    [year, setYear] = useState(""),
    [bookmarked, setBookmarked] = useState(false),
    [sort, setSort] = useState("recent"),
    [layout, setLayout] = useState("grid"),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(null),
    [summaryMode, setSummaryMode] = useState("extractive");
  const request = useRef(0);
  const detailRequest = useRef(0);
  const activeTeam = teams.find((t) => String(t.id) === String(teamId));
  async function hydrate() {
    const session = await api("/auth/me");
    setUser(session.user);
    if (session.user) {
      const list = await api("/teams");
      setTeams(list);
      setTeamId((prev) =>
        list.some((t) => String(t.id) === String(prev))
          ? prev
          : String(list[0]?.id || ""),
      );
    }
  }
  useEffect(() => {
    api("/health")
      .then((h) => setSummaryMode(h.summaryMode || "extractive"))
      .catch(() => {});
    hydrate()
      .catch((e) => setError(e.message))
      .finally(() => setBoot(false));
  }, []);
  async function refresh() {
    if (!teamId) return;
    const seq = ++request.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query,
        author,
        year,
        sort,
        ...(bookmarked ? { bookmarked: "true" } : {}),
      });
      const [ps, cs, ms] = await Promise.all([
        api(`/teams/${teamId}/papers?${params}`),
        api(`/teams/${teamId}/cards?${params}`),
        api(`/teams/${teamId}/members`),
      ]);
      if (seq === request.current) {
        setPapers(ps);
        setCards(cs);
        setMembers(ms);
      }
    } catch (e) {
      if (seq === request.current) setError(e.message);
    } finally {
      if (seq === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (user) refresh();
    return () => {
      request.current++;
    };
  }, [teamId, user, query, author, year, sort, bookmarked]);
  async function openPaper(id) {
    const seq = ++detailRequest.current;
    setLoading(true);
    setError("");
    try {
      const [p, c, s] = await Promise.all([
        api(`/papers/${id}`),
        api(`/papers/${id}/cards`),
        api(`/papers/${id}/summaries`),
      ]);
      if (seq !== detailRequest.current) return;
      setPaper(p);
      setPaperCards(c);
      setSummaries(s);
      setPage(1);
      setPanel("cards");
      return true;
    } catch (e) {
      if (seq === detailRequest.current) setError(e.message);
    } finally {
      if (seq === detailRequest.current) setLoading(false);
    }
  }
  async function reloadDetail() {
    if (!paper) return;
    setError("");
    const seq = ++detailRequest.current;
    const [p, c, s] = await Promise.all([
      api(`/papers/${paper.id}`),
      api(`/papers/${paper.id}/cards`),
      api(`/papers/${paper.id}/summaries`),
    ]);
    if (seq !== detailRequest.current) return;
    setPaper(p);
    setPaperCards(c);
    setSummaries(s);
  }
  async function run(action, message, { close = true, detail = true } = {}) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (close) setModal(null);
      if (detail && paper) await reloadDetail();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteTeam() {
    setBusy(true);
    setError("");
    try {
      await api(`/teams/${teamId}`, { method: "DELETE" });
      request.current++;
      detailRequest.current++;
      setPaper(null);
      setPapers([]);
      setCards([]);
      setMembers([]);
      setPaperCards([]);
      setSummaries([]);
      setTeamId("");
      setTeams((current) =>
        current.filter((team) => String(team.id) !== String(teamId)),
      );
      setLoading(false);
      setModal(null);
      reset();
      setNotice("연구팀과 연결된 자료를 삭제했습니다.");
      await hydrate();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const reset = () => {
    setQuery("");
    setAuthor("");
    setYear("");
    setBookmarked(false);
    setSort("recent");
  };
  const go = (next) => {
    detailRequest.current++;
    setLoading(false);
    setError("");
    setView(next);
    setPaper(null);
    reset();
  };
  const logout = async () => {
    detailRequest.current++;
    setLoading(false);
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      request.current++;
      setUser(null);
      setTeamId("");
      setTeams([]);
      setPaper(null);
      setPapers([]);
      setCards([]);
      setNotice("");
      setError("");
      reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (boot)
    return (
      <div className="boot" role="status">
        nonmoon <span>연구 공간을 불러오는 중…</span>
      </div>
    );
  if (!user)
    return (
      <>
        <Auth onAuth={hydrate} />
        {error && (
          <div className="global-error" role="alert">
            {error}
            <button onClick={() => window.location.reload()}>다시 연결</button>
          </div>
        )}
      </>
    );
  const modalError = error && (
    <p className="error" role="alert">
      {error}
    </p>
  );
  const actions = (
    <div className="form-actions">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => setModal(null)}
      >
        취소
      </button>
      <button className="primary" disabled={busy}>
        {busy ? "저장 중…" : "저장하기"}
      </button>
    </div>
  );
  const showModal = (value) => {
    setError("");
    setModal(value);
  };
  function renderCard(card) {
    return (
      <article className="quote-card" key={card.id}>
        <div className="row">
          <span className="tag">
            {card.topic || "인용 메모"} {card.page ? `· p.${card.page}` : ""}
          </span>
          <button
            className={`icon-btn ${card.isBookmarked ? "saved" : ""}`}
            aria-label={card.isBookmarked ? "카드 북마크 해제" : "카드 북마크"}
            aria-pressed={!!card.isBookmarked}
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  api(`/cards/${card.id}`, {
                    method: "PATCH",
                    body: { isBookmarked: !card.isBookmarked },
                  }),
                "북마크를 변경했습니다.",
                { close: false },
              )
            }
          >
            {card.isBookmarked ? "★" : "☆"}
          </button>
        </div>
        <blockquote>{card.quote}</blockquote>
        {card.note && <p className="card-note">{card.note}</p>}
        <div className="chips">
          {(card.keywords || []).map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
        <footer>
          <button
            className="text-button source"
            onClick={async () => {
              if (!paper || paper.id !== card.paperId) {
                const opened = await openPaper(card.paperId);
                if (!opened) return;
              }
              setPage(card.page || 1);
            }}
          >
            {card.paperTitle || paper?.title || "원문 보기"} · p.
            {card.page || 1} ↗
          </button>
          <div className="row">
            <small>
              {card.creatorName} · {date(card.createdAt)}
            </small>
            <div>
              <button
                className="text-button"
                onClick={() => showModal({ type: "card", data: card })}
              >
                수정
              </button>
              <button
                className="text-button danger"
                onClick={() =>
                  showModal({
                    type: "delete",
                    label: "이 인용 카드",
                    path: `/cards/${card.id}`,
                  })
                }
              >
                삭제
              </button>
            </div>
          </div>
        </footer>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => go("papers")}>
          nonmoon<span>↗</span>
        </button>
        <div className="workspace">
          <label htmlFor="team-select">WORKSPACE</label>
          <select
            id="team-select"
            value={teamId}
            onChange={(e) => {
              detailRequest.current++;
              setLoading(false);
              setError("");
              setTeamId(e.target.value);
              setPapers([]);
              setCards([]);
              setMembers([]);
              setNotice("");
              setPaper(null);
              reset();
            }}
          >
            {!teams.length && <option value="">팀을 만들어 주세요</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            className="text-button"
            onClick={() => showModal({ type: "team" })}
          >
            ＋ 새 연구팀
          </button>
        </div>
        <nav aria-label="주 메뉴">
          <button
            className={view === "papers" ? "active" : ""}
            onClick={() => go("papers")}
          >
            <span>▤</span>논문 아카이브
          </button>
          <button
            className={view === "cards" ? "active" : ""}
            onClick={() => go("cards")}
          >
            <span>❝</span>인용 카드
          </button>
          <button
            className={view === "members" ? "active" : ""}
            onClick={() => go("members")}
          >
            <span>♧</span>팀 관리
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="small-leaf">✳</span>
          <p>
            흩어진 문장에서
            <br />
            연결되는 아이디어로.
          </p>
          <small>오늘의 발견을 기록하세요.</small>
        </div>
        <div className="profile">
          <span className="avatar">{user.name?.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button
            className="icon-btn"
            onClick={logout}
            disabled={busy}
            aria-label="로그아웃"
            title="로그아웃"
          >
            ↪
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            {activeTeam?.name || "나의 연구 공간"}{" "}
            <span className="crumb">
              /{" "}
              {paper
                ? "논문 읽기"
                : view === "papers"
                  ? "논문 아카이브"
                  : view === "cards"
                    ? "인용 카드"
                    : "팀 관리"}
            </span>
          </span>
          <span className="top-label">READ. THINK. CONNECT.</span>
        </header>
        <main id="main" tabIndex="-1">
          {notice && (
            <div className="notice" role="status">
              ✓ {notice}
              <button
                aria-label="알림 닫기"
                className="icon-btn"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {error && !modal && (
            <div className="error-banner" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() =>
                  paper
                    ? reloadDetail().catch((e) => setError(e.message))
                    : refresh()
                }
              >
                다시 시도
              </button>
            </div>
          )}
          {loading && (
            <div className="loading-bar" role="status">
              불러오는 중…
            </div>
          )}
          {!teamId ? (
            <Empty title="첫 연구 공간을 만들어 보세요">
              <button
                className="primary"
                onClick={() => showModal({ type: "team" })}
              >
                연구팀 만들기
              </button>
            </Empty>
          ) : paper ? (
            <>
              <div className="detail-heading">
                <button
                  className="text-button"
                  onClick={() => {
                    detailRequest.current++;
                    setLoading(false);
                    setError("");
                    setPaper(null);
                  }}
                >
                  ← 아카이브로
                </button>
                <div className="row">
                  <div>
                    <p className="eyebrow">
                      PAPER / {paper.year || "연도 미상"}
                    </p>
                    <h1>{paper.title}</h1>
                    <p className="muted">
                      {paper.author || "저자 미상"} · 업로드 {paper.uploader} ·{" "}
                      {date(paper.createdAt)}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => showModal({ type: "paper", data: paper })}
                  >
                    정보 수정
                  </button>
                </div>
              </div>
              <div className="reading-layout">
                <section className="pdf-section" aria-label="PDF 원문">
                  <div className="pdf-toolbar">
                    <span>{paper.fileName}</span>
                    <div>
                      <a
                        href={`/api/papers/${paper.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        새 창 ↗
                      </a>
                      <a
                        href={`/api/papers/${paper.id}/file`}
                        download={paper.fileName}
                      >
                        다운로드 ↓
                      </a>
                    </div>
                  </div>
                  <Suspense
                    fallback={<p role="status">PDF 뷰어를 준비하는 중…</p>}
                  >
                    <PdfReader
                      key={paper.id}
                      title={paper.title}
                      fileUrl={`/api/papers/${paper.id}/file`}
                      page={page}
                      onPageChange={setPage}
                    />
                  </Suspense>
                  <p className="fine">
                    PDF가 표시되지 않으면 새 창에서 열거나 다운로드하세요.
                  </p>
                  <div className="paper-abstract">
                    <h3>논문 정보</h3>
                    <p>{paper.abstract || "등록된 초록이 없습니다."}</p>
                    <div className="chips">
                      {paper.tags?.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="export-links">
                      <a
                        href={`/api/papers/${paper.id}/export?format=markdown`}
                      >
                        Markdown 내보내기 ↗
                      </a>
                      <a href={`/api/papers/${paper.id}/export?format=bibtex`}>
                        BibTeX 내보내기 ↗
                      </a>
                    </div>
                  </div>
                </section>
                <section className="research-panel">
                  <div className="tabs" role="tablist" aria-label="연구 노트">
                    <button
                      role="tab"
                      aria-selected={panel === "cards"}
                      onClick={() => setPanel("cards")}
                    >
                      인용 카드 <span>{paperCards.length}</span>
                    </button>
                    <button
                      role="tab"
                      aria-selected={panel === "summaries"}
                      onClick={() => setPanel("summaries")}
                    >
                      요약 <span>{summaries.length}</span>
                    </button>
                  </div>
                  {panel === "cards" ? (
                    <>
                      <div className="panel-intro">
                        <h2>생각을 남겨두세요</h2>
                        <p>중요한 문장과 내 해석을 함께 기록합니다.</p>
                        <button
                          className="primary full"
                          onClick={() => showModal({ type: "card" })}
                        >
                          ＋ 인용 카드 작성
                        </button>
                      </div>
                      {paperCards.length ? (
                        paperCards.map(renderCard)
                      ) : (
                        <Empty title="첫 문장을 기록하세요">
                          원문의 인용문과 페이지를 남겨 다시 찾아보세요.
                        </Empty>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="panel-intro">
                        <h2>핵심을 다시 살펴보세요</h2>
                        <p>
                          {summaryMode === "openai"
                            ? "AI가 원문을 바탕으로 요약합니다. 잘못된 해석이나 누락이 있을 수 있으므로 원문을 확인하세요."
                            : "원문에서 문장을 추출합니다. AI가 작성한 요약이 아니며, 문맥을 원문에서 확인해 주세요."}
                        </p>
                        <button
                          className="primary full"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () =>
                                api(`/papers/${paper.id}/summaries`, {
                                  method: "POST",
                                  body: {},
                                }),
                              "요약을 저장했습니다.",
                              { close: false },
                            )
                          }
                        >
                          {busy
                            ? "요약 처리 중…"
                            : summaryMode === "openai"
                              ? "AI 요약 만들기"
                              : "원문 기반 요약 만들기"}
                        </button>
                        <button
                          className="text-button full"
                          onClick={() => showModal({ type: "summary" })}
                        >
                          직접 요약 작성
                        </button>
                      </div>
                      {summaries.length ? (
                        summaries.map((s) => (
                          <article className="summary-card" key={s.id}>
                            <div className="row">
                              <span className="tag">
                                {s.mode === "manual"
                                  ? "직접 작성"
                                  : s.mode === "openai"
                                    ? "AI 요약"
                                    : "원문 문장 추출"}
                              </span>
                              <small>{date(s.createdAt)}</small>
                            </div>
                            <p className="summary-text">{s.summary}</p>
                            <div className="chips">
                              {s.sourcePages?.map((p) => (
                                <button key={p} onClick={() => setPage(p)}>
                                  p.{p} ↗
                                </button>
                              ))}
                            </div>
                            <footer className="row">
                              <small>{s.creatorName}</small>
                              <div>
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    showModal({ type: "summary", data: s })
                                  }
                                >
                                  수정
                                </button>
                                <button
                                  className="text-button danger"
                                  onClick={() =>
                                    showModal({
                                      type: "delete",
                                      label: "이 요약",
                                      path: `/summaries/${s.id}`,
                                    })
                                  }
                                >
                                  삭제
                                </button>
                              </div>
                            </footer>
                          </article>
                        ))
                      ) : (
                        <Empty title="아직 요약이 없습니다">
                          직접 작성하거나 PDF의 주요 문장을 추출하세요.
                        </Empty>
                      )}
                    </>
                  )}
                </section>
              </div>
            </>
          ) : view === "members" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">BETTER TOGETHER</p>
                  <h1>함께하는 연구팀</h1>
                  <p>
                    {activeTeam?.description ||
                      "같은 공간에서 자료와 발견을 공유합니다."}
                  </p>
                </div>
                {activeTeam?.role === "owner" && (
                  <div className="row">
                    <button
                      className="text-button danger"
                      onClick={() =>
                        showModal({
                          type: "deleteTeam",
                          label: `「${activeTeam.name}」 연구팀`,
                        })
                      }
                    >
                      연구팀 삭제
                    </button>
                    <button
                      className="primary"
                      onClick={() => showModal({ type: "member" })}
                    >
                      ＋ 팀원 추가
                    </button>
                  </div>
                )}
              </div>
              <section className="table-wrap">
                <table>
                  <caption className="sr-only">연구팀 구성원</caption>
                  <thead>
                    <tr>
                      <th>팀원</th>
                      <th>이메일</th>
                      <th>역할</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.name}</strong>
                        </td>
                        <td>{m.email}</td>
                        <td>
                          <span className="tag">
                            {m.role === "owner" ? "팀 소유자" : "팀원"}
                          </span>
                        </td>
                        <td>
                          {activeTeam?.role === "owner" &&
                            m.role !== "owner" && (
                              <button
                                className="text-button danger"
                                onClick={() =>
                                  showModal({
                                    type: "delete",
                                    label: `${m.name} 팀원의 접근 권한`,
                                    path: `/teams/${teamId}/members/${m.id}`,
                                  })
                                }
                              >
                                제거
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <p className="fine">
                팀원 추가는 이미 가입된 계정의 이메일로 진행합니다.
              </p>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR RESEARCH, CONNECTED</p>
                  <h1>
                    {view === "papers"
                      ? "논문 아카이브"
                      : "생각을 연결하는 인용 카드"}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>
                    {view === "papers"
                      ? "읽고 싶은 논문부터 새로운 발견까지, 차곡차곡 모아보세요."
                      : "기억하고 싶은 문장과 연구의 실마리를 다시 찾아보세요."}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => showModal({ type: "paper" })}
                >
                  ＋ 논문 추가
                </button>
              </div>
              <div className="stats">
                <div>
                  <span>현재 논문</span>
                  <strong>
                    {papers.length.toString().padStart(2, "0")}
                    <i>↗</i>
                  </strong>
                  <small>검색 조건에 맞는 연구 자료</small>
                </div>
                <div>
                  <span>인용 카드</span>
                  <strong>
                    {cards.length.toString().padStart(2, "0")}
                    <i>❝</i>
                  </strong>
                  <small>문장에 담긴 아이디어</small>
                </div>
                <div>
                  <span>함께하는 연구자</span>
                  <strong>
                    {members.length.toString().padStart(2, "0")}
                    <i>♧</i>
                  </strong>
                  <small>같은 질문을 탐구하는 동료</small>
                </div>
              </div>
              <section className="archive-section">
                <div className="archive-header">
                  <h2>
                    {view === "papers" ? "나의 연구 서가" : "인용 카드 모음"}{" "}
                    <span>
                      {view === "papers" ? papers.length : cards.length}
                    </span>
                  </h2>
                  <div className="export-links">
                    <a href={`/api/teams/${teamId}/export?format=json`}>JSON</a>
                    <a href={`/api/teams/${teamId}/export?format=csv`}>CSV</a>
                    <a href={`/api/teams/${teamId}/export?format=bibtex`}>
                      BibTeX ↗
                    </a>
                  </div>
                </div>
                <div className="filters">
                  <label className="search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label={
                        view === "papers" ? "논문 검색" : "인용 카드 검색"
                      }
                      placeholder={
                        view === "papers"
                          ? "제목, 저자, 키워드로 검색"
                          : "인용문, 주제, 메모로 검색"
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <input
                    aria-label="저자 필터"
                    placeholder="저자"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                  <input
                    aria-label="연도 필터"
                    placeholder="연도"
                    inputMode="numeric"
                    maxLength={4}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                  <select
                    aria-label="정렬"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">최근 추가순</option>
                    <option value="oldest">오래된순</option>
                    {view === "papers" && <option value="title">제목순</option>}
                  </select>
                </div>
                <div className="filter-bottom">
                  <div>
                    <button
                      className={`filter-chip ${bookmarked ? "chosen" : ""}`}
                      aria-pressed={bookmarked}
                      onClick={() => setBookmarked(!bookmarked)}
                    >
                      ☆ 북마크만
                    </button>
                    {(query || author || year || bookmarked) && (
                      <button className="text-button" onClick={reset}>
                        필터 초기화
                      </button>
                    )}
                  </div>
                  {view === "papers" && (
                    <div className="view-toggle">
                      <button
                        aria-label="카드형 보기"
                        aria-pressed={layout === "grid"}
                        onClick={() => setLayout("grid")}
                      >
                        ▦
                      </button>
                      <button
                        aria-label="목록형 보기"
                        aria-pressed={layout === "table"}
                        onClick={() => setLayout("table")}
                      >
                        ☰
                      </button>
                    </div>
                  )}
                </div>
                {view === "cards" ? (
                  cards.length ? (
                    <div className="card-grid">{cards.map(renderCard)}</div>
                  ) : (
                    <Empty title="아직 연결된 문장이 없습니다">
                      논문을 열어 카드를 작성하거나 검색 조건을 바꿔보세요.
                    </Empty>
                  )
                ) : papers.length ? (
                  layout === "grid" ? (
                    <div className="paper-grid">
                      {papers.map((p, index) => (
                        <article className="paper-tile" key={p.id}>
                          <div className="paper-cover">
                            <div className="cover-lines">
                              <span>NONMOON / RESEARCH PAPER</span>
                              <strong>{p.title}</strong>
                              <p>{p.author}</p>
                              <i />
                              <i />
                              <i />
                            </div>
                            <span className="paper-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <button
                              aria-label={
                                p.isBookmarked
                                  ? `${p.title} 북마크 해제`
                                  : `${p.title} 북마크`
                              }
                              aria-pressed={!!p.isBookmarked}
                              className={`bookmark icon-btn ${p.isBookmarked ? "saved" : ""}`}
                              disabled={busy}
                              onClick={() =>
                                run(
                                  () =>
                                    api(`/papers/${p.id}`, {
                                      method: "PATCH",
                                      body: { isBookmarked: !p.isBookmarked },
                                    }),
                                  "북마크를 변경했습니다.",
                                  { close: false },
                                )
                              }
                            >
                              {p.isBookmarked ? "★" : "☆"}
                            </button>
                          </div>
                          <div className="tile-body">
                            <div className="row">
                              <span className="tag">
                                {p.tags?.[0] || "Research"}
                              </span>
                              <small>{p.year || "연도 미상"}</small>
                            </div>
                            <h3>
                              <button onClick={() => openPaper(p.id)}>
                                {p.title}
                              </button>
                            </h3>
                            <p className="muted">{p.author || "저자 미상"}</p>
                            <footer>
                              <span>❝ 카드 {p.cardCount || 0}</span>
                              <span>{date(p.createdAt)}</span>
                            </footer>
                            <div className="tile-actions">
                              <button
                                className="text-button"
                                onClick={() =>
                                  showModal({ type: "paper", data: p })
                                }
                              >
                                정보 수정
                              </button>
                              <button
                                className="text-button danger"
                                onClick={() =>
                                  showModal({
                                    type: "delete",
                                    label: `「${p.title}」 및 연결된 카드와 요약`,
                                    path: `/papers/${p.id}`,
                                  })
                                }
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <caption className="sr-only">논문 목록</caption>
                        <thead>
                          <tr>
                            <th>논문 제목</th>
                            <th>저자</th>
                            <th>연도</th>
                            <th>카드</th>
                            <th>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {papers.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <button
                                  className="table-title"
                                  onClick={() => openPaper(p.id)}
                                >
                                  {p.title}
                                </button>
                              </td>
                              <td>{p.author}</td>
                              <td>{p.year || "—"}</td>
                              <td>{p.cardCount || 0}</td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    showModal({ type: "paper", data: p })
                                  }
                                >
                                  수정
                                </button>
                                <button
                                  className="text-button danger"
                                  onClick={() =>
                                    showModal({
                                      type: "delete",
                                      label: `「${p.title}」 및 연결된 카드와 요약`,
                                      path: `/papers/${p.id}`,
                                    })
                                  }
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <Empty
                    title={
                      query || author || year || bookmarked
                        ? "검색 결과가 없습니다"
                        : "연구 서가를 채워보세요"
                    }
                  >
                    {query || author || year || bookmarked
                      ? "검색어와 필터를 조정해 보세요."
                      : "PDF를 추가하면 인용 카드와 요약을 함께 관리할 수 있어요."}
                  </Empty>
                )}
              </section>
              <footer className="page-footer">
                <span>Nonmoon — 작은 기록이 다음 연구로 이어집니다.</span>
                <span>RESEARCH WORKSPACE</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal && (
        <Modal
          title={
            {
              team: "새 연구팀 만들기",
              member: "팀원 추가",
              paper: modal.data ? "논문 정보 수정" : "새 논문 추가",
              card: modal.data ? "인용 카드 수정" : "인용 카드 작성",
              summary: modal.data ? "요약 수정" : "직접 요약 작성",
              delete: "삭제 확인",
              deleteTeam: "연구팀 삭제 확인",
            }[modal.type]
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          {modal.type === "delete" || modal.type === "deleteTeam" ? (
            <>
              <p>{modal.label}을(를) 삭제할까요?</p>
              <p className="muted">
                {modal.type === "deleteTeam"
                  ? "모든 팀원의 접근 권한과 공유 논문, PDF 파일, 인용 카드, 요약이 함께 삭제됩니다. 삭제하면 되돌릴 수 없습니다."
                  : "삭제하면 되돌릴 수 없습니다."}
              </p>
              {modalError}
              <div className="form-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  취소
                </button>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={() =>
                    modal.type === "deleteTeam"
                      ? deleteTeam()
                      : run(
                          async () => {
                            await api(modal.path, { method: "DELETE" });
                            if (modal.path === `/papers/${paper?.id}`)
                              setPaper(null);
                          },
                          "삭제했습니다.",
                          { detail: modal.path !== `/papers/${paper?.id}` },
                        )
                  }
                >
                  {busy ? "삭제 중…" : "삭제하기"}
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = fields(e.currentTarget);
                if (modal.type === "team")
                  run(
                    async () => {
                      const t = await api("/teams", {
                        method: "POST",
                        body: data,
                      });
                      await hydrate();
                      setTeamId(String(t.id));
                      setPaper(null);
                    },
                    "새 연구팀을 만들었습니다.",
                    { detail: false },
                  );
                if (modal.type === "member")
                  run(
                    () =>
                      api(`/teams/${teamId}/members`, {
                        method: "POST",
                        body: data,
                      }),
                    "팀원을 추가했습니다.",
                  );
                if (modal.type === "paper") {
                  const body = modal.data
                    ? {
                        ...data,
                        tags: data.tags
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      }
                    : new FormData(e.currentTarget);
                  run(
                    () =>
                      api(
                        modal.data
                          ? `/papers/${modal.data.id}`
                          : `/teams/${teamId}/papers`,
                        { method: modal.data ? "PATCH" : "POST", body },
                      ),
                    "논문을 저장했습니다.",
                  );
                }
                if (modal.type === "card")
                  run(
                    () =>
                      api(
                        modal.data
                          ? `/cards/${modal.data.id}`
                          : `/papers/${paper.id}/cards`,
                        {
                          method: modal.data ? "PATCH" : "POST",
                          body: {
                            ...data,
                            page: data.page ? Number(data.page) : null,
                            keywords: data.keywords
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          },
                        },
                      ),
                    "인용 카드를 저장했습니다.",
                  );
                if (modal.type === "summary")
                  run(
                    () =>
                      api(
                        modal.data
                          ? `/summaries/${modal.data.id}`
                          : `/papers/${paper.id}/summaries`,
                        { method: modal.data ? "PATCH" : "POST", body: data },
                      ),
                    "요약을 저장했습니다.",
                  );
              }}
            >
              {modal.type === "team" && (
                <>
                  <Field
                    label="연구팀 이름"
                    name="name"
                    required
                    maxLength={100}
                  />
                  <Field label="소개" name="description" maxLength={500} />
                </>
              )}
              {modal.type === "member" && (
                <>
                  <p className="muted">
                    이미 가입한 동료의 이메일을 입력하세요.
                  </p>
                  <Field label="이메일" name="email" type="email" required />
                </>
              )}
              {modal.type === "paper" && (
                <>
                  {!modal.data && (
                    <Field label="PDF 파일">
                      <input
                        name="file"
                        type="file"
                        accept="application/pdf,.pdf"
                        required
                      />
                      <small>
                        텍스트가 포함된 PDF는 원문 문장 추출에 사용할 수
                        있습니다.
                      </small>
                    </Field>
                  )}
                  <Field
                    label="논문 제목"
                    name="title"
                    required
                    maxLength={300}
                    defaultValue={modal.data?.title}
                  />
                  <div className="form-grid">
                    <Field
                      label="저자"
                      name="author"
                      maxLength={200}
                      defaultValue={modal.data?.author}
                    />
                    <Field
                      label="발행 연도"
                      name="year"
                      type="number"
                      min="1000"
                      max={new Date().getFullYear() + 1}
                      defaultValue={modal.data?.year}
                    />
                  </div>
                  <Field
                    label="태그 (쉼표로 구분)"
                    name="tags"
                    maxLength={500}
                    defaultValue={modal.data?.tags?.join(", ")}
                  />
                  <Field label="초록 / 소개">
                    <textarea
                      name="abstract"
                      rows={4}
                      maxLength={10000}
                      defaultValue={modal.data?.abstract}
                    />
                  </Field>
                </>
              )}
              {modal.type === "card" && (
                <>
                  <Field label="원문 인용문">
                    <textarea
                      name="quote"
                      required
                      rows={4}
                      maxLength={10000}
                      defaultValue={modal.data?.quote}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field
                      label="주제"
                      name="topic"
                      maxLength={200}
                      defaultValue={modal.data?.topic}
                    />
                    <Field
                      label="원문 페이지"
                      name="page"
                      type="number"
                      required
                      min="1"
                      max={
                        paper?.pageCount ||
                        papers.find((p) => p.id === modal.data?.paperId)
                          ?.pageCount ||
                        300
                      }
                      defaultValue={modal.data?.page || page}
                    />
                  </div>
                  <Field label="내 메모">
                    <textarea
                      name="note"
                      rows={3}
                      maxLength={10000}
                      defaultValue={modal.data?.note}
                    />
                  </Field>
                  <Field
                    label="키워드 (쉼표로 구분)"
                    name="keywords"
                    maxLength={500}
                    defaultValue={modal.data?.keywords?.join(", ")}
                  />
                </>
              )}
              {modal.type === "summary" && (
                <Field label="요약 내용">
                  <textarea
                    name="summary"
                    required
                    rows={12}
                    maxLength={20000}
                    defaultValue={modal.data?.summary}
                  />
                </Field>
              )}
              {modalError}
              {actions}
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
