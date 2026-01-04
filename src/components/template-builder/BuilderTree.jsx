import { FiChevronDown, FiChevronUp, FiCopy, FiTrash2 } from "react-icons/fi";

export default function BuilderTree({
  node,
  selected,
  onSelect,
  onDelete,
  depth = 0,
  isOpen,
  onToggle,
  expandedNodes,
  onMove,
  onDuplicate,
  siblingIndex,
  siblingCount,
  readOnly = false,
}) {
  const isSelected = selected === node.id;
  const canDelete = !readOnly && node.id !== "root";
  const canDuplicate = !readOnly && node.id !== "root";
  const hasChildren = Boolean(node.children?.length);
  const canReorder = Boolean(
    onMove &&
      typeof siblingIndex === "number" &&
      typeof siblingCount === "number" &&
      siblingCount > 1 &&
      !readOnly
  );
  const canMoveUp = canReorder && siblingIndex > 0;
  const canMoveDown = canReorder && siblingIndex < siblingCount - 1;

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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!readOnly) onMove?.(node.id, "up");
            }}
            disabled={!canMoveUp}
            className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600 ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Move ${node.type} up`}
          >
            <FiChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!readOnly) onMove?.(node.id, "down");
            }}
            disabled={!canMoveDown}
            className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600 ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Move ${node.type} down`}
          >
            <FiChevronDown className="h-4 w-4" />
          </button>
          {canDuplicate ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!readOnly) onDuplicate?.(node.id);
              }}
              className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100 ${
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              aria-label={`Duplicate ${node.type}`}
            >
              <FiCopy className="h-4 w-4" />
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!readOnly) onDelete?.(node.id);
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
      </div>

      {isOpen
        ? node.children?.map((child, index) => (
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
              onMove={onMove}
              onDuplicate={onDuplicate}
              readOnly={readOnly}
              siblingIndex={index}
              siblingCount={node.children?.length ?? 0}
            />
          ))
        : null}
    </div>
  );
}
