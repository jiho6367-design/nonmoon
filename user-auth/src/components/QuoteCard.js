// src/components/QuoteCard.js
import React, { useEffect, useState } from "react";

function QuoteCard({ card, onToggleBookmark, onDeleteCard, isBookmarkPending }) {
  const [citationCopied, setCitationCopied] = useState(false);
  const [quoteCopied, setQuoteCopied] = useState(false);

  useEffect(() => {
    if (!citationCopied) return;
    const timer = setTimeout(() => setCitationCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [citationCopied]);

  useEffect(() => {
    if (!quoteCopied) return;
    const timer = setTimeout(() => setQuoteCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [quoteCopied]);

  const copyToClipboard = async (text) => {
    const canUseClipboard = typeof navigator !== "undefined" && navigator.clipboard?.writeText;

    if (canUseClipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return;
    }

    throw new Error("Clipboard API unavailable");
  };

  const handleCopyCitation = async () => {
    if (!card.citationStyle) return;
    try {
      await copyToClipboard(card.citationStyle);
      setCitationCopied(true);
    } catch (err) {
      console.error(err);
      alert("참고문헌을 복사하지 못했습니다.");
    }
  };

  const handleCopyQuote = async () => {
    try {
      await copyToClipboard(card.quote);
      setQuoteCopied(true);
    } catch (err) {
      console.error(err);
      alert("인용문을 복사하지 못했습니다.");
    }
  };

  const cardStyle = {
    border: "1px solid rgba(31, 41, 55, 0.1)",
    borderRadius: "16px",
    padding: "1.25rem",
    marginBottom: "1rem",
    background: card.isBookmarked
      ? "linear-gradient(135deg, rgba(255, 230, 180, 0.6), rgba(255, 255, 255, 0.95))"
      : "rgba(255, 255, 255, 0.95)",
    boxShadow: "0 18px 30px rgba(15, 23, 42, 0.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const bookmarkButtonStyle = {
    padding: "0.45rem 1.25rem",
    borderRadius: "999px",
    border: "none",
    background: card.isBookmarked
      ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
      : "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff",
    fontWeight: 600,
    cursor: isBookmarkPending ? "not-allowed" : "pointer",
    opacity: isBookmarkPending ? 0.7 : 1,
    boxShadow: "0 12px 24px rgba(79, 70, 229, 0.25)",
  };

  const deleteButtonStyle = {
    border: "none",
    background: "transparent",
    color: "#a0aec0",
    fontSize: "1rem",
    cursor: "pointer",
  };

  const iconButtonStyle = {
    border: "none",
    background: "rgba(99, 102, 241, 0.08)",
    color: "#4c51bf",
    borderRadius: "999px",
    width: "30px",
    height: "30px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
  };

  const similarityBadgeStyle = {
    marginLeft: "0.5rem",
    padding: "0.1rem 0.5rem",
    borderRadius: "999px",
    background: "rgba(79, 70, 229, 0.1)",
    color: "#4f46e5",
    fontSize: "0.75rem",
    fontWeight: 600,
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.5rem",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 auto" }}>
          <p style={{ fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {card.topic || "제목 없음"}
            {typeof card.similarity === "number" && (
              <span style={similarityBadgeStyle}>
                유사도 {(card.similarity * 100).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        {onDeleteCard && (
          <button
            onClick={() => onDeleteCard(card.id)}
            style={deleteButtonStyle}
            title="카드 삭제"
            aria-label="카드 삭제"
          >
            ×
          </button>
        )}
      </div>
      <div style={{ marginTop: "0.25rem", color: "#4b5563", fontSize: "0.85rem" }}>
        {card.creatorName ? `작성자: ${card.creatorName}` : "작성자 미지정"}
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-start",
          marginTop: "0.5rem",
        }}
      >
        <p style={{ whiteSpace: "pre-wrap", margin: 0, flex: 1 }}>{card.quote}</p>
        <button onClick={handleCopyQuote} style={iconButtonStyle} title="인용문 복사" aria-label="인용문 복사">
          {quoteCopied ? "✅" : "📋"}
        </button>
      </div>
      {card.note && <p style={{ whiteSpace: "pre-wrap", color: "#444" }}>{card.note}</p>}
      {(card.sourceTitle || card.venue) && (
        <p style={{ fontSize: "0.8rem", color: "#666" }}>
          {card.sourceTitle}
          {card.venue ? ` · ${card.venue}` : ""}
        </p>
      )}
      {(card.author || card.year) && (
        <p style={{ fontSize: "0.8rem", color: "#666" }}>
          {card.author} {card.year ? `(${card.year})` : ""}
        </p>
      )}
      {/* 키워드 표시 제거 */}
      {card.citationStyle && (
        <div
          style={{
            marginBottom: "0.5rem",
            padding: "0.5rem",
            background: "#fafafa",
            borderRadius: 6,
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "#555", marginBottom: "0.25rem" }}>참고문헌</p>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>{card.citationStyle}</p>
          <button
            onClick={handleCopyCitation}
            style={{ ...iconButtonStyle, marginTop: "0.35rem" }}
            title="참고문헌 복사"
            aria-label="참고문헌 복사"
          >
            {citationCopied ? "✅" : "📋"}
          </button>
        </div>
      )}
      <button onClick={() => onToggleBookmark && onToggleBookmark(card.id)} disabled={isBookmarkPending} style={bookmarkButtonStyle}>
        {isBookmarkPending
          ? "변경 중..."
          : card.isBookmarked
          ? "북마크 해제"
          : "북마크"}
      </button>
    </div>
  );
}

export default QuoteCard;
