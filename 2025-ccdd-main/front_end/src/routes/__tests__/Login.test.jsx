import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login.jsx';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const setSelectedRoleMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock('../../components/RolePicker.jsx', () => ({
  default: ({ value, onChange }) => (
    <div>
      <span data-testid="role-picker-value">{value}</span>
      <button type="button" onClick={() => onChange('Allergy Recorder')}>
        toggle-role
      </button>
    </div>
  )
}));

vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: () => ({
    login: loginMock,
    selectedRole: 'Clinician',
    setSelectedRole: setSelectedRoleMock
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login route', () => {
  it('shows validation error when name is missing', async () => {
    render(<Login />);
    const user = userEvent.setup();
    const [nameInput] = screen.getAllByPlaceholderText('Dr Janet Baker');
    await user.type(nameInput, '   ');
    await user.click(screen.getAllByRole('button', { name: 'Log in' })[0]);

    const errors = await screen.findAllByText('Full name is required');
    expect(errors.length).toBeGreaterThan(0);
    expect(loginMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('logs in with trimmed values and navigates to patient search', async () => {
    render(<Login />);
    const user = userEvent.setup();

    const [nameInput] = screen.getAllByPlaceholderText('Dr Janet Baker');
    const [emailInput] = screen.getAllByPlaceholderText('name@abcmedical.com');

    await user.type(nameInput, '  Dr Jamie  ');
    await user.type(emailInput, 'jamie@example.com');
    await user.click(screen.getAllByRole('button', { name: 'Log in' })[0]);

    expect(loginMock).toHaveBeenCalledWith({
      name: 'Dr Jamie',
      email: 'jamie@example.com',
      role: 'Clinician'
    });
    expect(navigateMock).toHaveBeenCalledWith('/patients');
  });
});
