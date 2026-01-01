export function buildResumeJson(template, values) {
  const result = {};
  const fields = template?.fields || {};

  Object.entries(fields).forEach(([fieldId, def]) => {
    const value = values?.[fieldId];
    if (value === undefined || value === "") return;
    if (!def) return;
    result[fieldId] = value;
  });

  return result;
}
