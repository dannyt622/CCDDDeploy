import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PatientSearch from '../PatientSearch.jsx';

const navigateMock = vi.fn();
const apiMocks = vi.hoisted(() => ({
  fetchPatients: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock('../../components/Layout.jsx', () => ({
  default: ({ children, title }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}));

vi.mock('../../components/SearchBar.jsx', () => ({
  default: ({ onSearch }) => (
    <div>
      <button type="button" onClick={() => onSearch(null)}>
        trigger-empty
      </button>
      <button
        type="button"
        onClick={() =>
          onSearch({ urn: 'URN-1', name: 'Jamie', medicareId: '123456', gender: undefined })
        }
      >
        trigger-search
      </button>
    </div>
  )
}));

vi.mock('../../components/DataTable.jsx', () => ({
  default: ({ data, onRowClick }) => (
    <div>
      {data.map((row) => (
        <button key={row.id} onClick={() => onRowClick(row)}>
          {row.name}
        </button>
      ))}
    </div>
  )
}));

vi.mock('../../services/api.js', () => apiMocks);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients']}>
      <Routes>
        <Route path="/patients" element={<PatientSearch />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PatientSearch', () => {
  it('shows validation message when search is triggered without query', async () => {
    apiMocks.fetchPatients.mockResolvedValue([]);
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'trigger-empty' })[0]);

    expect(
      screen.getByText('Enter at least one search field to display patients.')
    ).toBeInTheDocument();
    expect(apiMocks.fetchPatients).not.toHaveBeenCalled();
  });

  it('renders search results and navigates on row click', async () => {
    apiMocks.fetchPatients.mockResolvedValue([
      {
        id: 'pat-1',
        urn: 'URN-1',
        name: 'Jamie Lee',
        medicareId: '123456',
        gender: 'Female',
        dob: '1990-01-01'
      }
    ]);
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'trigger-search' })[0]);

    await waitFor(() => expect(apiMocks.fetchPatients).toHaveBeenCalled());
    expect(screen.getByText('Patients')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jamie Lee' }));
    expect(navigateMock).toHaveBeenCalledWith('/patients/pat-1/allergies');
  });

  it('prompts to start new report when no patients are found', async () => {
    apiMocks.fetchPatients.mockResolvedValue([]);
    renderPage();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'trigger-search' })[0]);

    await waitFor(() => expect(apiMocks.fetchPatients).toHaveBeenCalled());

    expect(
      screen.getByText('No patient records matched your search. Start a new allergy report with the details you entered.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start new patient report' })).toBeInTheDocument();
  });
});
