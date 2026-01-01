export function buildResumeJson(template, values) {
  const result = {};
  const fields = template?.fields || {};

  Object.entries(fields).forEach(([fieldId, def]) => {
    const value = values?.[fieldId];
    if (value === undefined || value === "") return;

    const source = def?.source;
    const path = def?.path;
    if (!source || !path) return;

    if (!result[source]) result[source] = {};
    result[source][path] = value;
  });

  return result;
}
