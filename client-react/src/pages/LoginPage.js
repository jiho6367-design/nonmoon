import React, { useState } from "react";
import { login } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const handleLogin = async () => {
    try {
      const res = await login(username, password);
      setToken(res.token);
      navigate("/"); // 로그인 성공 → 메인(QuotePage) 이동
    } catch (err) {
      alert("로그인 실패: " + err.message);
    }
  };

  return (
    <div style={{ color: "white" }}>
      <h2>로그인</h2>
      <input
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>로그인</button>
      <button onClick={() => navigate("/register")}>회원가입</button>
    </div>
  );
}
