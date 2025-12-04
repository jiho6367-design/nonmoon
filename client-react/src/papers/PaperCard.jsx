// src/papers/PaperCard.jsx
// 작성자: 예슬 (논문 카드 컴포넌트)

import React from "react";
import "./PaperCard.css";

function PaperCard({ paper, onClick, onDelete, onEdit }) { 
  
  // 삭제 버튼 클릭
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(paper.id);
  };

  // 수정 버튼 클릭
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(paper);
  };

  return (
    <div className="paper-card" onClick={onClick}>
      <div className="paper-card-header">
        <h3 className="paper-card-title">📄 {paper.title}</h3>
        <div className="paper-card-actions">
          {/* 수정 버튼 */}
          <button 
            className="paper-card-edit"
            onClick={handleEdit}
            title="수정"
          >
            ✏️
          </button>
          {/* 삭제 버튼 */}
          <button 
            className="paper-card-delete"
            onClick={handleDelete}
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="paper-card-info">
        <span className="paper-card-badge">
          <span>👤</span>
          <span>{paper.author || "저자 미상"}</span>
        </span>
        <span className="paper-card-badge">
          <span>📝</span>
          <span>메모 {paper.memoCount || 0}개</span>
        </span>
      </div>
      
      {/* 업로더 표시 */}
      <div className="paper-card-uploader">
        <span className="paper-card-uploader-text">
          <span>🔼</span>
          <span>업로드: {paper.uploader || "미정"}</span>
        </span>
      </div>
    </div>
  );
}

export default PaperCard;