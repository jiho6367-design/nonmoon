// src/papers/PaperListPage.jsx
// 예슬 연습 (논문 리스트 메인 페이지)

import React, { useEffect, useState } from "react";
import PaperCard from "./PaperCard";
import PaperUploadModal from "./PaperUploadModal";
import PaperEditModal from "./PaperEditModal";
import PaperDetailPage from "./PaperDetailPage";
import { deletePaper, fetchPapers } from "../services/api";
import "./PaperListPage.css";

function PaperListPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchPapers();
        if (!cancelled) {
          setPapers(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("논문 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handlePaperUploaded = (newPaper) => {
    setPapers((prev) => [newPaper, ...prev]);
    closeUploadModal();
  };

  const handlePaperClick = (paper) => {
    setSelectedPaper(paper);
  };

  const handleBackToList = () => {
    setSelectedPaper(null);
  };

  const handlePaperDelete = async (paperId) => {
    const confirmed = window.confirm("정말로 해당 논문을 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await deletePaper(paperId);
      setPapers((prev) => prev.filter((paper) => paper.id !== paperId));
    } catch (err) {
      console.error(err);
      alert("논문을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handlePaperEdit = (paper) => {
    setEditingPaper(paper);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPaper(null);
  };

  const handlePaperEdited = (updatedPaper) => {
    setPapers((prev) =>
      prev.map((paper) => (paper.id === updatedPaper.id ? updatedPaper : paper))
    );
    closeEditModal();
  };

  if (selectedPaper) {
    return <PaperDetailPage paper={selectedPaper} onBack={handleBackToList} />;
  }

  return (
    <div className="paper-list-page">
      <div className="paper-list-container">
        <div className="paper-list-header">
          <h1 className="paper-list-title">내 논문 관리</h1>
          <button onClick={openUploadModal} className="paper-upload-button">
            + 논문 업로드
          </button>
        </div>

        {error && <div className="paper-list-error">{error}</div>}

        <div className="paper-list">
          {loading ? (
            <div className="paper-list-empty">
              <p>논문 목록을 불러오는 중...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="paper-list-empty">
              <p>아직 직접 업로드된 논문이 없습니다.</p>
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

      {isUploadModalOpen && (
        <PaperUploadModal onClose={closeUploadModal} onUploadSuccess={handlePaperUploaded} />
      )}

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
