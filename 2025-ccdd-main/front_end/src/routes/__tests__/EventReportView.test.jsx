import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventReportView from '../EventReportView.jsx';

const apiMocks = vi.hoisted(() => ({
  fetchEventById: vi.fn(),
  fetchPatientById: vi.fn(),
  fetchMhrSnapshot: vi.fn()
}));

vi.mock('../../components/Layout.jsx', () => ({
  default: ({ children }) => <div>{children}</div>
}));

vi.mock('../../components/SectionCard.jsx', () => ({
  default: ({ title, children }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}));

vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    splitTextToSize: () => [],
    internal: { pageSize: { getHeight: () => 297 } }
  }))
}));

vi.mock('../../services/api.js', () => apiMocks);

function renderWithRouter(path = '/reports/event-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reports/:eventId" element={<EventReportView />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = '';
});

describe('EventReportView', () => {
  it('appends hash fragment as reaction sequence when fetching event', async () => {
    window.location.hash = '#2';
    const event = {
      id: 'event-1~2',
      patientId: 'pat-9',
      substanceName: 'Peanut',
      treatingDoctor: 'Dr. West',
      doctorRole: 'Allergist',
      date: '2024-02-01',
      reactionStartTime: '2024-02-01T10:00:00Z',
      manifestations: ['Hives']
    };
    apiMocks.fetchEventById.mockResolvedValue(event);
    apiMocks.fetchPatientById.mockResolvedValue({
      id: 'pat-9',
      name: 'Jamie Stone',
      gender: 'Female',
      dob: '1990-03-03',
      urn: 'URN-9'
    });
    apiMocks.fetchMhrSnapshot.mockResolvedValue(null);

    renderWithRouter('/reports/event-1');

    await waitFor(() => expect(apiMocks.fetchEventById).toHaveBeenCalledWith('event-1~2'));
    expect(apiMocks.fetchPatientById).toHaveBeenCalledWith('pat-9');
    expect(screen.getByText('Jamie Stone')).toBeInTheDocument();
    expect(screen.getAllByText('Peanut')[0]).toBeInTheDocument();
  });

  it('falls back to first reaction when event id lacks sequence information', async () => {
    const event = {
      id: 'event-99~1',
      patientId: 'pat-1',
      substanceName: 'Aspirin',
      treatingDoctor: 'Dr. Grey',
      doctorRole: 'Cardiologist',
      date: '2024-01-05',
      reactionStartTime: '2024-01-05T09:00:00Z',
      manifestations: ['Rash']
    };
    apiMocks.fetchEventById.mockResolvedValueOnce(null);
    apiMocks.fetchEventById.mockResolvedValueOnce(event);
    apiMocks.fetchPatientById.mockResolvedValue({
      id: 'pat-1',
      name: 'Alex Wright',
      gender: 'Male',
      dob: '1985-06-15',
      urn: 'URN-1'
    });
    apiMocks.fetchMhrSnapshot.mockResolvedValue({
      treatingDoctor: 'Dr. Grey',
      treatingDoctorRole: 'Cardiologist'
    });

    renderWithRouter('/reports/event-99');

    await waitFor(() => expect(apiMocks.fetchEventById).toHaveBeenCalledTimes(2));
    expect(apiMocks.fetchEventById).toHaveBeenNthCalledWith(1, 'event-99');
    expect(apiMocks.fetchEventById).toHaveBeenNthCalledWith(2, 'event-99~1');
    expect(screen.getByText('Alex Wright')).toBeInTheDocument();
    expect(screen.getAllByText('Aspirin')[0]).toBeInTheDocument();
  });

  it('renders a not-found state when no matching event can be retrieved', async () => {
    apiMocks.fetchEventById.mockResolvedValue(null);

    renderWithRouter('/reports/missing-event');

    await waitFor(() => expect(screen.getByText('Event not found.')).toBeInTheDocument());
    expect(apiMocks.fetchPatientById).not.toHaveBeenCalled();
  });
});
