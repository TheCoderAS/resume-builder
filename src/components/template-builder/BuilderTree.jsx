import { FiTrash2 } from "react-icons/fi";

export default function BuilderTree({
  node,
  selected,
  onSelect,
  onDelete,
  depth = 0,
  isOpen,
  onToggle,
  expandedNodes,
}) {
  const isSelected = selected === node.id;
  const canDelete = node.id !== "root";
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className="space-y-1">
      <div
        className={`group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition ${
          isSelected
            ? "bg-indigo-500/20 text-indigo-100"
            : "text-slate-300 hover:bg-slate-800/70"
        }`}
        style={{ marginLeft: depth * 12 }}
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) onToggle?.(node.id);
            }}
            className={`flex h-5 w-5 items-center justify-center rounded-md border border-transparent text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-slate-200 ${
              hasChildren ? "" : "opacity-0"
            }`}
            disabled={!hasChildren}
            aria-label={isOpen ? "Collapse node" : "Expand node"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
          <span className="font-semibold text-slate-100">{node.type}</span>
          <span className="text-[11px] text-slate-500">({node.id})</span>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(node.id);
            }}
            className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-800/80 hover:text-rose-300 ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Delete ${node.type}`}
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isOpen
        ? node.children?.map((child) => (
            <BuilderTree
              key={child.id}
              node={child}
              selected={selected}
              onSelect={onSelect}
              onDelete={onDelete}
              depth={depth + 1}
              isOpen={expandedNodes?.has(child.id)}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))
        : null}
    </div>
  );
}
