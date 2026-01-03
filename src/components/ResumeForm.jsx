import Button from "./Button.jsx";
import RichTextEditor from "./RichTextEditor.jsx";

const INPUT_TYPES = ["text", "textarea", "email", "phone", "url", "date"];

export default function ResumeForm({ template, values, onChange }) {
  const fields = template?.fields || {};
  const entries = Object.entries(fields);
  const root = template?.layout?.root;

  const ensureArray = (value) => (Array.isArray(value) ? value : []);

  const getScopeValues = (repeatPath) =>
    repeatPath.reduce((scope, entry) => {
      const items = ensureArray(scope?.[entry.id]);
      return items[entry.index] ?? {};
    }, values || {});

  const updateItemAtPath = (repeatPath, updater) => {
    const applyUpdate = (scopeValues, path) => {
      if (path.length === 0) {
        return updater(scopeValues || {});
      }
      const [current, ...rest] = path;
      const items = ensureArray(scopeValues?.[current.id]);
      const item = items[current.index] ?? {};
      const nextItem = applyUpdate(item, rest);
      const nextItems = items.map((entry, idx) =>
        idx === current.index ? nextItem : entry
      );
      return { ...(scopeValues || {}), [current.id]: nextItems };
    };

    return applyUpdate(values, repeatPath);
  };

  const hasBindableFields = (node) => {
    if (!node) return false;
    if (node.bindField && fields[node.bindField]) return true;
    if (node.type === "repeat") {
      return hasBindableFields(node.children?.[0]);
    }
    return Boolean(node.children?.some((child) => hasBindableFields(child)));
  };

  const buildRepeatItem = (node) => {
    if (!node) return {};
    const result = {};
    if (node.type === "repeat") {
      result[node.id] = [];
      const child = node.children?.[0];
      const nested = buildRepeatItem(child);
      return { ...result, ...nested };
    }
    if (node.bindField && fields[node.bindField]) {
      result[node.bindField] = "";
    }
    node.children?.forEach((child) => {
      Object.assign(result, buildRepeatItem(child));
    });
    return result;
  };

  const handleFieldChange = (fieldId, value) => {
    onChange?.({ ...(values || {}), [fieldId]: value });
  };

  const handleRepeatFieldChange = (repeatPath, fieldId, value) => {
    const nextValues = updateItemAtPath(repeatPath, (scope) => ({
      ...(scope || {}),
      [fieldId]: value,
    }));
    onChange?.(nextValues);
  };

  const handleAddRepeatItem = (repeatPath, repeatId, childNode) => {
    const scopeValues = getScopeValues(repeatPath);
    const items = ensureArray(scopeValues?.[repeatId]);
    const nextItems = [...items, buildRepeatItem(childNode)];
    const nextValues =
      repeatPath.length === 0
        ? { ...(values || {}), [repeatId]: nextItems }
        : updateItemAtPath(repeatPath, (scope) => ({
            ...(scope || {}),
            [repeatId]: nextItems,
          }));
    onChange?.(nextValues);
  };

  const handleRemoveRepeatItem = (repeatPath, repeatId, index) => {
    const scopeValues = getScopeValues(repeatPath);
    const items = ensureArray(scopeValues?.[repeatId]);
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
    const nextValues =
      repeatPath.length === 0
        ? { ...(values || {}), [repeatId]: nextItems }
        : updateItemAtPath(repeatPath, (scope) => ({
            ...(scope || {}),
            [repeatId]: nextItems,
          }));
    onChange?.(nextValues);
  };

  const renderFieldInput = (fieldId, field, value, onValueChange, idSuffix) => {
    const inputType = field?.inputType || "text";
    const label = field?.label || fieldId;
    const suffix = idSuffix ? `-${idSuffix}` : "";
    const inputId = `resume-field-${fieldId}${suffix}`;

    const key = suffix ? `${fieldId}-${suffix}` : fieldId;
    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-200">
          {label}
        </label>
        {field?.description ? (
          <span className="text-[11px] text-slate-400">{field.description}</span>
        ) : null}
        {inputType === "textarea" ? (
          <RichTextEditor
            value={value}
            placeholder={field?.placeholder || ""}
            required={Boolean(field?.required)}
            maxLength={field?.maxLength || undefined}
            onChange={onValueChange}
          />
        ) : (
          <input
            id={inputId}
            type={INPUT_TYPES.includes(inputType) ? inputType : "text"}
            value={value}
            placeholder={field?.placeholder || ""}
            required={Boolean(field?.required)}
            maxLength={field?.maxLength || undefined}
            className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            onChange={(event) => onValueChange(event.target.value)}
          />
        )}
      </div>
    );
  };

  const renderNodes = (node, repeatPath, seen) => {
    if (!node) return null;
    if (node.type === "repeat") {
      const child = node.children?.[0];
      if (!child || !hasBindableFields(child)) return null;
      const scopeValues = getScopeValues(repeatPath);
      const items = ensureArray(scopeValues?.[node.id]);
      return (
        <div key={node.id} className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400">No items yet.</p>
          ) : null}
          {items.map((item, index) => {
            const itemPath = [...repeatPath, { id: node.id, index }];
            const itemSeen = new Set();
            return (
              <div
                key={`${node.id}-${index}`}
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Item {index + 1}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-rose-300 transition hover:text-rose-200"
                    onClick={() =>
                      handleRemoveRepeatItem(repeatPath, node.id, index)
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {renderNodes(child, itemPath, itemSeen)}
                </div>
              </div>
            );
          })}
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleAddRepeatItem(repeatPath, node.id, child)}
              className="px-4 py-2 text-xs"
            >
              Add item
            </Button>
          </div>
        </div>
      );
    }

    if (node.bindField) {
      const field = fields[node.bindField];
      if (!field) return null;
      if (seen.has(node.bindField)) return null;
      seen.add(node.bindField);
      const scopeValues = getScopeValues(repeatPath);
      const value = scopeValues?.[node.bindField] ?? "";
      const idSuffix = repeatPath
        .map((entry) => `${entry.id}-${entry.index}`)
        .join("-");
      if (repeatPath.length === 0) {
        return renderFieldInput(
          node.bindField,
          field,
          value,
          (nextValue) => handleFieldChange(node.bindField, nextValue),
          idSuffix
        );
      }
      return renderFieldInput(
        node.bindField,
        field,
        value,
        (nextValue) =>
          handleRepeatFieldChange(repeatPath, node.bindField, nextValue),
        idSuffix
      );
    }

    if (!node.children?.length) return null;
    return node.children.map((child) => renderNodes(child, repeatPath, seen));
  };

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">
          No fields yet. Add a field to start capturing values.
        </p>
      ) : null}
      {root ? (
        renderNodes(root, [], new Set())
      ) : (
        entries.map(([fieldId, field]) =>
          renderFieldInput(
            fieldId,
            field,
            values?.[fieldId] ?? "",
            (nextValue) => handleFieldChange(fieldId, nextValue)
          )
        )
      )}
    </div>
  );
}
