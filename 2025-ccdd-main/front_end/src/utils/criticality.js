const LABEL_HIGH = 'High Risk';
const LABEL_LOW = 'Low Risk';
const LABEL_DELABELED = 'Delabeled';

export function normalizeCriticality(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized.includes('high')) return LABEL_HIGH;
  if (normalized.includes('low')) return LABEL_LOW;
  if (normalized.includes('delabel')) return LABEL_DELABELED;
  return value || '';
}

export function criticalityToCode(label) {
  const normalized = normalizeCriticality(label);
  if (normalized === LABEL_HIGH) return 'high';
  if (normalized === LABEL_LOW) return 'low';
  if (normalized === LABEL_DELABELED) return 'delabeled';
  return undefined;
}

export const CRITICALITY_LABELS = {
  high: LABEL_HIGH,
  'high risk': LABEL_HIGH,
  low: LABEL_LOW,
  'low risk': LABEL_LOW,
  delabeled: LABEL_DELABELED,
  'unable-to-assess': LABEL_LOW
};
