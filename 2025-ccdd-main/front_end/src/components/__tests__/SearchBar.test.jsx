import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../SearchBar.jsx';

describe('SearchBar', () => {
  const onSearch = vi.fn();

  beforeEach(() => {
    onSearch.mockReset();
  });

  it('returns null when search criteria are blank', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith(null);
  });

  it('collects entered fields and triggers search through the field icon', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const urnInput = screen.getByPlaceholderText('Search by URN');
    const nameInput = screen.getByPlaceholderText('Search by Name');
    const medicareInput = screen.getByPlaceholderText('Search by Medicare ID');

    await user.type(urnInput, 'URN123');
    await user.type(nameInput, 'Alex');
    await user.type(medicareInput, 'MC-55');

    const urnButton = urnInput.parentElement.querySelector('button');
    await user.click(urnButton);

    expect(onSearch).toHaveBeenCalledWith({
      urn: 'URN123',
      name: 'Alex',
      medicareId: 'MC-55'
    });
  });
});
