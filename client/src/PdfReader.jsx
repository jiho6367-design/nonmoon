import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./pdf-reader.css";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfReader({ fileUrl, page, onPageChange, title }) {
  const hostRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [width, setWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [pageText, setPageText] = useState("");
  const [textError, setTextError] = useState("");
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    const element = hostRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(160, Math.floor(entry.contentRect.width - 24)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setError("");
    setPageText("");
    setLoading(true);
    const task = getDocument({ url: fileUrl, withCredentials: true });
    task.promise
      .then((document) => {
        if (!cancelled) setPdf(document);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "PDF를 불러오지 못했습니다. 새 창에서 열거나 다운로드해 주세요.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      task.destroy().catch(() => {});
    };
  }, [fileUrl]);

  useEffect(() => {
    if (pdf && (page < 1 || page > pdf.numPages))
      onPageChange(Math.min(Math.max(page, 1), pdf.numPages));
  }, [pdf, page, onPageChange]);

  useEffect(() => setPageInput(String(page)), [page]);

  useEffect(() => {
    if (!pdf || !width || page < 1 || page > pdf.numPages) return;
    let cancelled = false;
    let renderTask;
    // A fresh canvas isolates cancelled work from subsequent page renders.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${title}, ${page}페이지`);
    hostRef.current.replaceChildren(canvas);
    setRendering(true);
    setError("");
    setPageText("");
    setTextError("");
    (async () => {
      try {
        const current = await pdf.getPage(page);
        if (cancelled) return;
        const original = current.getViewport({ scale: 1 });
        const viewport = current.getViewport({ scale: width / original.width });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = current.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
        if (cancelled) return;
        setRendering(false);
        try {
          const content = await current.getTextContent();
          if (!cancelled)
            setPageText(
              content.items
                .filter((item) => "str" in item)
                .map((item) => item.str + (item.hasEOL ? "\n" : " "))
                .join("")
                .trim(),
            );
        } catch {
          if (!cancelled)
            setTextError("이 페이지의 텍스트를 추출하지 못했습니다.");
        }
      } catch (failure) {
        if (!cancelled && failure.name !== "RenderingCancelledException") {
          setError(
            "페이지를 표시하지 못했습니다. 새 창에서 원문을 확인해 주세요.",
          );
          setRendering(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      canvas.remove();
    };
  }, [pdf, width, page, title]);

  const applyPage = (event) => {
    event.preventDefault();
    const selected = Number(pageInput);
    if (
      pdf &&
      Number.isInteger(selected) &&
      selected >= 1 &&
      selected <= pdf.numPages
    )
      onPageChange(selected);
    else setPageInput(String(page));
  };

  return (
    <div className="pdf-reader" data-testid="pdf-reader">
      <div className="pdf-reader-controls">
        <button
          type="button"
          disabled={!pdf || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="이전 PDF 페이지"
        >
          ← 이전
        </button>
        <form onSubmit={applyPage}>
          <label htmlFor="pdf-page-number" className="sr-only">
            PDF 페이지 번호
          </label>
          <input
            id="pdf-page-number"
            type="number"
            min="1"
            max={pdf?.numPages || 1}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            disabled={!pdf}
          />
          <span>/ {pdf?.numPages || "—"}</span>
          <button type="submit" disabled={!pdf}>
            이동
          </button>
        </form>
        <button
          type="button"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="다음 PDF 페이지"
        >
          다음 →
        </button>
      </div>
      {(loading || rendering) && (
        <p className="pdf-reader-status" role="status">
          {loading ? "PDF를 불러오는 중…" : `${page}페이지를 그리는 중…`}
        </p>
      )}
      {error && (
        <p className="pdf-reader-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="pdf-canvas-host"
        ref={hostRef}
        aria-busy={loading || rendering}
      />
      {pdf && (
        <details className="pdf-page-text">
          <summary>현재 페이지 텍스트 · 인용문 복사</summary>
          <p>
            추출된 문장은 줄 순서가 원문과 다를 수 있습니다. 인용 전에 PDF와
            대조하세요.
          </p>
          {textError ? (
            <p role="status">{textError}</p>
          ) : (
            <pre tabIndex="0">
              {pageText ||
                (rendering
                  ? "텍스트를 불러오는 중…"
                  : "추출 가능한 텍스트가 없습니다. 이미지로 된 페이지는 원문을 확인하세요.")}
            </pre>
          )}
        </details>
      )}
    </div>
  );
}
