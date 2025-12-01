// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:3001";

// ------------------ 로그인 컴포넌트 ------------------
function Login({ onModeChange, onLoginSuccess }) {
  const [userId, setUserId] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userData = { userId, userPassword };

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const json = await res.json();

      if (json.isLogin) {
        alert("로그인 성공!");
        onLoginSuccess(); // 🔵 로그인 성공하면 팀관리 화면으로 전환
      } else {
        alert(json.message || "로그인 실패 ㅠㅠ");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1 className="title">로그인</h1>
        <form onSubmit={handleSubmit} className="form">
          <label className="label">
            아이디
            <input
              className="input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </label>

          <label className="label">
            비밀번호
            <input
              className="input"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="button primary">
            로그인
          </button>
        </form>

        <button className="link-button" onClick={() => onModeChange("SIGNUP")}>
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userPassword !== userPassword2) {
      alert("비밀번호가 서로 다릅니다.");
      return;
    }

    const userData = { userId, userPassword, userPassword2 };

    try {
      const res = await fetch(`${API_BASE}/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const json = await res.json();

      if (json.isSuccess) {
        alert("회원가입 성공! 이제 로그인 해주세요.");
        onModeChange("LOGIN");
      } else {
        alert(json.message || "회원가입 실패 ㅠㅠ");
      }
    } catch (err) {
      console.error(err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1 className="title">회원가입</h1>
        <form onSubmit={handleSubmit} className="form">
          <label className="label">
            아이디
            <input
              className="input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </label>

          <label className="label">
            비밀번호
            <input
              className="input"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </label>

          <label className="label">
            비밀번호 재확인
            <input
              className="input"
              type="password"
              value={userPassword2}
              onChange={(e) => setUserPassword2(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="button primary">
            제출
          </button>
        </form>

        <button className="link-button" onClick={() => onModeChange("LOGIN")}>
          로그인 화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}

// ------------------ 팀 관리 컴포넌트 ------------------
function TeamManager({ onLogout }) {
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberGroupId, setNewMemberGroupId] = useState("");

  const [newGroupName, setNewGroupName] = useState("");

  // 처음 렌더링 될 때 팀원/그룹 목록 가져오기
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
      alert("팀원 목록을 불러오는 중 오류가 발생했습니다.");
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
        alert(json.message || "그룹 생성 실패");
      }
    } catch (err) {
      console.error(err);
      alert("그룹 생성 중 오류가 발생했습니다.");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("팀원 이름을 입력해 주세요.");
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
        alert(json.message || "팀원 추가 실패");
      }
    } catch (err) {
      console.error(err);
      alert("팀원 추가 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("정말 삭제할까요?")) return;

    try {
      const res = await fetch(`${API_BASE}/members/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.isSuccess) {
        fetchMembers();
      } else {
        alert(json.message || "삭제 실패");
      }
    } catch (err) {
      console.error(err);
      alert("팀원 삭제 중 오류가 발생했습니다.");
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
        alert(json.message || "그룹 변경 실패");
      }
    } catch (err) {
      console.error(err);
      alert("그룹 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card" style={{ width: "700px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 className="title">팀원 / 프로젝트 그룹 관리</h1>
          <button className="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>

        {/* 그룹 생성 폼 */}
        <h2 style={{ fontSize: "18px", marginTop: "10px" }}>프로젝트 그룹 생성</h2>
        <form onSubmit={handleAddGroup} className="form" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              className="input"
              type="text"
              placeholder="그룹 이름"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button type="submit" className="button primary">
              추가
            </button>
          </div>
        </form>

        {/* 팀원 추가 폼 */}
        <h2 style={{ fontSize: "18px" }}>팀원 추가</h2>
        <form onSubmit={handleAddMember} className="form" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              className="input"
              type="text"
              placeholder="팀원 이름"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <select
              className="input"
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
            <button type="submit" className="button primary">
              추가
            </button>
          </div>
        </form>

        {/* 팀원 목록 */}
        <h2 style={{ fontSize: "18px" }}>팀원 목록</h2>
        {members.length === 0 ? (
          <p>등록된 팀원이 없습니다.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>이름</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>그룹</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>그룹 변경</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>{m.name}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>
                    {m.groupName || "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>
                    <select
                      className="input"
                      style={{ padding: "4px" }}
                      value={m.groupId || ""}
                      onChange={(e) => handleChangeMemberGroup(m.id, e.target.value || null)}
                    >
                      <option value="">그룹 없음</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>
                    <button
                      className="button"
                      style={{ padding: "6px 10px" }}
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
  );
}

// ------------------ 최상위 App ------------------
function App() {
  const [mode, setMode] = useState("LOGIN"); // LOGIN / SIGNUP / TEAM

  const handleLoginSuccess = () => {
    setMode("TEAM");
  };

  const handleLogout = () => {
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

