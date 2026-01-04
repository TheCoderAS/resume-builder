import { useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import AppShell from "../components/AppShell.jsx";
import Input from "../components/Input.jsx";

const FAQS = [
  {
    question: "How do I share my resume?",
    answer:
      "Enable the public link in the Export & publish step. You can then copy the shareable URL.",
  },
  {
    question: "Can I customize templates after publishing?",
    answer:
      "Yes. Edit the resume or duplicate a template, then publish the updated version.",
  },
  {
    question: "Why is my template read-only?",
    answer:
      "Templates owned by other users are read-only. Copy them to customize.",
  },
  {
    question: "How do I delete a resume?",
    answer:
      "Go to Resumes and use the menu on a resume card to delete it permanently.",
  },
  {
    question: "How do I start a template and define fields?",
    answer: [
      "Go to Templates and choose New template. The builder has three layers: fields (data), nodes (layout), and theme (style).",
      "Fields panel: Create fields first so nodes can bind to them. Each field has an ID (used for binding), label (shown to users), placeholder, input type (text, textarea, email, phone, url, date, inline-bullets, inline-chips), and optional max length.",
      {
        label: "Field tips",
        list: [
          "Use consistent IDs like profile_name or work_company.",
          "Changing a field ID breaks existing bindings.",
          "Fields define what appears in the resume form.",
        ],
      },
    ],
  },
  {
    question: "How does the builder tree work?",
    answer: [
      "Use Add Node or the Tree to build layout. The tree shows the structure and lets you reorder, duplicate, and delete nodes.",
      {
        label: "Tree workflow",
        list: [
          "Select a node to edit its settings in the inspector.",
          "Use the arrows to reorder sibling nodes within the same parent.",
          "Duplicate copies a node (including children) so you can reuse layouts.",
          "Delete removes the node and its children.",
        ],
      },
      {
        label: "Node types",
        list: [
          "Section: A titled block. Sections can show/hide titles and dividers (global settings control defaults).",
          "Row: Horizontal container. Use multiple columns inside a row.",
          "Column: Vertical container. Place text nodes inside columns.",
          "Text: Leaf node that renders a bound field.",
          "Repeat: List container. Put one child inside it; it repeats per item.",
        ],
      },
    ],
  },
  {
    question: "How do I bind data to nodes?",
    answer: [
      "Select a text node and bind it to a field ID. This is how data appears in the preview and resume form.",
      "If a node is inside a repeat, the bound field becomes part of each repeated item.",
      "For single-item fields (like full name), bind the text node outside repeat blocks.",
      {
        label: "Repeat blocks",
        list: [
          "Repeat nodes should have a single child layout (often a column).",
          "Use repeat for experience entries, education items, or skill chips.",
          "Each repeat item maps to one entry in the resume form.",
        ],
      },
    ],
  },
  {
    question: "How do global settings affect the template?",
    answer: [
      "Global settings control typography, spacing, colors, and section styles across the template.",
      {
        label: "Global settings details",
        list: [
          "Fonts: Body font applies to all text; headings follow section title style.",
          "Typography: Base font size scales all text; line height controls readability.",
          "Spacing: Gap controls row/column spacing; section gap controls vertical spacing between sections.",
          "Colors: Primary color applies to text; section divider color applies to section lines.",
          "Section title style: Toggle uppercase/capitalization and set size/weight/style globally.",
          "Dividers: Enable/disable section and title dividers globally; per-section toggle can override visibility.",
        ],
      },
      {
        label: "Preview and test",
        list: [
          "Preview updates as you build.",
          "In the resume editor, fields appear based on your field list.",
          "Use inline-chips or inline-bullets for list-style inputs.",
        ],
      },
    ],
  },
];

export default function Faqs() {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [faqQuery, setFaqQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const query = faqQuery.trim().toLowerCase();
    if (!query) return FAQS;
    return FAQS.filter((item) =>
      [item.question, item.answer].some((text) =>
        text.toLowerCase().includes(query)
      )
    );
  }, [faqQuery]);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="app-title">FAQs</h1>
            <p className="app-subtitle">
              Quick answers to common questions.
            </p>
          </div>
        </header>

        <section className="app-card flex flex-col gap-4">
          <Input
            label="Search FAQs"
            placeholder="Search FAQs..."
            value={faqQuery}
            onChange={(event) => setFaqQuery(event.target.value)}
          />
          <div className="flex flex-col gap-3">
            {filteredFaqs.length === 0 ? (
              <p className="text-sm text-slate-400">
                No FAQs match that search.
              </p>
            ) : (
              filteredFaqs.map((item, index) => {
                const isOpen = openFaqIndex === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;
                return (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-100"
                      onClick={() =>
                        setOpenFaqIndex(isOpen ? null : index)
                      }
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      id={buttonId}
                    >
                      {item.question}
                      <span className={`transition ${isOpen ? "rotate-180" : ""}`}>
                        <FiChevronDown />
                      </span>
                    </button>
                    {isOpen ? (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="mt-3 space-y-3 text-sm text-slate-300"
                      >
                        {Array.isArray(item.answer)
                          ? item.answer.map((entry, entryIndex) => {
                              if (typeof entry === "string") {
                                return <p key={entryIndex}>{entry}</p>;
                              }
                              if (entry?.list) {
                                return (
                                  <div key={entryIndex} className="space-y-2">
                                    {entry.label ? (
                                      <p className="text-sm font-semibold text-slate-200">
                                        {entry.label}
                                      </p>
                                    ) : null}
                                    <ul className="list-disc space-y-1 pl-5">
                                      {entry.list.map((itemText, listIndex) => (
                                        <li key={listIndex}>{itemText}</li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              }
                              return null;
                            })
                          : (
                            <p>{item.answer}</p>
                          )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
