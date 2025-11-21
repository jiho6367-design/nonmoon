// src/papers/PaperUploadModal.jsx
// 작성자: 예슬 (논문 업로드 모달)

import React, { useState } from "react";
import "./PaperUploadModal.css"; 

function PaperUploadModal({ onClose, onUploadSuccess }) {
  
  const [paperTitle, setPaperTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 파일 선택했을 때
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    console.log("선택한 파일:", file);

    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("PDF 파일만 업로드 가능합니다.");
    }
  };

  // 업로드 버튼 클릭
  const handleUpload = async () => {
    if (!paperTitle.trim()) {
      alert("논문 제목을 입력해주세요.");
      return;
    }
    if (!selectedFile) {
      alert("PDF 파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    console.log("업로드 시작:", paperTitle, author, selectedFile.name);

    try {
      //서버로 보내는 코드 추가 해야됨
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newPaper = {
        id: Date.now(),
        title: paperTitle,
        author: author || "저자 미상",
        memoCount: 0,
        fileName: selectedFile.name,
        file: selectedFile,
        uploadedAt: new Date().toISOString(),
        uploader: "예슬", // 업로더 이름 (임시)
      };

      onUploadSuccess(newPaper);
      alert("업로드 성공");
    } catch (error) {
      console.error("업로드 실패:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="upload-modal-title">논문 업로드</h2>

        {/* 논문 제목 */}
        <input
          className="upload-modal-input"
          type="text"
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
          placeholder="논문 제목을 입력하세요"
        />

        {/* 저자 */}
        <input
          className="upload-modal-input"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="저자 (선택사항)"
        />

        {/* 파일 선택 */}
        <div className="upload-modal-file-area">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="modal-file-upload"
          />
          <label htmlFor="modal-file-upload">
            {selectedFile ? (
              <div>
                <div className="upload-modal-file-icon">📄</div>
                <div className="upload-modal-file-title">
                  {selectedFile.name}
                </div>
                <div className="upload-modal-file-hint">
                  클릭해서 다른 파일 선택
                </div>
              </div>
            ) : (
              <div>
                <div className="upload-modal-file-icon">📎</div>
                <div className="upload-modal-file-title">PDF 파일 선택</div>
                <div className="upload-modal-file-hint">
                  클릭해서 업로드
                </div>
              </div>
            )}
          </label>
        </div>

        {/* 버튼 영역 */}
        <div className="upload-modal-buttons">
          <button onClick={onClose} className="upload-modal-cancel">
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="upload-modal-submit"
          >
            {isUploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaperUploadModal;