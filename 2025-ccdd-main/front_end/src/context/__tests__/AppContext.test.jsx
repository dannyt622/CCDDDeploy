import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext.jsx';
import { DEFAULT_ROLE } from '../../constants/roles.js';
import { clearSmartSession } from '../../utils/smartAuth.js';

vi.mock('../../utils/smartAuth.js', () => ({
  clearSmartSession: vi.fn()
}));

function CaptureContext({ onValue }) {
  const context = useAppContext();
  onValue(context);
  return null;
}

describe('AppContext', () => {
  it('exposes login and logout helpers that update context state', async () => {
    let latest;
    const onValue = (value) => {
      latest = value;
    };

    render(
      <AppProvider>
        <CaptureContext onValue={onValue} />
      </AppProvider>
    );

    expect(latest.user).toBeNull();
    expect(latest.selectedRole).toBe(DEFAULT_ROLE);
    expect(latest.isAuthenticated).toBe(false);

    await act(async () => {
      latest.login({ email: 'dr@example.com', name: 'Dr Test', role: 'gp' });
    });

    await waitFor(() => expect(latest.user).toMatchObject({
      email: 'dr@example.com',
      name: 'Dr Test',
      role: 'gp'
    }));
    expect(latest.selectedRole).toBe('gp');
    expect(latest.isAuthenticated).toBe(true);

    await act(async () => {
      latest.logout();
    });

    await waitFor(() => expect(latest.user).toBeNull());
    expect(latest.selectedRole).toBe(DEFAULT_ROLE);
    expect(latest.isAuthenticated).toBe(false);
    expect(clearSmartSession).toHaveBeenCalledTimes(1);
  });

  it('throws when the hook is used outside of the provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppContext())).toThrow(
      'useAppContext must be used inside AppProvider'
    );
    consoleSpy.mockRestore();
  });
});
