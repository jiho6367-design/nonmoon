// src/components/QuoteCardList.js
import React from "react";
import QuoteCard from "./QuoteCard";

function QuoteCardList({
  cards,
  onToggleBookmark,
  bookmarkPending,
  onDeleteCard,
}) {
  if (!cards || cards.length === 0) {
    return <p>카드가 없습니다.</p>;
  }

  const pendingSet =
    bookmarkPending instanceof Set
      ? bookmarkPending
      : new Set(bookmarkPending || []);

  return (
    <div>
      {cards.map((card) => (
        <QuoteCard
          key={card.id}
          card={card}
          onToggleBookmark={onToggleBookmark}
          onDeleteCard={onDeleteCard}
          isBookmarkPending={pendingSet.has(card.id)}
        />
      ))}
    </div>
  );
}

export default QuoteCardList;
