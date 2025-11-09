import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '../TopBar.jsx';

const navigateMock = vi.fn();
const useAppContextMock = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock
}));

vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: () => useAppContextMock()
}));

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders breadcrumbs, shows user info, and handles logout flow', async () => {
    const logoutMock = vi.fn();
    useAppContextMock.mockReturnValue({
      user: { name: 'Dr Jane', role: 'gp' },
      selectedRole: 'gp',
      logout: logoutMock
    });

    render(
      <TopBar
        title="Allergy Report"
        breadcrumbs={[
          { label: 'Patients', to: '/patients' },
          { label: 'Visit Details' }
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Patients' })).toHaveAttribute('href', '/patients');
    expect(screen.getByText('Visit Details')).toBeInTheDocument();
    expect(screen.getByText(/Dr Jane/)).toBeInTheDocument();
    expect(screen.getByText(/\|\s+Allergist/)).toBeInTheDocument();

    const user = userEvent.setup();
    const menuButton = screen.getByRole('button', { name: /Dr Jane/ });

    await user.click(menuButton);
    await user.click(document.body);
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();

    await user.click(menuButton);
    const logoutButton = await screen.findByRole('button', { name: 'Log out' });
    await user.click(logoutButton);

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('falls back to the title when breadcrumbs are not provided', () => {
    useAppContextMock.mockReturnValue({
      user: null,
      selectedRole: 'gp',
      logout: vi.fn()
    });

    render(<TopBar title="Overview" />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });
});
