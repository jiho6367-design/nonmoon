// src/papers/PaperDetailPage.jsx
// 작성자: 예슬 (논문 상세 페이지)

import React, { useState } from "react";
import PdfViewer from "./PdfViewer";
import QuotePage from "../components/QuotePage"; // 지호의 전체 앱
import "./PaperDetailPage.css";

function PaperDetailPage({ paper, onBack }) {
  
  // 사이드바 토글

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  
  // JSX 반환 
  return (
    <div className="paper-detail-page">
      {/* 상단 헤더 */}
      <div className="paper-detail-header">
        <button onClick={onBack} className="paper-detail-back-button">
          ← 뒤로가기
        </button>
        <h2 className="paper-detail-header-title">{paper.title}</h2>
        <button onClick={toggleSidebar} className="paper-detail-toggle-button">
          {isSidebarOpen ? "메모 닫기" : "메모 열기"}
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="paper-detail-content">
        {/* 왼쪽: PDF 뷰어 */}
        <div className="paper-detail-pdf-area">
          <div className="paper-detail-pdf-container">
            <h3 className="paper-detail-pdf-title">📄 {paper.fileName}</h3>

            {/* PDF 뷰어 컴포넌트*/}
            {paper.file ? (
              <PdfViewer file={paper.file} />
            ) : (
              <div className="paper-detail-pdf-placeholder">
                <p className="paper-detail-pdf-placeholder-icon">📑</p>
                <p>PDF 파일을 찾을 수 없습니다.</p>
              </div>
            )}

            {/* 논문 정보 */}
            <div className="paper-detail-info">
              <h4>논문 정보</h4>
              <div className="paper-detail-info-content">
                <p>📌 제목: {paper.title}</p>
                <p>👤 저자: {paper.author}</p>
                <p>
                  📅 업로드:{" "}
                  {new Date(paper.uploadedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 사이드 바 (지호의 전체 앱) */}
        <div className={`paper-detail-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="paper-detail-sidebar-content">
            {/* 지호의 원래 App.js 전체(현재는 components/QuotePage) */}
            <QuotePage />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaperDetailPage;