import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateTimeInput from '../DateTimeInput.jsx';

function getCurrentMonthDayButton(dayLabel) {
  const candidates = screen.getAllByRole('button', { name: dayLabel });
  return candidates.find((button) => button.className.includes('text-slate-700'));
}

describe('DateTimeInput', () => {
  it('commits a selected date and closes the popover for date inputs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<DateTimeInput value="2024-04-10" onChange={onChange} type="date" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('10/04/2024');

    await user.click(input);
    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument();

    const dayButton = getCurrentMonthDayButton('15');
    await user.click(dayButton);

    expect(onChange).toHaveBeenLastCalledWith('2024-04-15');
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('keeps the picker open for datetime selections and allows clearing the value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DateTimeInput
        value="2024-04-10T09:30"
        onChange={onChange}
        type="datetime-local"
        id="appointment"
      />
    );

    const toggle = screen.getByLabelText('Toggle picker');
    await user.click(toggle);

    const dayButton = getCurrentMonthDayButton('11');
    await user.click(dayButton);
    expect(onChange).toHaveBeenLastCalledWith('2024-04-11T09:30');

    const selects = screen.getAllByRole('combobox');
    const hourSelect = selects[2];
    const minuteSelect = selects[3];

    await user.selectOptions(hourSelect, '13');
    expect(onChange).toHaveBeenLastCalledWith('2024-04-11T13:30');

    await user.selectOptions(minuteSelect, '45');
    expect(onChange).toHaveBeenLastCalledWith('2024-04-11T13:45');

    const clearButton = screen.getByLabelText('Clear date');
    await user.click(clearButton);
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
