import React, { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
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
  const [reload, setReload] = useState(0);

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
    setRendering(false);
    hostRef.current.replaceChildren();
    const controller = new AbortController();
    let task;
    let timedOut = false;
    let rejectTimeout;
    const deadline = new Promise((_, reject) => {
      rejectTimeout = reject;
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      rejectTimeout(new Error("PDF_TIMEOUT"));
    }, 30000);
    const load = async () => {
      const response = await fetch(fileUrl, {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const message =
          response.status === 401
            ? "로그인이 만료되었습니다. 다시 로그인한 뒤 원문을 열어 주세요."
            : response.status === 403
              ? "이 논문의 원문을 볼 권한이 없습니다. 팀 소속을 확인해 주세요."
              : response.status === 404
                ? "원본 PDF 파일을 찾을 수 없습니다. 업로드한 파일이 보관되어 있는지 확인해 주세요."
                : `PDF 파일 요청에 실패했습니다. (HTTP ${response.status})`;
        throw Object.assign(new Error(message), { userMessage: message });
      }
      const data = new Uint8Array(await response.arrayBuffer());
      if (cancelled) return null;
      if (String.fromCharCode(...data.subarray(0, 5)) !== "%PDF-") {
        const message =
          "서버에서 PDF 대신 다른 응답을 받았습니다. 로그인과 실행 주소를 확인해 주세요.";
        throw Object.assign(new Error(message), { userMessage: message });
      }
      task = getDocument({ data });
      return task.promise;
    };
    Promise.race([load(), deadline])
      .then((document) => {
        if (!cancelled && document) setPdf(document);
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(
            timedOut
              ? "PDF를 불러오는 시간이 초과됐습니다. 서버 연결을 확인한 뒤 다시 불러와 주세요."
              : failure.userMessage ||
                  (failure.name === "InvalidPDFException"
                    ? "PDF가 손상되었거나 지원하지 않는 형식입니다. 원본 파일을 확인해 주세요."
                    : failure.name === "PasswordException"
                      ? "암호로 보호된 PDF입니다. 암호를 해제한 파일을 업로드해 주세요."
                      : "PDF 읽기 모듈 또는 연결에 문제가 생겼습니다. 다시 불러오기를 누르거나 새 창에서 원문을 확인해 주세요."),
          );
          task?.destroy().catch(() => {});
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
      task?.destroy().catch(() => {});
    };
  }, [fileUrl, reload]);

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
        <div className="pdf-reader-error">
          <p role="alert">{error}</p>
          <button
            className="secondary"
            type="button"
            onClick={() => setReload((value) => value + 1)}
          >
            PDF 다시 불러오기
          </button>
        </div>
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
