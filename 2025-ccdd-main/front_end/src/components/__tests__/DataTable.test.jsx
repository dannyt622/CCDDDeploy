import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../DataTable.jsx';

const sampleColumns = [
  { key: 'name', label: 'Name', sortable: true, align: 'left' },
  { key: 'score', label: 'Score', sortable: true, align: 'center', render: (value) => value.toFixed(1) },
  {
    key: 'status',
    label: 'Status',
    align: 'right',
    sortable: true,
    filterOptions: ['New', 'Closed']
  }
];

const sampleRows = [
  { id: 'a1', name: 'Alice Smith', score: 3.25, status: 'New' },
  { id: 'b2', name: 'Brandon Lee', score: 4.5, status: 'Closed' }
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rows using custom renderers and handles row click', async () => {
    const onRowClick = vi.fn();

    render(
      <DataTable
        columns={sampleColumns}
        data={sampleRows}
        sortState={{ key: 'name', direction: 'asc' }}
        onRowClick={onRowClick}
        getRowClassName={() => 'custom-row'}
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('3.3')).toBeInTheDocument();

    const aliceRow = screen.getByText('Alice Smith').closest('tr');
    expect(aliceRow).toHaveClass('custom-row');

    const user = userEvent.setup();
    await user.click(aliceRow);

    expect(onRowClick).toHaveBeenCalledWith(sampleRows[0]);
  });

  it('cycles sort order and applies filters through the popover', async () => {
    const onSortChange = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <DataTable
        columns={sampleColumns}
        data={sampleRows}
        sortState={null}
        onSortChange={onSortChange}
        filters={{}}
        onFilterChange={onFilterChange}
      />
    );

    const nameHeader = screen.getAllByText('Name')[0].closest('th');
    const sortButton = within(nameHeader).getAllByRole('button')[0];
    const user = userEvent.setup();

    await user.click(sortButton);
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });

    const statusHeader = screen.getAllByText('Status')[0].closest('th');
    const headerButtons = within(statusHeader).getAllByRole('button');
    const filterButton = headerButtons[headerButtons.length - 1];

    await user.click(filterButton);
    const newOption = await screen.findByRole('button', { name: 'New' });
    await user.click(newOption);

    expect(onFilterChange).toHaveBeenLastCalledWith({ status: 'New' });

    await user.click(filterButton);
    const clearButton = await screen.findByRole('button', { name: 'Clear filter' });
    await user.click(clearButton);

    expect(onFilterChange).toHaveBeenLastCalledWith({ status: undefined });
  });

  it('shows the empty state message when no rows are provided', () => {
    render(
      <DataTable
        columns={sampleColumns}
        data={[]}
        sortState={null}
        emptyMessage="Nothing to display"
      />
    );

    expect(screen.getByText('Nothing to display')).toBeInTheDocument();
  });
});
