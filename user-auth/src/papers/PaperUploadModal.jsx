// src/papers/PaperUploadModal.jsx
// 예슬의 연습 (논문 업로드 모달)

import React, { useState } from "react";
import { uploadPaper } from "../services/api";
import "./PaperUploadModal.css";

function PaperUploadModal({ onClose, onUploadSuccess, uploaderName }) {
  const [paperTitle, setPaperTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("PDF 파일만 업로드가 가능합니다.");
    }
  };

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

    try {
      const uploaded = await uploadPaper({
        title: paperTitle.trim(),
        author: author.trim(),
        file: selectedFile,
        uploader: uploaderName || undefined,
      });

      onUploadSuccess(uploaded);
      setPaperTitle("");
      setAuthor("");
      setSelectedFile(null);
      alert("업로드 성공");
    } catch (error) {
      console.error("업로드실패:", error);
      alert("업로드 중 문제가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="upload-modal-title">논문 업로드</h2>

        <input
          className="upload-modal-input"
          type="text"
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
          placeholder="논문 제목을입력하세요"
        />

        <input
          className="upload-modal-input"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="저자(선택)"
        />

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
                <div className="upload-modal-file-title">{selectedFile.name}</div>
                <div className="upload-modal-file-hint">클릭해서 다른 파일 선택</div>
              </div>
            ) : (
              <div>
                <div className="upload-modal-file-icon">⬆️</div>
                <div className="upload-modal-file-title">PDF 파일 선택</div>
                <div className="upload-modal-file-hint">클릭해서 업로드</div>
              </div>
            )}
          </label>
        </div>

        <div className="upload-modal-buttons">
          <button onClick={onClose} className="upload-modal-cancel">
            취소
          </button>
          <button onClick={handleUpload} disabled={isUploading} className="upload-modal-submit">
            {isUploading ? "업로드중.." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaperUploadModal;
