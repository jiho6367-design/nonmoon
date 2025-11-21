// src/papers/PaperListPage.jsx
// 작성자: 예슬 (논문 리스트 메인 페이지)

import React, { useState } from "react";
import PaperCard from "./PaperCard";
import PaperUploadModal from "./PaperUploadModal";
import PaperEditModal from "./PaperEditModal"; 
import PaperDetailPage from "./PaperDetailPage";
import "./PaperListPage.css";

function PaperListPage() {


  const [papers, setPapers] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  const [editingPaper, setEditingPaper] = useState(null); 
  const [selectedPaper, setSelectedPaper] = useState(null);

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handlePaperUploaded = (newPaper) => {
    console.log("새 논문 추가:", newPaper);
    setPapers((prev) => [newPaper, ...prev]);
    closeUploadModal();
  };

  const handlePaperClick = (paper) => {
    console.log("논문 클릭:", paper);
    setSelectedPaper(paper);
  };

  const handleBackToList = () => {
    setSelectedPaper(null);
  };

  // 논문 삭제 핸들러
  const handlePaperDelete = (paperId) => {
    const confirmed = window.confirm("이 논문을 삭제하시겠습니까?");
    if (!confirmed) return;

    console.log("논문 삭제:", paperId);
    setPapers((prev) => prev.filter((paper) => paper.id !== paperId));
  };

  // 논문 수정 핸들러 
  const handlePaperEdit = (paper) => {
    console.log("논문 수정:", paper);
    setEditingPaper(paper);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPaper(null);
  };

  const handlePaperEdited = (updatedPaper) => {
    console.log("논문 수정 완료:", updatedPaper);
    setPapers((prev) =>
      prev.map((paper) =>
        paper.id === updatedPaper.id ? updatedPaper : paper
      )
    );
    closeEditModal();
  };

  // 상세 페이지로 이동
  if (selectedPaper) {
    return (
      <PaperDetailPage paper={selectedPaper} onBack={handleBackToList} />
    );
  }

 
  return (
    <div className="paper-list-page">
      <div className="paper-list-container">
        {/* 헤더 */}
        <div className="paper-list-header">
          <h1 className="paper-list-title">📚 논문 관리</h1>
          <button onClick={openUploadModal} className="paper-upload-button">
            + 논문 업로드
          </button>
        </div>

        {/* 논문 리스트 */}
        <div className="paper-list">
          {papers.length === 0 ? (
            <div className="paper-list-empty">
              <p>📭 아직 업로드된 논문이 없습니다.</p>
              <p>위의 "논문 업로드" 버튼을 눌러 논문을 추가해보세요</p>
            </div>
          ) : (
            papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onClick={() => handlePaperClick(paper)}
                onDelete={handlePaperDelete}
                onEdit={handlePaperEdit} 
              />
            ))
          )}
        </div>
      </div>

      {/* 업로드 모달 */}
      {isUploadModalOpen && (
        <PaperUploadModal
          onClose={closeUploadModal}
          onUploadSuccess={handlePaperUploaded}
        />
      )}

      {/* 수정 모달 */}
      {isEditModalOpen && editingPaper && (
        <PaperEditModal
          paper={editingPaper}
          onClose={closeEditModal}
          onEditSuccess={handlePaperEdited}
        />
      )}
    </div>
  );
}

export default PaperListPage;