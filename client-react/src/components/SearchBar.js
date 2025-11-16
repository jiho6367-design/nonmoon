// src/components/SearchBar.js
import React, { useState } from "react";
import { searchCards } from "../services/api";

function SearchBar({ onSearchResult }) {
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [mode, setMode] = useState("text");
  const [minScore, setMinScore] = useState(0.7);
  const [limit, setLimit] = useState(20);
  const [sortOrder, setSortOrder] = useState("recent");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const queryTrimmed = query.trim();
    const authorTrimmed = authorFilter.trim();
    const yearTrimmed = yearFilter.trim();
    const hasFilterInput = queryTrimmed || authorTrimmed || yearTrimmed;

    if (mode === "text" && !hasFilterInput) {
      alert("본문/저자/연도 중 하나 이상을 입력해주세요.");
      return;
    }

    if (mode === "semantic" && !queryTrimmed) {
      alert("시맨틱 검색은 본문/주제 검색어가 필요합니다.");
      return;
    }

    setLoading(true);
    try {
      const normalizedLimit = (() => {
        const numeric = Number(limit);
        if (!Number.isFinite(numeric)) return 20;
        return Math.min(100, Math.max(1, Math.floor(numeric)));
      })();

      const payload = {
        query: queryTrimmed,
        author: authorTrimmed,
        year: yearTrimmed,
        sort: sortOrder,
        mode,
        limit: normalizedLimit,
        onlyBookmarked,
      };

      if (mode === "semantic") {
        payload.minScore = Math.min(
          1,
          Math.max(0, Number(minScore) || 0.7)
        );
      }

      const normalized = {
        query: queryTrimmed.toLowerCase(),
        author: authorTrimmed.toLowerCase(),
        year: yearTrimmed.replace(/[^0-9]/g, ""),
      };

      const result = await searchCards(payload);
      const filtered = (result || []).filter((card) => {
        if (onlyBookmarked && !card.isBookmarked) {
          return false;
        }
        const authorMatch = normalized.author
          ? (card.author || "").toLowerCase().includes(normalized.author)
          : true;
        if (!authorMatch) return false;

        if (normalized.year) {
          const cardYearDigits = String(card.year ?? "").replace(/[^0-9]/g, "");
          if (!cardYearDigits.includes(normalized.year)) {
            return false;
          }
        }

        if (mode === "text" && normalized.query) {
          const haystacks = [
            card.quote,
            card.topic,
            card.note,
            card.author,
            card.sourceTitle,
          ]
            .filter(Boolean)
            .map((text) => text.toLowerCase());
          return haystacks.some((haystack) => haystack.includes(normalized.query));
        }

        return true;
      });

      let processed = filtered;
      if (mode === "text") {
        processed = filtered
          .slice()
          .sort((a, b) => {
            const aDate = Date.parse(a.createdAt || 0);
            const bDate = Date.parse(b.createdAt || 0);
            return sortOrder === "recent" ? bDate - aDate : aDate - bDate;
          });
      }

      onSearchResult && onSearchResult(processed);
    } catch (error) {
      console.error(error);
      alert("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      onSearchResult && onSearchResult([]);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    marginBottom: "1.5rem",
    padding: "1rem",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.8)",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    backdropFilter: "blur(6px)",
  };

  const inputStyle = {
    flex: "1 1 220px",
    padding: "0.65rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #dfe3eb",
    background: "#fff",
    fontSize: "0.95rem",
  };

  const buttonStyle = {
    marginTop: "0.75rem",
    padding: "0.65rem 1.5rem",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(135deg, #5b8def, #5fe4c5)",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(91, 141, 239, 0.3)",
  };

  const toggleButtonStyle = (value) => ({
    flex: 1,
    padding: "0.5rem 1rem",
    borderRadius: "999px",
    border: "1px solid #dfe3eb",
    background:
      mode === value ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "#fff",
    color: mode === value ? "#fff" : "#374151",
    fontWeight: 600,
    cursor: "pointer",
  });

  const selectStyle = {
    minWidth: "160px",
    padding: "0.55rem 0.8rem",
    borderRadius: "8px",
    border: "1px solid #dfe3eb",
    background: "#fff",
    fontSize: "0.95rem",
  };

  return (
    <form style={containerStyle} onSubmit={handleSearch}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="본문/주제 검색"
          style={inputStyle}
        />
        <input
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          placeholder="저자 필터"
          style={inputStyle}
        />
        <input
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          placeholder="연도 (예: 2023)"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setMode("text")}
          style={toggleButtonStyle("text")}
          disabled={loading}
        >
          텍스트 검색
        </button>
        <button
          type="button"
          onClick={() => setMode("semantic")}
          style={toggleButtonStyle("semantic")}
          disabled={loading}
        >
          시맨틱 검색
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginTop: "0.75rem",
          alignItems: "center",
        }}
      >
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={selectStyle}
          disabled={loading || mode !== "text"}
        >
          <option value="recent">최신순</option>
          <option value="oldest">과거순</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <input
            type="checkbox"
            checked={onlyBookmarked}
            onChange={(e) => setOnlyBookmarked(e.target.checked)}
            disabled={loading}
          />
          북마크만
        </label>
        {mode === "semantic" && (
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: "0.85rem", color: "#4b5563" }}>
              최소 유사도 ({(minScore * 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>
        )}
        {mode === "semantic" && (
          <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", color: "#4b5563" }}>
            최대 개수
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ marginTop: "0.25rem", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #dfe3eb" }}
              disabled={loading}
            />
          </label>
        )}
      </div>

      {mode === "semantic" && (
        <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
          시맨틱 검색은 본문/주제 문구를 기준으로 최대 20개의 유사 카드를 반환합니다.
        </p>
      )}

      <button
        type="submit"
        disabled={loading || (mode === "semantic" && !query.trim())}
        style={buttonStyle}
      >
        {loading ? "검색 중..." : "검색"}
      </button>
    </form>
  );
}

export default SearchBar;
