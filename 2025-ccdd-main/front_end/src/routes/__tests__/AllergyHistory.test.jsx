import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AllergyHistory from '../AllergyHistory.jsx';

const contextMocks = vi.hoisted(() => ({
  useAppContext: vi.fn()
}));
const mockSetExpandedSubstance = vi.fn();

const apiMocks = vi.hoisted(() => ({
  fetchPatientById: vi.fn(),
  fetchSubstances: vi.fn(),
  fetchEvents: vi.fn()
}));

vi.mock('../../context/AppContext.jsx', () => contextMocks);

vi.mock('../../components/Layout.jsx', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

vi.mock('../../components/DataTable.jsx', () => ({
  default: ({ data, columns, emptyMessage }) => (
    <table>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td>{emptyMessage}</td>
          </tr>
        ) : (
          data.map((row) => (
            <tr key={row.id || row.key}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}));

vi.mock('../../components/RiskDot.jsx', () => ({
  default: ({ level }) => <span>risk:{level}</span>
}));

vi.mock('../../components/ExclaimIcon.jsx', () => ({
  default: () => <span>!</span>
}));

vi.mock('../../services/api.js', () => apiMocks);

const { fetchPatientById, fetchSubstances, fetchEvents } = apiMocks;
const { useAppContext: mockUseAppContext } = contextMocks;

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/patients/123/allergies']}>
      <Routes>
        <Route path="/patients/:patientId/allergies" element={<AllergyHistory />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAppContext.mockReturnValue({
    expandedSubstance: null,
    setExpandedSubstance: mockSetExpandedSubstance
  });
  fetchPatientById.mockResolvedValue({
    urn: 'URN-123',
    medicareId: 'MED-789',
    name: 'Jane Doe',
    gender: 'Female',
    dob: '1990-02-14'
  });
  fetchSubstances.mockResolvedValue([
    {
      id: 'sub-1',
      name: 'Peanuts',
      eventsCount: 2,
      verificationStatus: 'confirmed',
      criticality: 'High Risk',
      lastReportDate: '2024-01-10'
    }
  ]);
  fetchEvents.mockResolvedValue([]);
});

describe('AllergyHistory', () => {
  it('renders patient details and loads substances on mount', async () => {
    renderWithRouter();

    await waitFor(() => expect(fetchPatientById).toHaveBeenCalledWith('123'));
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('URN-123')).toBeInTheDocument();

    await waitFor(() =>
      expect(fetchSubstances).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          filters: expect.objectContaining({
            verificationStatus: undefined,
            criticality: undefined
          }),
          sort: null
        })
      )
    );
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
  });

  it('refreshes substances and events when refresh button is clicked', async () => {
    mockUseAppContext.mockReturnValue({
      expandedSubstance: 'sub-1',
      setExpandedSubstance: mockSetExpandedSubstance
    });
    fetchEvents.mockResolvedValue([
      {
        id: 'evt-1',
        seq: 1,
        date: '2024-02-01',
        manifestations: ['Hives'],
        treatingDoctor: 'Dr. Smith',
        doctorRole: 'Allergist',
        patientMustAvoid: 'Peanuts'
      }
    ]);

    renderWithRouter();

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledWith('sub-1', expect.any(Object)));

    fetchSubstances.mockClear();
    fetchEvents.mockClear();

    const user = userEvent.setup();
    const [refreshButton] = screen.getAllByRole('button', {
      name: 'Refresh allergies and adverse reactions'
    });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetchSubstances).toHaveBeenCalledTimes(1);
      expect(fetchEvents).toHaveBeenCalledTimes(1);
    });
  });

  it('collapses an expanded substance when event count is clicked again', async () => {
    mockUseAppContext.mockReturnValue({
      expandedSubstance: 'sub-1',
      setExpandedSubstance: mockSetExpandedSubstance
    });
    renderWithRouter();

    const [button] = await screen.findAllByRole('button', { name: '2' });
    const user = userEvent.setup();
    await user.click(button);

    expect(mockSetExpandedSubstance).toHaveBeenCalledWith(null);
  });
});
