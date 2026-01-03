const collectRepeatIds = (node, ids) => {
  if (!node) return;
  if (node.type === "repeat") {
    ids.add(node.id);
  }
  node.children?.forEach((child) => collectRepeatIds(child, ids));
};

export function buildResumeJson(template, values) {
  const result = {};
  const fields = template?.fields || {};

  Object.entries(fields).forEach(([fieldId, def]) => {
    const value = values?.[fieldId];
    if (value === undefined || value === "") return;
    if (!def) return;
    result[fieldId] = value;
  });

  const repeatIds = new Set();
  collectRepeatIds(template?.layout?.root, repeatIds);
  repeatIds.forEach((repeatId) => {
    const value = values?.[repeatId];
    if (!Array.isArray(value) || value.length === 0) return;
    result[repeatId] = value;
  });

  return result;
}

export function buildPreviewResumeJson(template, values) {
  const result = buildResumeJson(template, values);
  const repeatIds = new Set();
  collectRepeatIds(template?.layout?.root, repeatIds);
  repeatIds.forEach((repeatId) => {
    if (Array.isArray(result[repeatId]) && result[repeatId].length > 0) return;
    result[repeatId] = [{}];
  });
  return result;
}
