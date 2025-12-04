// src/papers/PdfViewer.jsx
// 작성자: 예슬 (PDF 뷰어 컴포넌트)

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfViewer.css"; 

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PdfViewer({ file }) {

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    console.log(`PDF 로드 완료: 총 ${numPages}페이지`);
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF 로드 실패:", error);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  
  return (
    <div className="pdf-viewer-container">
      {/* 페이지 컨트롤 */}
      {numPages && (
        <div className="pdf-controls">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="pdf-control-button"
          >
            ← 이전
          </button>
          <span className="pdf-page-info">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="pdf-control-button"
          >
            다음 →
          </button>
        </div>
      )}

      {/* PDF 문서 */}
      <div className="pdf-wrapper">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="pdf-loading">
              <p>📄 PDF를 불러오는 중...</p>
            </div>
          }
          error={
            <div className="pdf-error">
              <p>PDF를 불러올 수 없습니다.</p>
              <p>파일 형식을 확인해주세요.</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={800}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}

export default PdfViewer;