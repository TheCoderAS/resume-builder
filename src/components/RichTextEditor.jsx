import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FaBold,
  FaItalic,
  FaListOl,
  FaListUl,
  FaStrikethrough,
} from "react-icons/fa6";

const COMMANDS = [
  {
    id: "bold",
    label: <FaBold size={12} aria-hidden="true" />,
    command: "bold",
    title: "Bold",
  },
  {
    id: "italic",
    label: <FaItalic size={12} aria-hidden="true" />,
    command: "italic",
    title: "Italic",
  },
  {
    id: "unorderedList",
    label: <FaListUl size={12} aria-hidden="true" />,
    command: "insertUnorderedList",
    title: "Unordered list",
  },
  {
    id: "orderedList",
    label: <FaListOl size={12} aria-hidden="true" />,
    command: "insertOrderedList",
    title: "Ordered list",
  },
  {
    id: "strikeThrough",
    label: <FaStrikethrough size={12} aria-hidden="true" />,
    command: "strikeThrough",
    title: "Strike-through",
  },
];

const isHtmlValue = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeHtmlValue = (value) => {
  if (!value) return "";
  if (isHtmlValue(value)) return value;
  return escapeHtml(value).replaceAll("\n", "<br>");
};

const isEmptyHtml = (value) => {
  if (!value) return true;
  const container = document.createElement("div");
  container.innerHTML = value;
  const text = container.textContent?.trim() ?? "";
  const hasList = container.querySelector("ul,ol,li");
  return text.length === 0 && !hasList;
};

export default function RichTextEditor({
  value = "",
  placeholder = "",
  required = false,
  maxLength,
  onChange,
}) {
  const editorRef = useRef(null);
  const lastValueRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(isEmptyHtml(value));
  const [activeCommands, setActiveCommands] = useState(new Set());

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const nextHtml = normalizeHtmlValue(String(value ?? ""));
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
    lastValueRef.current = value;
    setIsEmpty(isEmptyHtml(nextHtml));
  }, [value]);

  const updateActiveCommands = () => {
    if (!editorRef.current) return;
    const selection = document.getSelection();
    if (!selection?.rangeCount) return;
    if (!editorRef.current.contains(selection.anchorNode)) {
      setActiveCommands(new Set());
      return;
    }
    const nextActive = new Set();
    COMMANDS.forEach((item) => {
      if (item.command && document.queryCommandState(item.command)) {
        nextActive.add(item.id);
      }
    });
    setActiveCommands(nextActive);
  };

  useEffect(() => {
    const handleSelection = () => {
      updateActiveCommands();
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const handleInput = () => {
    const nextValue = editorRef.current?.innerHTML ?? "";
    lastValueRef.current = nextValue;
    setIsEmpty(isEmptyHtml(nextValue));
    onChange?.(nextValue);
    updateActiveCommands();
  };

  const applyCommand = (command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, null);
    handleInput();
    updateActiveCommands();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleKeyDown = (event) => {
    if (!maxLength) return;
    const text = editorRef.current?.textContent ?? "";
    if (text.length >= maxLength && event.key.length === 1) {
      event.preventDefault();
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 py-1.5">
        {COMMANDS.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand(item.command)}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              activeCommands.has(item.id)
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-800 text-slate-200 hover:border-slate-600 hover:text-white"
            }`}
          >
            <span className="block h-3.5 w-3.5">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className="relative px-3 py-2 text-sm text-slate-100">
        {isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-slate-500">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-required={required}
          className="min-h-[84px] outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-1"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={updateActiveCommands}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
