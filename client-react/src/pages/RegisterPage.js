// src/pages/RegisterPage.js
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다!");
      return;
    }

    try {
      await register(username, password);
      alert("회원가입 성공!");
      navigate("/login");
    } catch (err) {
      alert("회원가입 실패: " + err.message);
    }
  };

  return (
    <div style={{ color: "white" }}>
      <h2>회원가입</h2>

      <input
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      /><br/>

      <input
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br/>

      <input
        placeholder="비밀번호 확인"
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      /><br/>

      <button onClick={handleRegister}>회원가입</button>
      <button onClick={() => navigate("/login")}>로그인으로 이동</button>
    </div>
  );
}
