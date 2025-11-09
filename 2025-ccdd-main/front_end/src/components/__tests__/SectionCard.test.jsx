import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionCard from '../SectionCard.jsx';

describe('SectionCard', () => {
  it('renders a title, children, and optional actions', () => {
    render(
      <SectionCard title="Notes" actions={<button type="button">Action</button>}>
        <p>Details go here</p>
      </SectionCard>
    );

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Details go here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('omits the actions container when no actions are provided', () => {
    render(
      <SectionCard title="Summary">
        <p>Summary text</p>
      </SectionCard>
    );

    expect(screen.queryByRole('button', { name: 'Action' })).not.toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });
});
