// src/papers/SummaryPanel.jsx
import React, { useEffect, useMemo, useState } from "react";

function SummaryPanel({
  paperTitle,
  paperAuthor,
  paperFileName,
  uploaderName,
  entries,
  viewMode,
  selectedEntry,
  selectedEntryId,
  onChangeView,
  onSelectEntry,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  isRefreshing,
  isCreating,
  busyId,
  errorMessage,
}) {
  const [titleInput, setTitleInput] = useState(paperTitle || "");
  const [authorInput, setAuthorInput] = useState(paperAuthor || "");
  const [yearInput, setYearInput] = useState("");
  const [pdfName, setPdfName] = useState(paperFileName || "");
  const [localError, setLocalError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    title: "",
    author: "",
    year: "",
    pdfName: "",
    summary: "",
  });

  useEffect(() => {
    setTitleInput(paperTitle || "");
    setAuthorInput(paperAuthor || "");
    setPdfName(paperFileName || "");
  }, [paperTitle, paperAuthor, paperFileName]);

  useEffect(() => {
    if (selectedEntry) {
      setEditFields({
        title: selectedEntry.title || "",
        author: selectedEntry.author || "",
        year: selectedEntry.year || "",
        pdfName: selectedEntry.pdfName || "",
        summary: selectedEntry.summary || "",
      });
      setIsEditing(false);
    }
  }, [selectedEntry]);

  const sortedEntries = useMemo(
    () =>
      (entries || []).slice().sort((a, b) => {
        const aDate = Date.parse(a.createdAt || 0);
        const bDate = Date.parse(b.createdAt || 0);
        return bDate - aDate;
      }),
    [entries]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setPdfName(file ? file.name : "");
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    setLocalError("");

    const trimmedTitle = titleInput.trim() || paperTitle || "";
    const trimmedAuthor = authorInput.trim() || paperAuthor || "";
    const trimmedYear = yearInput.trim();

    if (!pdfName) {
      setLocalError("요약할 PDF를 추가해 주세요.");
      return;
    }
    try {
      await onCreateEntry?.({
        title: trimmedTitle,
        author: trimmedAuthor,
        year: trimmedYear,
        pdfName,
      });
      onChangeView?.("detail");
    } catch (err) {
      console.error(err);
      setLocalError("요약 생성 중 문제가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;
    setLocalError("");
    try {
      await onUpdateEntry?.(selectedEntry.id, { ...editFields });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setLocalError("요약 수정 중 문제가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    const confirmed = window.confirm("이 요약을 삭제하시겠습니까?");
    if (!confirmed) return;
    setLocalError("");
    try {
      await onDeleteEntry?.(selectedEntry.id);
    } catch (err) {
      console.error(err);
      setLocalError("요약 삭제 중 문제가 발생했습니다.");
    }
  };

  const renderRecentList = () => (
    <div style={listCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <div style={labelStyle}>논문 요약 리스트</div>
          <div style={mutedStyle}>AI가 저장한 최신 요약을 빠르게 확인하세요.</div>
        </div>
        <button
          style={ghostButtonStyle}
          onClick={() => onChangeView && onChangeView("list")}
          disabled={!sortedEntries.length}
        >
          전체 리스트 보기
        </button>
      </div>
      {sortedEntries.length === 0 ? (
        <p style={{ ...mutedStyle, margin: "0.75rem 0" }}>아직 요약이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sortedEntries.slice(0, 3).map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                onSelectEntry && onSelectEntry(entry.id);
                onChangeView && onChangeView("detail");
              }}
              style={summaryListItemStyle}
            >
              <div style={{ fontWeight: 700, color: "#111827" }}>{entry.title}</div>
              <div style={{ ...mutedStyle, fontSize: "0.85rem" }}>
                {entry.author || "저자 미정"} {entry.year && `· ${entry.year}`}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.85rem" }}>
                업로드: {entry.uploader || "팀원 미지정"}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.8rem" }}>
                {entry.pdfName || "PDF 미첨부"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <div style={labelStyle}>논문 | 요약</div>
            <div style={{ ...mutedStyle, whiteSpace: "pre-line" }}>
              제목·저자·연도와 PDF를 업로드 해{"\n"}AI 요약을 받아보세요.
            </div>
          </div>
          <button style={ghostButtonStyle} onClick={() => onChangeView && onChangeView("list")}>
            요약 리스트 보기
          </button>
        </div>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="논문 제목"
            style={inputStyle}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <input
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              placeholder="저자"
              style={inputStyle}
            />
            <input
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              placeholder="연도"
              style={inputStyle}
            />
          </div>
          <label style={uploadLabelStyle}>
            <div>
              <div style={{ fontWeight: 700, color: "#111827" }}>PDF 추가하기</div>
              <div style={mutedStyle}>{pdfName || "파일을 선택해 주세요."}</div>
            </div>
            <div style={uploadBadgeStyle}>첨부</div>
            <input
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </label>
          {(localError || errorMessage) && (
            <div style={errorStyle}>{localError || errorMessage}</div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              style={primaryButtonStyle(isCreating || isRefreshing)}
              onClick={handleCreate}
              disabled={isCreating || isRefreshing}
            >
              {isCreating ? "요약 준비 중..." : "요약하기"}
            </button>
          </div>
        </div>
      </div>
      {renderRecentList()}
    </div>
  );

  const renderList = () => (
    <div style={sectionCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <div style={labelStyle}>논문 요약 리스트</div>
          <div style={mutedStyle}>최근 요약을 선택하면 상세 화면으로 이동합니다.</div>
        </div>
        <button style={ghostButtonStyle} onClick={() => onChangeView && onChangeView("form")}>
          리스트 화면 닫기
        </button>
      </div>
      {sortedEntries.length === 0 ? (
        <p style={{ ...mutedStyle, margin: "1rem 0" }}>저장된 요약이 없습니다. 먼저 요약을 생성해 주세요.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                onSelectEntry && onSelectEntry(entry.id);
                onChangeView && onChangeView("detail");
              }}
              style={summaryListItemStyle}
            >
              <div style={{ fontWeight: 700, color: "#111827" }}>{entry.title}</div>
              <div style={{ ...mutedStyle, fontSize: "0.9rem" }}>
                {entry.author || "저자 미정"} {entry.year && `· ${entry.year}`}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.85rem" }}>
                업로드: {entry.uploader || "팀원 미지정"}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.85rem" }}>
                {entry.pdfName || "PDF 미첨부"}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.8rem" }}>
                생성일: {new Date(entry.createdAt).toLocaleString("ko-KR")}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetail = () => (
    <div style={sectionCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <div style={labelStyle}>논문 | 요약</div>
          <div style={mutedStyle}>선택한 요약을 확인하고 리스트로 이동할 수 있습니다.</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button style={ghostButtonStyle} onClick={() => onChangeView && onChangeView("list")}>
            요약 리스트로 돌아가기
          </button>
          <button style={ghostButtonStyle} onClick={() => onChangeView && onChangeView("form")}>
            새 요약 작성
          </button>
        </div>
      </div>
      {(localError || errorMessage) && (
        <div style={{ ...errorStyle, marginBottom: "0.5rem" }}>{localError || errorMessage}</div>
      )}
      {!selectedEntry ? (
        <p style={{ ...mutedStyle, margin: "1rem 0" }}>선택된 요약이 없습니다. 리스트에서 하나를 선택하세요.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <div style={summaryMetaStyle}>
            <div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
                {selectedEntry.title}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.95rem" }}>
                {selectedEntry.author || "저자 미정"} {selectedEntry.year && `· ${selectedEntry.year}`}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.9rem" }}>
                업로드: {selectedEntry.uploader || "팀원 미지정"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...mutedStyle, fontSize: "0.9rem" }}>
                첨부: {selectedEntry.pdfName || "PDF 미첨부"}
              </div>
              <div style={{ ...mutedStyle, fontSize: "0.85rem" }}>
                생성일: {new Date(selectedEntry.createdAt).toLocaleString("ko-KR")}
              </div>
            </div>
          </div>
          {isEditing ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <input
                style={inputStyle}
                value={editFields.title}
                onChange={(e) => setEditFields((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="논문 제목"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <input
                  style={inputStyle}
                  value={editFields.author}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="저자"
                />
                <input
                  style={inputStyle}
                  value={editFields.year}
                  onChange={(e) => setEditFields((prev) => ({ ...prev, year: e.target.value }))}
                  placeholder="연도"
                />
              </div>
              <input
                style={inputStyle}
                value={editFields.pdfName}
                onChange={(e) => setEditFields((prev) => ({ ...prev, pdfName: e.target.value }))}
                placeholder="PDF 파일명"
              />
              <textarea
                rows={6}
                style={{ ...inputStyle, height: "180px" }}
                value={editFields.summary}
                onChange={(e) => setEditFields((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="요약 내용을 수정하세요"
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  style={primaryButtonStyle(busyId === selectedEntryId)}
                  onClick={handleUpdate}
                  disabled={busyId === selectedEntryId}
                >
                  {busyId === selectedEntryId ? "수정 중..." : "저장"}
                </button>
                <button
                  style={ghostButtonStyle}
                  onClick={() => setIsEditing(false)}
                  disabled={busyId === selectedEntryId}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={summaryBodyStyle}>
                <pre style={summaryTextStyle}>{selectedEntry.summary}</pre>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  style={primaryButtonStyle(false)}
                  onClick={() => setIsEditing(true)}
                  disabled={busyId === selectedEntryId}
                >
                  수정
                </button>
                <button
                  style={ghostButtonStyle}
                  onClick={handleDelete}
                  disabled={busyId === selectedEntryId}
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={panelShellStyle}>
      {isRefreshing && (
        <div style={loadingBannerStyle}>요약 리스트를 불러오는 중입니다...</div>
      )}
      {viewMode === "list" && renderList()}
      {viewMode === "detail" && renderDetail()}
      {viewMode === "form" && renderForm()}
    </div>
  );
}

const panelShellStyle = {
  padding: "1rem",
  margin: "0.5rem",
  background: "rgba(255, 255, 255, 0.96)",
  borderRadius: 18,
  boxShadow: "0 18px 28px rgba(15, 23, 42, 0.12)",
  minHeight: "100%",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const loadingBannerStyle = {
  padding: "0.5rem 0.75rem",
  marginBottom: "0.6rem",
  background: "#eef2ff",
  color: "#3730a3",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: "0.9rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: "0.95rem",
};

const sectionCardStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: "1.25rem",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

const listCardStyle = {
  background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
  borderRadius: 16,
  padding: "1.25rem",
  border: "1px solid #e0e7ff",
  boxShadow: "0 10px 24px rgba(79, 70, 229, 0.08)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
  alignItems: "flex-start",
  marginBottom: "0.75rem",
};

const labelStyle = {
  fontWeight: 800,
  color: "#111827",
  fontSize: "1.05rem",
};

const mutedStyle = {
  color: "#6b7280",
  fontSize: "0.9rem",
};

const primaryButtonStyle = (disabled = false) => ({
  border: "none",
  borderRadius: 12,
  padding: "0.75rem 1.2rem",
  fontWeight: 800,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.65 : 1,
  background: "linear-gradient(135deg, #22c55e, #14b8a6)",
  color: "#fff",
  boxShadow: "0 12px 24px rgba(20, 184, 166, 0.25)",
});

const ghostButtonStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "0.55rem 0.85rem",
  background: "#fff",
  color: "#1f2937",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const uploadLabelStyle = {
  border: "1px dashed #c7d2fe",
  padding: "0.85rem 1rem",
  borderRadius: 12,
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

const uploadBadgeStyle = {
  background: "#4f46e5",
  color: "#fff",
  padding: "0.5rem 0.9rem",
  borderRadius: 999,
  fontWeight: 700,
  boxShadow: "0 10px 20px rgba(79, 70, 229, 0.18)",
};

const errorStyle = {
  color: "#dc2626",
  fontWeight: 700,
  fontSize: "0.9rem",
};

const summaryListItemStyle = {
  textAlign: "left",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.8rem 0.9rem",
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 8px 16px rgba(15, 23, 42, 0.05)",
};

const summaryMetaStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
  alignItems: "flex-start",
  padding: "0.85rem 0.75rem",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const summaryBodyStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "1rem",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.2)",
};

const summaryTextStyle = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  lineHeight: 1.5,
  fontSize: "0.95rem",
};

export default SummaryPanel;
