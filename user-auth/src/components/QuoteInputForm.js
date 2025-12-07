// src/components/QuoteInputForm.js
import React, { useEffect, useState } from "react";
import {
  normalizeQuote,
  formatCitation,
  updateCard,
} from "../services/api";

function QuoteInputForm({ onCardCreated }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [citationPreview, setCitationPreview] = useState(null);
  const [citationCopied, setCitationCopied] = useState(false);

  useEffect(() => {
    if (!citationCopied) return;
    const timer = setTimeout(() => setCitationCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [citationCopied]);

  const handleCopyPreview = async () => {
    if (!citationPreview?.style) return;
    try {
      const canUseClipboard =
        typeof navigator !== "undefined" && navigator.clipboard?.writeText;

      if (canUseClipboard) {
        await navigator.clipboard.writeText(citationPreview.style);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = citationPreview.style;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCitationCopied(true);
    } catch (err) {
      console.error(err);
      alert("인용구 복사에 실패했습니다.");
    }
  };

  const handleMake = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      let card = await normalizeQuote(text);
      if (!card || !card.id) {
        throw new Error("카드를 생성하지 못했어요");
      }

      const patch = {};
      const trimmedTitle = title.trim();
      if (trimmedTitle) {
        patch.topic = trimmedTitle;
      }

      if (hint.trim()) {
        const citation = await formatCitation(hint);
        patch.author = citation.author ?? null;
        patch.year = citation.year ?? null;
        patch.sourceTitle = citation.title ?? null;
        patch.venue = citation.venue ?? null;
        patch.citationStyle = citation.style ?? "";
        setCitationPreview(citation);
        setCitationCopied(false);
      } else {
        setCitationPreview(null);
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
      setHint("");
    } catch (e) {
      console.error(e);
      alert("카드 생성 중 오류가 발생했습니다.");
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

  const iconButtonStyle = {
    border: "none",
    background: "rgba(99, 102, 241, 0.08)",
    color: "#4c51bf",
    borderRadius: "999px",
    width: "36px",
    height: "36px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1rem",
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>인용 카드 만들기 (AI)</h3>
      <input
        style={controlStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="카드 제목 (예: 인공지능 요약)"
      />
      <textarea
        rows={5}
        style={controlStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="논문에서 복사한 문단 붙여넣기"
      />
      <input
        style={controlStyle}
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="(선택) 참고문헌 힌트 (예: Smith 2023 ACL)"
      />
      <button onClick={handleMake} disabled={loading} style={actionButtonStyle}>
        {loading ? "생성 중..." : "AI로 카드 만들기"}
      </button>
      {citationPreview?.style && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            border: "1px solid #eee",
            borderRadius: 8,
            background: "#fdfdfd",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>최근 생성된 인용구</p>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>{citationPreview.style}</p>
          <button
            type="button"
            onClick={handleCopyPreview}
            style={{ ...iconButtonStyle, marginTop: "0.4rem" }}
            title="참고문헌 복사"
            aria-label="참고문헌 복사"
          >
            {citationCopied ? "✔" : "📋"}
          </button>
        </div>
      )}
    </div>
  );
}

export default QuoteInputForm;
