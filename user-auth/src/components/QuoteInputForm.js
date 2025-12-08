// src/components/QuoteInputForm.js
import React, { useState } from "react";
import { normalizeQuote, updateCard } from "../services/api";

function QuoteInputForm({ onCardCreated, currentMemberName }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMake = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      let card = await normalizeQuote(text, { creatorName: currentMemberName });
      if (!card || !card.id) {
        throw new Error("카드를 생성하지 못했습니다.");
      }

      const patch = {};
      const trimmedTitle = title.trim();
      if (trimmedTitle) {
        patch.topic = trimmedTitle;
      }
      if (authorInput.trim()) {
        patch.author = authorInput.trim();
      }
      if (yearInput.trim()) {
        patch.year = yearInput.trim();
      }

      if (Object.keys(patch).length > 0) {
        try {
          card = await updateCard(card.id, patch);
        } catch (patchErr) {
          console.error(patchErr);
          card = { ...card, ...patch };
        }
      }

      onCardCreated && onCardCreated(card);
      setText("");
      setTitle("");
      setAuthorInput("");
      setYearInput("");
    } catch (e) {
      console.error(e);
      alert("카드 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    marginBottom: "1.5rem",
    padding: "1.5rem",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0 15px 35px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
  };

  const controlStyle = {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    padding: "0.85rem 1rem",
    fontSize: "0.95rem",
    marginBottom: "0.75rem",
    background: "#fff",
  };

  const actionButtonStyle = {
    border: "none",
    borderRadius: "999px",
    padding: "0.75rem 1.75rem",
    fontWeight: 600,
    background: "linear-gradient(135deg, #8a5bff, #ff7ac3)",
    color: "#fff",
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: "0 12px 24px rgba(138, 91, 255, 0.3)",
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>인용 카드 만들기</h3>
      <input
        style={controlStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="카드 제목 (예: 핵심 키워드)"
      />
      <textarea
        rows={5}
        style={controlStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="인용문을 붙여 넣어 주세요"
      />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input
          style={{ ...controlStyle, marginBottom: 0 }}
          value={authorInput}
          onChange={(e) => setAuthorInput(e.target.value)}
          placeholder="(선택) 저자"
        />
        <input
          style={{ ...controlStyle, marginBottom: 0 }}
          value={yearInput}
          onChange={(e) => setYearInput(e.target.value)}
          placeholder="(선택) 연도"
        />
      </div>
      <div style={{ marginTop: "0.8rem", display: "flex", justifyContent: "flex-start" }}>
        <button onClick={handleMake} disabled={loading} style={actionButtonStyle}>
          {loading ? "생성 중.." : "카드 만들기"}
        </button>
      </div>
    </div>
  );
}

export default QuoteInputForm;
