import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RolePicker from '../RolePicker.jsx';
import { ROLE_OPTIONS } from '../../constants/roles.js';

describe('RolePicker', () => {
  it('lists available roles and reports changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<RolePicker value={ROLE_OPTIONS[0].id} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select.value).toBe(ROLE_OPTIONS[0].id);

    await user.selectOptions(select, ROLE_OPTIONS[1].id);
    expect(onChange).toHaveBeenCalledWith(ROLE_OPTIONS[1].id);
  });
});
