// src/papers/PaperCard.jsx
// 단일 논문 카드 컴포넌트

import React from "react";
import "./PaperCard.css";

function PaperCard({ paper, onClick, onDelete, onEdit }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(paper.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(paper);
  };

  return (
    <div className="paper-card" onClick={onClick}>
      <div className="paper-card-header">
        <h3 className="paper-card-title">📄 {paper.title}</h3>
        <div className="paper-card-actions">
          <button className="paper-card-edit" onClick={handleEdit} title="수정">
            ✏️
          </button>
          <button className="paper-card-delete" onClick={handleDelete} title="삭제">
            🗑️
          </button>
        </div>
      </div>

      <div className="paper-card-info">
        <span className="paper-card-badge">
          <span>저자</span>
          <span>{paper.author || "정보 없음"}</span>
        </span>
        <span className="paper-card-badge">
          <span role="img" aria-label="memo">📝</span>
          <span>메모 {paper.memoCount || 0}개</span>
        </span>
      </div>

      <div className="paper-card-uploader">
        <span className="paper-card-uploader-text">
          <span>업로드</span>
          <span>{paper.uploader ? `업로드 : ${paper.uploader}` : "업로더 미지정"}</span>
        </span>
      </div>
    </div>
  );
}

export default PaperCard;
