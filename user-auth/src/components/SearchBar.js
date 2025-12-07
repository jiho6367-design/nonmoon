// src/components/SearchBar.js
import React, { useState } from "react";
import { searchCards } from "../services/api";

function SearchBar({ onSearchResult }) {
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const queryTrimmed = query.trim();
    const authorTrimmed = authorFilter.trim();
    const yearTrimmed = yearFilter.trim();
    const hasFilterInput = queryTrimmed || authorTrimmed || yearTrimmed || onlyBookmarked;

    if (!hasFilterInput) {
      alert("본문/주제 검색어 혹은 필터를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        query: queryTrimmed,
        author: authorTrimmed,
        year: yearTrimmed,
        sort: sortOrder,
        mode: "text",
        onlyBookmarked,
      };

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

        if (normalized.query) {
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

      const processed = filtered
        .slice()
        .sort((a, b) => {
          const aDate = Date.parse(a.createdAt || 0);
          const bDate = Date.parse(b.createdAt || 0);
          return sortOrder === "recent" ? bDate - aDate : aDate - bDate;
        });

      onSearchResult && onSearchResult(processed);
    } catch (error) {
      console.error(error);
      alert("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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
          placeholder="본문/주제 검색어"
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
          disabled={loading}
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
      </div>

      <button
        type="submit"
        disabled={loading || !query.trim()}
        style={buttonStyle}
      >
        {loading ? "검색 중.." : "검색"}
      </button>
    </form>
  );
}

export default SearchBar;
