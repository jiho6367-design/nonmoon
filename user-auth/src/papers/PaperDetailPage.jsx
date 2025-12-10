// src/papers/PaperDetailPage.jsx
// 상세 뷰 (논문 상세 페이지)

import React, { useEffect, useMemo, useState } from "react";
import PdfViewer from "./PdfViewer";
import QuotePage from "../components/QuotePage";
import SummaryPanel from "./SummaryPanel";
import {
  createSummary as apiCreateSummary,
  deleteSummary as apiDeleteSummary,
  fetchSummaries,
  updateSummary as apiUpdateSummary,
} from "../services/api";
import "./PaperDetailPage.css";

function PaperDetailPage({ paper, onBack, currentMemberName }) {
  const [activePanel, setActivePanel] = useState(null); // null | "memo" | "summary"
  const [summaryEntries, setSummaryEntries] = useState([]);
  const [summaryView, setSummaryView] = useState("form"); // form | list | detail
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryActionId, setSummaryActionId] = useState("");
  const [summaryCreating, setSummaryCreating] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const fileSource =
    paper.fileUrl ||
    paper.file ||
    (paper.storedFileName ? `http://localhost:4000/uploads/${paper.storedFileName}` : "");

  const handleToggleMemo = () => {
    setActivePanel((prev) => (prev === "memo" ? null : "memo"));
  };

  const handleToggleSummary = () => {
    setActivePanel((prev) => (prev === "summary" ? null : "summary"));
    setSummaryView("form");
    setSelectedSummaryId(null);
  };

  const selectedSummary = useMemo(
    () => summaryEntries.find((entry) => entry.id === selectedSummaryId) || null,
    [selectedSummaryId, summaryEntries]
  );

  useEffect(() => {
    if (activePanel !== "summary") return;
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      setSummaryError("");
      try {
        const list = await fetchSummaries(paper.id);
        if (!cancelled) {
          setSummaryEntries(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSummaryError("요약을 불러오지 못했습니다. 다시 시도해 주세요.");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePanel, paper.id]);

  const handleCreateSummary = async ({ title, author, year, pdfName }) => {
    setSummaryError("");
    setSummaryCreating(true);
    try {
      const created = await apiCreateSummary(paper.id, {
        title: title || paper.title || "",
        author: author || paper.author || "",
        year: year || "",
        pdfName: pdfName || paper.fileName || "",
        uploader: currentMemberName || "",
      });
      setSummaryEntries((prev) => [created, ...prev]);
      setSelectedSummaryId(created.id);
      setSummaryView("detail");
      setActivePanel("summary");
      return created;
    } catch (err) {
      console.error(err);
      setSummaryError("요약 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      throw err;
    } finally {
      setSummaryCreating(false);
    }
  };

  const handleUpdateSummary = async (summaryId, patch) => {
    setSummaryError("");
    setSummaryActionId(summaryId);
    try {
      const updated = await apiUpdateSummary(paper.id, summaryId, patch);
      setSummaryEntries((prev) =>
        prev.map((entry) => (entry.id === summaryId ? updated : entry))
      );
      setSelectedSummaryId(updated.id);
      return updated;
    } catch (err) {
      console.error(err);
      setSummaryError("요약 수정에 실패했습니다.");
      throw err;
    } finally {
      setSummaryActionId("");
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    setSummaryError("");
    setSummaryActionId(summaryId);
    try {
      await apiDeleteSummary(paper.id, summaryId);
      setSummaryEntries((prev) => prev.filter((entry) => entry.id !== summaryId));
      setSelectedSummaryId((prev) => (prev === summaryId ? null : prev));
      setSummaryView("list");
    } catch (err) {
      console.error(err);
      setSummaryError("요약 삭제에 실패했습니다.");
      throw err;
    } finally {
      setSummaryActionId("");
    }
  };

  const handleSummaryViewChange = (nextView) => {
    if (nextView === "form" || nextView === "list") {
      setSelectedSummaryId(null);
    }
    setSummaryView(nextView);
  };

  const handleSelectSummary = (entryId) => {
    setSelectedSummaryId(entryId);
  };
  const isSidebarOpen = Boolean(activePanel);

  return (
    <div className="paper-detail-page">
      <div className="paper-detail-header">
        <button onClick={onBack} className="paper-detail-back-button">
          목록으로가기
        </button>
        <h2 className="paper-detail-header-title">{paper.title}</h2>
        <div className="paper-detail-actions">
          <button onClick={handleToggleSummary} className="paper-detail-summary-button">
            {activePanel === "summary" ? "요약 닫기" : "AI 요약하기"}
          </button>
          <button onClick={handleToggleMemo} className="paper-detail-toggle-button">
            {activePanel === "memo" ? "메모 닫기" : "메모 열기"}
          </button>
        </div>
      </div>

      <div className="paper-detail-content">
        <div className="paper-detail-pdf-area">
          <div className="paper-detail-pdf-container">
            <h3 className="paper-detail-pdf-title">📄 {paper.fileName}</h3>

            {fileSource ? (
              <PdfViewer file={fileSource} />
            ) : (
              <div className="paper-detail-pdf-placeholder">
                <p className="paper-detail-pdf-placeholder-icon">📂</p>
                <p>PDF 파일을 찾을 수 없습니다.</p>
              </div>
            )}

            <div className="paper-detail-info">
              <h4>논문 정보</h4>
              <div className="paper-detail-info-content">
                <p>논문 제목: {paper.title}</p>
                <p>저자: {paper.author}</p>
                <p>
                  업로드일:{" "}
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
            {activePanel === "memo" && <QuotePage currentMemberName={currentMemberName} />}
            {activePanel === "summary" && (
              <SummaryPanel
                paperId={paper.id}
                paperTitle={paper.title}
                paperAuthor={paper.author}
                paperFileName={paper.fileName}
                uploaderName={currentMemberName}
                isRefreshing={summaryLoading}
                isCreating={summaryCreating}
                busyId={summaryActionId}
                errorMessage={summaryError}
                entries={summaryEntries}
                selectedEntry={selectedSummary}
                selectedEntryId={selectedSummaryId}
                viewMode={summaryView}
                onChangeView={handleSummaryViewChange}
                onSelectEntry={handleSelectSummary}
                onCreateEntry={handleCreateSummary}
                onUpdateEntry={handleUpdateSummary}
                onDeleteEntry={handleDeleteSummary}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaperDetailPage;
