import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildHTML } from "../utils/TemplateToHTML.js";

const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 },
};

export function TemplatePreview({ template, resumeJson, className }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const page = useMemo(() => {
    const sizeKey = template?.page?.size ?? "A4";
    return PAGE_SIZES[sizeKey] ?? PAGE_SIZES.A4;
  }, [template?.page?.size]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(buildHTML(template, resumeJson));
    doc.close();
  }, [template, resumeJson]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth =
        containerRef.current.getBoundingClientRect().width;
      if (!availableWidth) return;
      const nextScale = Math.min(availableWidth / page.width, 1);
      const normalized = Number.isFinite(nextScale) ? nextScale : 1;
      setScale(normalized);
      if (!isReady) setIsReady(true);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page.width, isReady]);

  const scaledHeight = Math.round(page.height * scale);

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 ${className ?? ""}`}
      style={{ maxWidth: "100%" }}
    >
      {isReady ? (
        <div
          className="relative w-full overflow-hidden"
          style={{ height: `${scaledHeight}px` }}
        >
          <iframe
            ref={iframeRef}
            title="Template preview"
            style={{
              position: "absolute",
              inset: 0,
              width: `${page.width}px`,
              height: `${page.height}px`,
              border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
