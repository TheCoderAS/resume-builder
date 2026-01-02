import BuilderTree from "./BuilderTree.jsx";

export default function BuilderNodePanel({
  nodeTypes,
  loadError,
  loadNotice,
  isLegacy,
  onAddNode,
  onExpandAll,
  onCollapseAll,
  treeRoot,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  expandedNodes,
  onToggleNode,
  selectedNode,
  canAddChild,
  onMoveNode,
}) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:w-72 lg:border-r lg:rounded-r-none">
      <div className="mb-4 border-b border-slate-800/70 pb-4">
        <h4 className="text-sm font-semibold text-slate-200">Add Node</h4>
        <p className="mt-1 text-xs text-slate-400">
          Build layouts with reusable blocks.
        </p>
        {loadError ? (
          <p className="mt-2 text-xs text-rose-400">{loadError}</p>
        ) : null}
        {loadNotice ? (
          <p className="mt-2 text-xs text-indigo-300">{loadNotice}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {nodeTypes.map((type) => (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              type="button"
              disabled={isLegacy || !canAddChild}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-200">Tree</h4>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-400">
            <button
              type="button"
              onClick={onExpandAll}
              className="rounded-full border border-slate-700 px-2 py-0.5 transition hover:border-indigo-400 hover:text-slate-100"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-full border border-slate-700 px-2 py-0.5 transition hover:border-indigo-400 hover:text-slate-100"
            >
              Collapse all
            </button>
          </div>
        </div>
        <div className="mt-3 max-h-[60vh] overflow-auto space-y-1 md:max-h-[37vh] lg:max-h-[37vh]">
          <BuilderTree
            node={treeRoot}
            selected={selectedNodeId}
            onSelect={onSelectNode}
            onDelete={onDeleteNode}
            isOpen={expandedNodes.has(treeRoot.id)}
            onToggle={onToggleNode}
            expandedNodes={expandedNodes}
            onMove={onMoveNode}
            isLegacy={isLegacy}
          />
        </div>
        {selectedNode && (
          <div className="mt-3 text-xs text-slate-400">
            Selected:{" "}
            <span className="font-semibold text-slate-200">
              {selectedNode.type}
            </span>{" "}
            <span className="text-slate-500">({selectedNode.id})</span>
          </div>
        )}
      </div>
    </aside>
  );
}
