// src/papers/PaperDetailPage.jsx
// 예슬 연습 (논문 상세 페이지)

import React, { useState } from "react";
import PdfViewer from "./PdfViewer";
import QuotePage from "../components/QuotePage";
import "./PaperDetailPage.css";

function PaperDetailPage({ paper, onBack, currentMemberName }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileSource = paper.fileUrl || paper.file;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="paper-detail-page">
      <div className="paper-detail-header">
        <button onClick={onBack} className="paper-detail-back-button">
          목록으로가기
        </button>
        <h2 className="paper-detail-header-title">{paper.title}</h2>
        <button onClick={toggleSidebar} className="paper-detail-toggle-button">
          {isSidebarOpen ? "메모 닫기" : "메모 열기"}
        </button>
      </div>

      <div className="paper-detail-content">
        <div className="paper-detail-pdf-area">
          <div className="paper-detail-pdf-container">
            <h3 className="paper-detail-pdf-title">📄 {paper.fileName}</h3>

            {fileSource ? (
              <PdfViewer file={fileSource} />
            ) : (
              <div className="paper-detail-pdf-placeholder">
                <p className="paper-detail-pdf-placeholder-icon">🗂</p>
                <p>PDF 파일을 찾을 수 없습니다.</p>
              </div>
            )}

            <div className="paper-detail-info">
              <h4>논문 정보</h4>
              <div className="paper-detail-info-content">
                <p>논문 제목: {paper.title}</p>
                <p>작성자: {paper.author}</p>
                <p>
                  업로드{" "}
                  {paper.uploadedAt
                    ? new Date(paper.uploadedAt).toLocaleDateString("ko-KR")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`paper-detail-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="paper-detail-sidebar-content">
            <QuotePage currentMemberName={currentMemberName} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaperDetailPage;
