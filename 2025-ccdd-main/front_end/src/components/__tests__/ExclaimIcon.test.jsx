import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExclaimIcon from '../ExclaimIcon.jsx';

vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }) => <svg data-testid="alert-icon" className={className} />
}));

describe('ExclaimIcon', () => {
  it('forwards custom class names to the icon', () => {
    render(<ExclaimIcon className="extra" />);
    expect(screen.getByTestId('alert-icon')).toHaveClass('w-4', 'h-4', 'text-risk-high', 'extra');
  });
});
