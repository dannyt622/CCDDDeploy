import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import RiskDot from '../RiskDot.jsx';

const getColour = (level) => {
  const { container } = render(<RiskDot level={level} />);
  const dot = container.querySelector('span[aria-hidden="true"]');
  return dot.style.backgroundColor;
};

describe('RiskDot', () => {
  it('renders different colours for recognised criticality levels', () => {
    expect(getColour('high risk')).toBe('rgb(239, 68, 68)');
    expect(getColour('LOW')).toBe('rgb(251, 146, 60)');
    expect(getColour('delabeled')).toBe('rgb(34, 197, 94)');
  });

  it('uses the neutral colour when the level is unrecognised', () => {
    expect(getColour('unknown')).toBe('rgb(148, 163, 184)');
  });
});
