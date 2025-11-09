import { normalizeCriticality } from '../utils/criticality.js';

const COLOR_HIGH = '#ef4444';
const COLOR_LOW = '#fb923c';
const COLOR_DELABELED = '#22c55e';
const COLOR_DEFAULT = '#94a3b8';

export default function RiskDot({ level }) {
  const normalized = normalizeCriticality(level);
  let color = COLOR_DEFAULT;
  if (normalized === 'High Risk') {
    color = COLOR_HIGH;
  } else if (normalized === 'Low Risk') {
    color = COLOR_LOW;
  } else if (normalized === 'Delabeled') {
    color = COLOR_DELABELED;
  }

  return (
    <span
      aria-hidden="true"
      className="inline-block align-middle rounded-full"
      style={{ width: '0.55rem', height: '0.55rem', backgroundColor: color }}
    />
  );
}
