import { useEffect, useRef } from "react";
import { buildHTML } from "../utils/TemplateToHTML.js";

export function TemplatePreview({ template, resumeJson }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(buildHTML(template, resumeJson));
    doc.close();
  }, [template, resumeJson]);

  return (
    <iframe
      ref={iframeRef}
      title="Template preview"
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid #ddd",
        background: "white",
      }}
    />
  );
}
