import { useEffect, useRef } from "react";
import { buildHTML } from "../utils/TemplateToHTML.js";

export function TemplatePreview({ template, resumeJson, className }) {
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
      className={className}
    />
  );
}
