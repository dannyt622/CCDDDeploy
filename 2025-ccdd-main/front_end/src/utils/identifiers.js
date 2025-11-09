export function normalizeIdValue(raw = '') {
  return String(raw)
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, '')
    .trim();
}
