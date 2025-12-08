// src/App.js 원래 파일 경로
// src/components/QuotePage.jsx

import React, { useState } from "react";
import {
  toggleBookmark as apiToggleBookmark,
  deleteCard as apiDeleteCard,
} from "../services/api"; // ← ../services/api (수정!)
import QuoteInputForm from "./QuoteInputForm"; // ← ./QuoteInputForm (수정!)
import SearchBar from "./SearchBar"; // ← ./SearchBar (수정!)
import QuoteCardList from "./QuoteCardList"; // ← ./QuoteCardList (수정!)

function QuotePage({ currentMemberName }) {
  const [cards, setCards] = useState([]);
  const [bookmarkPending, setBookmarkPending] = useState(new Set());

  const handleCardCreated = (newCard) => {
    setCards((prev) => [newCard, ...prev]);
  };

  const handleSearchResult = (searchedCards) => {
    setCards(searchedCards);
  };

  const setBookmarkFlag = (id, isPending) => {
    setBookmarkPending((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleToggleBookmark = async (id) => {
    setBookmarkFlag(id, true);
    try {
      const updated = await apiToggleBookmark(id);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      console.error(e);
      alert("북마크 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBookmarkFlag(id, false);
    }
  };

  const handleDeleteCard = async (id) => {
    const confirmed = window.confirm("이 카드를 삭제할까요?");
    if (!confirmed) return;
    try {
      await apiDeleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      setBookmarkFlag(id, false);
    } catch (err) {
      console.error(err);
      alert("카드를 삭제하지 못했습니다.");
    }
  };

  const pageStyle = {
    minHeight: "100%",
    background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    padding: "2rem 1rem",
    fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif",
  };

  const panelStyle = {
    padding: "1.5rem",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.95)",
    boxShadow: "0 15px 25px rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    backdropFilter: "blur(8px)",
  };

  const titleStyle = {
    margin: 0,
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#1f2a37",
  };

  const subtitleStyle = {
    color: "#4a5568",
    fontSize: "0.8rem",
    marginTop: "0.5rem",
    marginBottom: "1rem",
  };

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <h2 style={titleStyle}>논문 인용 카드 정리</h2>
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={() =>
              window.open("http://localhost:4000/api/cards/view", "_blank")
            }
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid #cbd5f5",
              background: "#eef2ff",
              color: "#3730a3",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            인용 카드 리스트 열기
          </button>
        </div>

        <QuoteInputForm onCardCreated={handleCardCreated} currentMemberName={currentMemberName} />
        <SearchBar onSearchResult={handleSearchResult} />
        <QuoteCardList
          cards={cards}
          onToggleBookmark={handleToggleBookmark}
          onDeleteCard={handleDeleteCard}
          bookmarkPending={bookmarkPending}
        />
      </div>
    </div>
  );
}

export default QuotePage;
