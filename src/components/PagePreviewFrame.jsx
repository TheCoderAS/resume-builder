import { useEffect, useMemo, useRef, useState } from "react";
import { resolvePageSetup } from "../utils/resumePreview.js";

export default function PagePreviewFrame({ styles, className = "", children }) {
  const containerRef = useRef(null);
  const page = useMemo(() => resolvePageSetup(styles?.page), [styles]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth } = containerRef.current;
      if (!clientWidth) return;
      const nextScale = Math.min(clientWidth / page.width, 1);
      setScale(Number.isFinite(nextScale) ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page.width]);

  const scaledHeight = Math.round(page.height * scale);

  return (
    <div
      ref={containerRef}
      className={`flex justify-center overflow-auto ${className}`}
      style={{ height: `${scaledHeight}px`, maxWidth: "100%" }}
    >
      <div
        style={{
          width: `${page.width}px`,
          height: `${page.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
