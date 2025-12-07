import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

import {
  toggleBookmark as apiToggleBookmark,
  deleteCard as apiDeleteCard,
} from "../services/api";

import QuoteInputForm from "../components/QuoteInputForm";
import SearchBar from "../components/SearchBar";
import QuoteCardList from "../components/QuoteCardList";

function QuotePage() {
  // ⭐⭐⭐ 반드시 필요 — 이 줄이 없어 오류가 발생함
  const { token } = useAuth();

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
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleBookmark = async (id) => {
    setBookmarkFlag(id, true);
    try {
      const updated = await apiToggleBookmark(id);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } finally {
      setBookmarkFlag(id, false);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm("이 카드를 삭제할까요?")) return;
    await apiDeleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div style={{ padding: "2rem", color: "white" }}>
      <h2>논문 인용 카드 정리</h2>

      <button
        onClick={() => window.open("http://localhost:4000/api/cards/view")}
      >
        서버 카드 리스트 열기
      </button>

      <QuoteInputForm onCardCreated={handleCardCreated} />
      <SearchBar onSearchResult={handleSearchResult} />
      <QuoteCardList
        cards={cards}
        onToggleBookmark={handleToggleBookmark}
        onDeleteCard={handleDeleteCard}
        bookmarkPending={bookmarkPending}
      />
    </div>
  );
}

export default QuotePage;
