// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      body: data,
    };
  }

  return data;
}

// ------------------ 로그인 컴포넌트 ------------------
function Login({ onModeChange, onLoginSuccess }) {
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!userId.trim() || !userPassword.trim()) {
      setErrorMsg("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const body = await request("/login", {
        method: "POST",
        body: JSON.stringify({ userId, userPassword }),
      });

      if (!body.success) {
        setErrorMsg(body.message || "로그인에 실패했습니다.");
        return;
      }

      setSuccessMsg(body.message || "로그인 성공!");
      onLoginSuccess(body.data);
    } catch (err) {
      const message =
        err?.body?.message || "로그인 중 알 수 없는 오류가 발생했습니다.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1 className="card-title">로그인</h1>
        <p className="card-subtitle">논문 카드 서비스에 접속하려면 로그인하세요.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">
            아이디
            <input
              className="input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="아이디를 입력하세요"
            />
          </label>

          <label className="form-label">
            비밀번호
            <input
              className="input"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </label>

          {errorMsg && <div className="feedback error">{errorMsg}</div>}
          {successMsg && <div className="feedback success">{successMsg}</div>}

          <button
            type="submit"
            className="button primary"
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <button
          className="link-button"
          type="button"
          onClick={() => onModeChange("SIGNUP")}
        >
          아직 회원이 아니신가요? 회원가입
        </button>
      </div>
    </div>
  );
}

// ------------------ 회원가입 컴포넌트 ------------------
function Signup({ onModeChange }) {
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userPassword2, setUserPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!userId.trim() || !userPassword.trim() || !userPassword2.trim()) {
      setErrorMsg("모든 항목을 입력해 주세요.");
      return;
    }
    if (userPassword !== userPassword2) {
      setErrorMsg("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const body = await request("/signin", {
        method: "POST",
        body: JSON.stringify({ userId, userPassword, userPassword2 }),
      });

      if (!body.success) {
        setErrorMsg(body.message || "회원가입에 실패했습니다.");
        return;
      }

      setSuccessMsg(body.message || "회원가입 성공!");
      // 잠깐 보여주고 로그인 화면으로
      setTimeout(() => onModeChange("LOGIN"), 800);
    } catch (err) {
      const message =
        err?.body?.message || "회원가입 중 알 수 없는 오류가 발생했습니다.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1 className="card-title">회원가입</h1>
        <p className="card-subtitle">논문 카드 서비스를 이용하기 위한 계정을 만듭니다.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">
            아이디<span className="required">*</span>
            <input
              className="input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="3~20자, 영문/숫자"
            />
          </label>

          <label className="form-label">
            비밀번호<span className="required">*</span>
            <input
              className="input"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="8자 이상 비밀번호"
            />
          </label>

          <label className="form-label">
            비밀번호 확인<span className="required">*</span>
            <input
              className="input"
              type="password"
              value={userPassword2}
              onChange={(e) => setUserPassword2(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
            />
          </label>

          {errorMsg && <div className="feedback error">{errorMsg}</div>}
          {successMsg && <div className="feedback success">{successMsg}</div>}

          <button
            type="submit"
            className="button primary"
            disabled={loading}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <button
          className="link-button"
          type="button"
          onClick={() => onModeChange("LOGIN")}
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
}

// ------------------ 팀/그룹 관리 컴포넌트 ------------------
function TeamManager({ onLogout }) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberGroupId, setNewMemberGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (message) {
      setTimeout(() => setFeedback({ type: "", message: "" }), 2000);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const body = await request("/groups");
      setGroups(body.data || []);
    } catch (err) {
      const msg = err?.body?.message || "그룹 목록을 불러오는 중 오류가 발생했습니다.";
      showFeedback("error", msg);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const body = await request("/members");
      setMembers(body.data || []);
    } catch (err) {
      const msg =
        err?.body?.message || "팀원 목록을 불러오는 중 오류가 발생했습니다.";
      showFeedback("error", msg);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadMembers();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showFeedback("error", "그룹 이름을 입력해 주세요.");
      return;
    }

    setActionLoading(true);
    try {
      const body = await request("/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName }),
      });

      if (!body.success) {
        showFeedback("error", body.message || "그룹 생성에 실패했습니다.");
        return;
      }

      showFeedback("success", body.message || "그룹이 생성되었습니다.");
      setNewGroupName("");
      await loadGroups();
    } catch (err) {
      const status = err?.status;
      const msg =
        err?.body?.message ||
        (status === 409
          ? "이미 존재하는 그룹입니다."
          : "그룹 생성 중 오류가 발생했습니다.");
      showFeedback("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showFeedback("error", "팀원 이름을 입력해 주세요.");
      return;
    }

    setActionLoading(true);
    try {
      const body = await request("/members", {
        method: "POST",
        body: JSON.stringify({
          name: newMemberName,
          groupId: newMemberGroupId || null,
        }),
      });

      if (!body.success) {
        showFeedback("error", body.message || "팀원 추가에 실패했습니다.");
        return;
      }

      showFeedback("success", body.message || "팀원이 추가되었습니다.");
      setNewMemberName("");
      setNewMemberGroupId("");
      await loadMembers();
    } catch (err) {
      const status = err?.status;
      const msg =
        err?.body?.message ||
        (status === 409
          ? "해당 그룹에 이미 같은 이름의 팀원이 있습니다."
          : "팀원 추가 중 오류가 발생했습니다.");
      showFeedback("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("정말로 이 팀원을 삭제하시겠습니까?")) return;

    setActionLoading(true);
    try {
      const body = await request(`/members/${memberId}`, {
        method: "DELETE",
      });

      if (!body.success) {
        showFeedback("error", body.message || "팀원 삭제에 실패했습니다.");
        return;
      }

      showFeedback("success", body.message || "팀원이 삭제되었습니다.");
      await loadMembers();
    } catch (err) {
      const msg =
        err?.body?.message || "팀원 삭제 중 알 수 없는 오류가 발생했습니다.";
      showFeedback("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeMemberGroup = async (memberId, groupId) => {
    const confirmMsg = groupId
      ? "선택한 그룹으로 팀원을 이동하시겠습니까?"
      : "팀원을 어떤 그룹에도 속하지 않도록 하시겠습니까?";

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const body = await request(`/members/${memberId}/group`, {
        method: "PUT",
        body: JSON.stringify({ groupId }),
      });

      if (!body.success) {
        showFeedback("error", body.message || "그룹 변경에 실패했습니다.");
        return;
      }

      showFeedback("success", body.message || "그룹이 변경되었습니다.");
      await loadMembers();
    } catch (err) {
      const msg =
        err?.body?.message || "그룹 변경 중 알 수 없는 오류가 발생했습니다.";
      showFeedback("error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await request("/logout", { method: "POST" });
    } catch (err) {
      // 로그아웃 실패는 크게 중요하지 않으므로 로깅만
      console.error("LOGOUT ERROR", err);
    } finally {
      onLogout();
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card wide">
        <header className="card-header">
          <div>
            <h1 className="card-title">팀/프로젝트 그룹 관리</h1>
            <p className="card-subtitle">
              논문 카드 프로젝트에서 사용할 팀과 프로젝트 그룹을 관리합니다.
            </p>
          </div>
          <button className="button ghost" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        {feedback.message && (
          <div
            className={
              feedback.type === "error"
                ? "feedback banner error"
                : "feedback banner success"
            }
          >
            {feedback.message}
          </div>
        )}

        <div className="grid">
          <section className="section">
            <h2 className="section-title">프로젝트 그룹</h2>

            <form className="form-inline" onSubmit={handleCreateGroup}>
              <input
                className="input"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="새 그룹 이름"
              />
              <button
                className="button primary"
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? "처리 중..." : "그룹 생성"}
              </button>
            </form>

            {loadingGroups ? (
              <div className="placeholder">그룹 목록을 불러오는 중...</div>
            ) : groups.length === 0 ? (
              <div className="placeholder">아직 생성된 그룹이 없습니다.</div>
            ) : (
              <ul className="list">
                {groups.map((g) => (
                  <li key={g.id} className="list-item">
                    <span className="list-name">{g.name}</span>
                    <span className="list-meta">ID: {g.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2 className="section-title">팀원</h2>

            <form className="form-inline" onSubmit={handleCreateMember}>
              <input
                className="input"
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="팀원 이름"
              />
              <select
                className="input"
                value={newMemberGroupId}
                onChange={(e) => setNewMemberGroupId(e.target.value)}
              >
                <option value="">그룹 선택 (선택)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (ID: {g.id})
                  </option>
                ))}
              </select>
              <button
                className="button primary"
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? "처리 중..." : "팀원 추가"}
              </button>
            </form>

            {loadingMembers ? (
              <div className="placeholder">팀원 목록을 불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className="placeholder">아직 등록된 팀원이 없습니다.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>이름</th>
                    <th>그룹</th>
                    <th>설정</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>{m.name}</td>
                      <td>
                        <select
                          className="input input-sm"
                          value={m.groupId || ""}
                          onChange={(e) =>
                            handleChangeMemberGroup(
                              m.id,
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        >
                          <option value="">(없음)</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {m.groupId &&
                          !groups.some((g) => g.id === m.groupId) && (
                            <div className="field-warning">
                              유효하지 않은 groupId 입니다. 그룹 목록을 확인하세요.
                            </div>
                          )}
                      </td>
                      <td>
                        <button
                          className="button danger button-sm"
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleDeleteMember(m.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ------------------ 루트 컴포넌트 ------------------
function App() {
  const [mode, setMode] = useState("LOGIN"); // LOGIN | SIGNUP | TEAM
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userInfo) => {
    setUser(userInfo);
    setMode("TEAM");
  };

  const handleLogout = () => {
    setUser(null);
    setMode("LOGIN");
  };

  if (mode === "LOGIN") {
    return (
      <Login
        onModeChange={setMode}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (mode === "SIGNUP") {
    return <Signup onModeChange={setMode} />;
  }

  return <TeamManager onLogout={handleLogout} />;
}

export default App;
