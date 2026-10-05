// Audit values may contain serialized configuration. Redact recursively before rendering.
const sensitive = /token|secret|password|credential|api.?key|authorization|webhook.?url/i;
export function formatAuditValue(value: unknown, field = ''): string {
  if (sensitive.test(field)) return '[Hidden]';
  if (value === null || value === undefined) return 'Not set';
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return sensitive.test(value) ? '[Sensitive value hidden]' : value; }
  }
  const redact = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(redact);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, item]) => [key, sensitive.test(key) ? '[Hidden]' : redact(item)]));
    return v;
  };
  return typeof parsed === 'object' ? JSON.stringify(redact(parsed), null, 2) : String(parsed);
}
