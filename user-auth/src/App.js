// user-auth/src/App.js
// Auth demo styled to match the main client-react app.
import React, { useState, useEffect } from "react";
import "./App.css";
import { palette, typography } from "./theme";
import PaperListPage from "./papers/PaperListPage"; //논문 리스트 페이지 컴포넌트(예슬)


const API_BASE = "http://localhost:3001";

const shellStyle = {
  minHeight: "100vh",
  padding: "3rem 1.5rem",
  background: palette.gradient,
  fontFamily: typography.fontFamily,
};

const panelStyle = (isNarrow = false) => ({
  width: "100%",
  maxWidth: isNarrow ? 520 : 960,
  margin: "0 auto",
  padding: isNarrow ? "2rem 2.25rem" : "2rem",
  borderRadius: 24,
  background: palette.panelBg,
  border: `1px solid ${palette.panelBorder}`,
  boxShadow: palette.panelShadow,
  backdropFilter: "blur(8px)",
});

const sectionCardStyle = {
  background: "rgba(255, 255, 255, 0.96)",
  border: `1px solid ${palette.panelBorder}`,
  borderRadius: 14,
  boxShadow: "0 15px 35px rgba(15, 23, 42, 0.08)",
  padding: "1.25rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.85rem 1rem",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  fontSize: "0.95rem",
};

const primaryButtonStyle = (disabled = false) => ({
  border: "none",
  borderRadius: 999,
  padding: "0.85rem 1.4rem",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  background: "linear-gradient(135deg, #4f46e5, #6366f1)",
  color: "#fff",
  boxShadow: "0 12px 24px rgba(79, 70, 229, 0.25)",
});

// Login
function Login({ onModeChange, onLoginSuccess }) {
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = { userId, userPassword };

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const json = await res.json();

      if (json.isLogin) {
        alert("로그인이 완료되었습니다.");
        onLoginSuccess();
      } else {
        alert(json.message || "로그인에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={shellStyle}>
      <div style={panelStyle(true)}>
        <div className="panel-header">
          <h1 className="panel-title">로그인</h1>
          <p className="panel-subtitle">
            연구 카드 관리 앱과 동일한 톤으로 맞춘 로그인 화면입니다.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">아이디</label>
            <input
              className="input"
              style={inputStyle}
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label">비밀번호</label>
            <input
              className="input"
              style={inputStyle}
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="button primary"
            style={primaryButtonStyle(loading)}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={{ marginTop: "0.75rem" }}>
          <button className="link-button" onClick={() => onModeChange("SIGNUP")}>
            아직 회원이 아니신가요? 회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

// Signup
function Signup({ onModeChange }) {
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userPassword2, setUserPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userPassword !== userPassword2) {
      alert("비밀번호가 서로 다릅니다.");
      return;
    }

    const userData = { userId, userPassword, userPassword2 };

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const json = await res.json();

      if (json.isSuccess) {
        alert("회원가입이 완료되었습니다. 이제 로그인해 주세요.");
        onModeChange("LOGIN");
      } else {
        alert(json.message || "회원가입에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={shellStyle}>
      <div style={panelStyle(true)}>
        <div className="panel-header">
          <h1 className="panel-title">회원가입</h1>
          <p className="panel-subtitle">
            동일한 스타일의 입력창과 버튼으로 가입 절차를 제공합니다.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">아이디</label>
            <input
              className="input"
              style={inputStyle}
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label">비밀번호</label>
            <input
              className="input"
              style={inputStyle}
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label">비밀번호 확인</label>
            <input
              className="input"
              style={inputStyle}
              type="password"
              value={userPassword2}
              onChange={(e) => setUserPassword2(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="button primary"
            style={primaryButtonStyle(loading)}
            disabled={loading}
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <div style={{ marginTop: "0.75rem" }}>
          <button className="link-button" onClick={() => onModeChange("LOGIN")}>
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// Team / Group Manager
function TeamManager({ onLogout, onTeamComplete }) { 
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberGroupId, setNewMemberGroupId] = useState("");

  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/members`);
      const json = await res.json();
      setMembers(json);
    } catch (err) {
      console.error(err);
      alert("멤버 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/groups`);
      const json = await res.json();
      setGroups(json);
    } catch (err) {
      console.error(err);
      alert("그룹 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("그룹 이름을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      const json = await res.json();
      if (json.isSuccess) {
        setNewGroupName("");
        fetchGroups();
      } else {
        alert(json.message || "그룹 생성에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("그룹 생성 중 오류가 발생했습니다.");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("멤버 이름을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName,
          groupId: newMemberGroupId || null,
        }),
      });

      const json = await res.json();
      if (json.isSuccess) {
        setNewMemberName("");
        setNewMemberGroupId("");
        fetchMembers();
      } else {
        alert(json.message || "멤버 추가에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("멤버 추가 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`${API_BASE}/members/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.isSuccess) {
        fetchMembers();
      } else {
        alert(json.message || "삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("멤버 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleChangeMemberGroup = async (id, groupId) => {
    try {
      const res = await fetch(`${API_BASE}/members/${id}/group`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId || null }),
      });

      const json = await res.json();
      if (json.isSuccess) {
        fetchMembers();
      } else {
        alert(json.message || "그룹 변경에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("그룹 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={shellStyle}>
      <div style={panelStyle(false)}>
        <div className="toolbar">
          <div className="panel-header">
            <h1 className="panel-title">팀원 / 프로젝트 그룹 관리</h1>
            <p className="panel-subtitle">
              메인 앱의 카드 패널 스타일을 적용해 통일된 경험을 제공합니다.
            </p>
          </div>
          <button
            className="button primary"
            style={primaryButtonStyle(false)}
            onClick={onLogout}
          >
            로그아웃
          </button>


          
          <button 
            className="button primary"
            style={primaryButtonStyle(false)}
            onClick={onTeamComplete}
          >
            다음으로 (논문 관리)
          </button>
          

        </div>

        <div className="stack">
          <div className="card section" style={sectionCardStyle}>
            <h2 className="section-title">프로젝트 그룹 생성</h2>
            <div className="muted">새 그룹을 만들고 멤버를 연결하세요.</div>
            <form onSubmit={handleAddGroup} className="form">
              <div className="field">
                <label className="label">그룹 이름</label>
                <input
                  className="input"
                  style={inputStyle}
                  type="text"
                  placeholder="예: 연구팀 A"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="button primary"
                style={primaryButtonStyle(false)}
              >
                그룹 추가
              </button>
            </form>
          </div>

          <div className="card section" style={sectionCardStyle}>
            <h2 className="section-title">멤버 추가</h2>
            <div className="muted">멤버 이름과 배정할 그룹을 선택하세요.</div>
            <form onSubmit={handleAddMember} className="form">
              <div className="field">
                <label className="label">멤버 이름</label>
                <input
                  className="input"
                  style={inputStyle}
                  type="text"
                  placeholder="예: 홍길동"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">그룹 선택 (선택)</label>
                <select
                  className="input"
                  style={inputStyle}
                  value={newMemberGroupId}
                  onChange={(e) => setNewMemberGroupId(e.target.value)}
                >
                  <option value="">그룹 없음</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="button primary"
                style={primaryButtonStyle(false)}
              >
                멤버 추가
              </button>
            </form>
          </div>

          <div className="card section" style={sectionCardStyle}>
            <h2 className="section-title">멤버 목록</h2>
            <div className="muted">멤버 정보를 보고 그룹을 변경하거나 삭제하세요.</div>
            <div className="divider" />
            {members.length === 0 ? (
              <p className="muted">등록된 멤버가 없습니다.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>그룹</th>
                    <th>그룹 변경</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.groupName || "-"}</td>
                      <td>
                        <select
                          className="input"
                          style={{ ...inputStyle, padding: "0.6rem" }}
                          value={m.groupId || ""}
                          onChange={(e) =>
                            handleChangeMemberGroup(m.id, e.target.value || null)
                          }
                        >
                          <option value="">그룹 없음</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="button ghost"
                          style={{ padding: "0.55rem 0.85rem", borderRadius: 12 }}
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
          </div>
        </div>
      </div>
    </div>
  );
}

// App
function App() {

  const [mode, setMode] = useState("LOGIN");

  
  const handleLoginSuccess = () => {
    setMode("TEAM");
  };

 // 페이지 이동
  const handleTeamComplete = () => {
    setMode("PAPERS");
  };

  
  const handleLogout = () => {
    setMode("LOGIN");
  };

  
  if (mode === "LOGIN") {
    return <Login onModeChange={setMode} onLoginSuccess={handleLoginSuccess} />;
  }

  if (mode === "SIGNUP") {
    return <Signup onModeChange={setMode} />;
  }

  if (mode === "TEAM") {
    return <TeamManager 
      onLogout={handleLogout} 
      onTeamComplete={handleTeamComplete}  // prop 전달
    />;
  }

   // PaperListPage 렌더링 모드 추가 
  if (mode === "PAPERS") {
    return <PaperListPage onLogout={handleLogout} />;
  }

  return null;
}

export default App;
