export function sanitizeInput(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function sanitizeTransactionPayload(payload) {
  return {
    ...payload,
    category: sanitizeInput(payload.category),
    description: sanitizeInput(payload.description),
  };
}
