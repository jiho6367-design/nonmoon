// src/papers/PaperEditModal.jsx
// 예슬 연습 (논문 수정 모달)

import React, { useState } from "react";
import { updatePaperMeta } from "../services/api";
import "./PaperEditModal.css";

function PaperEditModal({ paper, onClose, onEditSuccess }) {
  const [paperTitle, setPaperTitle] = useState(paper.title);
  const [author, setAuthor] = useState(paper.author || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!paperTitle.trim()) {
      alert("논문 제목을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updatePaperMeta(paper.id, {
        title: paperTitle.trim(),
        author: author.trim(),
      });
      onEditSuccess(updated);
      alert("수정 완료!");
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정 도중 문제가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="edit-modal-title">논문 정보 수정</h2>

        <input
          className="edit-modal-input"
          type="text"
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
          placeholder="논문 제목을입력하세요"
        />

        <input
          className="edit-modal-input"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="저자(선택)"
        />

        <div className="edit-modal-file-info">
          <div className="edit-modal-file-icon">📄</div>
          <div className="edit-modal-file-name">{paper.fileName}</div>
          <div className="edit-modal-file-hint">(파일은 수정하지 않습니다)</div>
        </div>

        <div className="edit-modal-buttons">
          <button onClick={onClose} className="edit-modal-cancel">
            취소
          </button>
          <button onClick={handleUpdate} disabled={isUpdating} className="edit-modal-submit">
            {isUpdating ? "수정 중.." : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaperEditModal;
