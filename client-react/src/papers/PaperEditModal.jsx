// src/papers/PaperEditModal.jsx
// 작성자: 예슬 (논문 수정 모달)

import React, { useState } from "react";
import "./PaperEditModal.css";

function PaperEditModal({ paper, onClose, onEditSuccess }) {
 

  const [paperTitle, setPaperTitle] = useState(paper.title);
  const [author, setAuthor] = useState(paper.author || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // 수정 버튼 클릭
  const handleUpdate = async () => {
    if (!paperTitle.trim()) {
      alert("논문 제목을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    console.log("논문 수정:", paperTitle, author);

    try {
      //나중에 서버로 보내는 코드 추가 (DB연결)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedPaper = {
        ...paper,
        title: paperTitle,
        author: author || "저자 미상",
      };

      onEditSuccess(updatedPaper);
      alert("수정 완료!");
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  
  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="edit-modal-title">논문 정보 수정</h2>

        {/* 논문 제목 */}
        <input
          className="edit-modal-input"
          type="text"
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
          placeholder="논문 제목을 입력하세요"
        />

        {/* 저자 */}
        <input
          className="edit-modal-input"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="저자 (선택사항)"
        />

        {/* 파일 정보 (수정 불가 메세지 출력) */}
        <div className="edit-modal-file-info">
          <div className="edit-modal-file-icon">📄</div>
          <div className="edit-modal-file-name">{paper.fileName}</div>
          <div className="edit-modal-file-hint">
            (파일은 수정할 수 없습니다)
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="edit-modal-buttons">
          <button onClick={onClose} className="edit-modal-cancel">
            취소
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="edit-modal-submit"
          >
            {isUpdating ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaperEditModal;