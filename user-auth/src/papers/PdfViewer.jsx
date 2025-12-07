// src/papers/PdfViewer.jsx
// 작성자: 예슬 (PDF 뷰어 컴포넌트)

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfViewer.css"; 

// PDF.js 워커 및 CJK용 cMap/폰트 경로 설정 (한글 복사 시 깨짐 방지)
const PDFJS_VERSION = pdfjs.version;
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
const PDF_CMAP_URL = `//unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
const PDF_STANDARD_FONT_URL = `//unpkg.com/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;

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
          options={{
            // cMap/standard fonts 제공: CJK 문자 추출(복사) 시 올바른 문자 매핑
            cMapUrl: PDF_CMAP_URL,
            cMapPacked: true,
            standardFontDataUrl: PDF_STANDARD_FONT_URL,
          }}
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
