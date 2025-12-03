// src/App.js
import React, { useState } from "react";
import {
  toggleBookmark as apiToggleBookmark,
  deleteCard as apiDeleteCard,
} from "./services/api";
import QuoteInputForm from "./components/QuoteInputForm";
import SearchBar from "./components/SearchBar";
import QuoteCardList from "./components/QuoteCardList";

function App() {
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
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    padding: "3rem 1.5rem",
    fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif",
  };

  const panelStyle = {
    maxWidth: 900,
    margin: "0 auto",
    padding: "2rem",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.95)",
    boxShadow: "0 25px 45px rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    backdropFilter: "blur(8px)",
  };

  const titleStyle = {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 700,
    color: "#1f2a37",
  };

  const subtitleStyle = {
    color: "#4a5568",
    fontSize: "0.95rem",
    marginTop: "0.5rem",
    marginBottom: "1.5rem",
  };

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <h2 style={titleStyle}>논문 인용 카드 정리</h2>
        <p style={subtitleStyle}>
          2: 인용 카드 정리 · 3: 인용구 내보내기 · 4/5/6: 북마크 관리 및 검색
        </p>
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            onClick={() =>
              window.open("http://localhost:4000/api/cards/view", "_blank")
            }
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "10px",
              border: "1px solid #cbd5f5",
              background: "#eef2ff",
              color: "#3730a3",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            서버 카드 리스트 열기
          </button>
        </div>

        <QuoteInputForm onCardCreated={handleCardCreated} />
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

export default App;
