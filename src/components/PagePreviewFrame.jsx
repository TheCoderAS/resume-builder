import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { resolvePageSetup } from "../utils/resumePreview.js";

export default function PagePreviewFrame({ styles, className = "", children }) {
  const containerRef = useRef(null);
  const page = useMemo(() => resolvePageSetup(styles?.page), [styles]);
  const [scale, setScale] = useState(1);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const target =
      containerRef.current.parentElement ?? containerRef.current;
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth =
        target.clientWidth || target.getBoundingClientRect().width;
      if (!availableWidth) return;
      const nextScale = Math.min(availableWidth / page.width, 1);
      const normalized = Number.isFinite(nextScale) ? nextScale : 1;
      setScale(normalized);
      if (!isReady) setIsReady(true);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(target);
    return () => observer.disconnect();
  }, [page.width, isReady]);

  const scaledWidth = Math.round(page.width * scale);
  const scaledHeight = Math.round(page.height * scale);

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 ${className}`}
      style={{ maxWidth: "100%" }}
    >
      {isReady && <div
        className="flex justify-center overflow-auto"
        style={{ height: `${scaledHeight}px`, maxWidth: "100%" }}
      >
        <div style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
          {isReady ? (
            <div
              style={{
                width: `${page.width}px`,
                height: `${page.height}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>}
    </div>
  );
}
