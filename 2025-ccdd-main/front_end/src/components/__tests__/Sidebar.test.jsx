import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar.jsx';

describe('Sidebar', () => {
  it('applies the provided surfaceClass and highlights the active item', () => {
    const { container } = render(<Sidebar surfaceClass="bg-test border-test" />);
    const aside = container.querySelector('aside');

    expect(aside).toHaveClass('bg-test');
    expect(aside).toHaveClass('border-test');

    const active = screen.getByText('Allergies & Adverse Reactions');
    expect(active.className).toContain('border-brand-blue');
  });
});
