import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewEventForm from '../NewEventForm.jsx';

const routerMocks = vi.hoisted(() => ({
  params: { patientId: 'new' },
  location: { pathname: '/patients/new/new-event', state: { prefillPatient: {} } },
  navigate: vi.fn()
}));

const contextMocks = vi.hoisted(() => ({
  user: { name: 'Dr Alex', role: 'clinician' },
  selectedRole: 'Clinician',
  setExpandedSubstance: vi.fn()
}));

const apiMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
  fetchEvents: vi.fn(),
  fetchMhrSnapshot: vi.fn(),
  fetchPatientById: vi.fn(),
  fetchSubstances: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => routerMocks.params,
    useLocation: () => routerMocks.location,
    useNavigate: () => routerMocks.navigate
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

vi.mock('../../components/SectionCard.jsx', () => ({
  default: ({ children, title }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}));

vi.mock('../../components/DateTimeInput.jsx', () => ({
  default: ({ value = '', onChange, type = 'text', name, disabled }) => (
    <input
      data-testid={`date-input-${name || type}`}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      type="text"
      disabled={disabled}
    />
  )
}));

vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: () => contextMocks
}));

vi.mock('../../services/api.js', () => apiMocks);

beforeEach(() => {
  vi.clearAllMocks();
  routerMocks.params.patientId = 'new';
  routerMocks.location = {
    pathname: '/patients/new/new-event',
    state: {
      prefillPatient: {
        name: 'Jamie Stone',
        urn: 'URN-1',
        medicareId: '999 999',
        gender: 'Female',
        dob: '1990-01-01'
      }
    }
  };
  apiMocks.createEvent.mockResolvedValue({ id: 'ai-1#1', substanceId: 'ai-1' });
  apiMocks.fetchEvents.mockResolvedValue([]);
  apiMocks.fetchMhrSnapshot.mockResolvedValue(null);
  apiMocks.fetchPatientById.mockResolvedValue(null);
  apiMocks.fetchSubstances.mockResolvedValue([]);
});

function renderForm() {
  return render(<NewEventForm />);
}

describe('NewEventForm', () => {
  it('validates required fields before submission', async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect(
      screen.getAllByText('Required').length
    ).toBeGreaterThan(0);
    expect(apiMocks.createEvent).not.toHaveBeenCalled();
  });

  it('prefills new patient data and submits a new event', async () => {
    renderForm();
    const user = userEvent.setup();

    expect(screen.getAllByDisplayValue('Jamie Stone').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('URN-1').length).toBeGreaterThan(0);

    screen
      .getAllByLabelText('Specific Substance (Name of Food or Drug)')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: 'Peanuts' } })
      );
    screen
      .getAllByLabelText('Time of Initial Exposure')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: '2024-01-01T10:00' } })
      );
    screen
      .getAllByLabelText('Reaction Start Time')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: '2024-01-02T12:30' } })
      );
    screen
      .getAllByLabelText('Clinical Management')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: 'Administer antihistamine' } })
      );
    screen
      .getAllByLabelText('Verification Status')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: 'Confirmed' } })
      );
    screen
      .getAllByLabelText('Criticality')
      .forEach((element) =>
        fireEvent.change(element, { target: { value: 'High Risk' } })
      );

    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => expect(apiMocks.createEvent).toHaveBeenCalled());

    const [patientId, payload] = apiMocks.createEvent.mock.calls[0];
    expect(patientId).toBe('new');
    expect(payload).toEqual(
      expect.objectContaining({
        substanceName: 'Peanuts',
        verificationStatus: 'Confirmed',
        criticality: 'High Risk',
        clinicalManagement: 'Administer antihistamine'
      })
    );
    expect(payload.initialExposureTime).toMatch(/^2024-01-01T10:00:00/);
    expect(payload.reactionStartTime).toMatch(/^2024-01-02T12:30:00/);
    expect(payload.manifestations).toEqual(['Urticaria']);

    expect(contextMocks.setExpandedSubstance).toHaveBeenCalledWith('ai-1');
    expect(routerMocks.navigate).toHaveBeenCalledWith('/patients/new/allergies');
  });

  it('loads existing patient context and uses MHR data for defaults', async () => {
    routerMocks.params.patientId = 'patient-99';
    routerMocks.location = { pathname: '/patients/patient-99/new-event', state: {} };
    apiMocks.fetchPatientById.mockResolvedValue({
      id: 'patient-99',
      name: 'Sam Carter',
      gender: 'Male',
      dob: '1980-05-02',
      urn: 'URN-77',
      medicareId: '111222'
    });
    apiMocks.fetchMhrSnapshot.mockResolvedValue({
      treatingDoctor: 'Dr Grey',
      treatingDoctorRole: 'Cardiologist',
      patientMustAvoid: 'Shellfish',
      substances: {
        Shellfish: {
          verificationStatus: 'Confirmed',
          criticality: 'high',
          firstOnset: '2023-01-02T11:00',
          initialExposureTime: '2023-01-02T09:00'
        }
      }
    });
    apiMocks.fetchSubstances.mockResolvedValue([{ id: 'sub-1', name: 'Shellfish' }]);

    renderForm();

    await waitFor(() =>
      expect(apiMocks.fetchPatientById).toHaveBeenCalledWith('patient-99')
    );
    expect(screen.getAllByDisplayValue('Sam Carter').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Shellfish').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Dr Alex').length).toBeGreaterThan(0);
    expect(
      screen.getAllByDisplayValue('Confirmed').length
    ).toBeGreaterThan(0);
  });

  it('auto fills risk fields from the most recent existing event', async () => {
    routerMocks.params.patientId = 'patient-123';
    routerMocks.location = {
      pathname: '/patients/patient-123/new-event',
      state: { substanceId: 'sub-1' }
    };
    apiMocks.fetchPatientById.mockResolvedValue({
      id: 'patient-123',
      name: 'Jordan Smith',
      gender: 'Male',
      dob: '1988-02-01',
      urn: 'URN-22',
      medicareId: '11111111'
    });
    apiMocks.fetchSubstances.mockResolvedValue([{ id: 'sub-1', name: 'Fish' }]);
    apiMocks.fetchEvents.mockResolvedValue([
      {
        substanceId: 'sub-1',
        substanceName: 'Fish',
        initialExposureTime: '2025-01-01T01:00',
        riskSubstanceName: 'Fish',
        verificationStatus: 'confirmed',
        criticality: 'high risk',
        firstOnset: '2024-01-01T00:30',
        lastOnset: '2025-01-01T01:30',
        reactionStartTime: '2025-01-01T01:15'
      }
    ]);

    renderForm();

    await waitFor(() => expect(apiMocks.fetchEvents).toHaveBeenCalledWith('sub-1'));

    expect(screen.getAllByDisplayValue('Fish').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Time of Initial Exposure')).toHaveValue('2025-01-01T01:00');
    expect(screen.getByLabelText('Substance Name')).toHaveValue('Fish');
    expect(screen.getByLabelText('Verification Status')).toHaveValue('Confirmed');
    expect(screen.getByLabelText('Criticality')).toHaveValue('High Risk');
    expect(screen.getByLabelText('Date/Time of First Reaction Onset')).toHaveValue('2024-01-01T00:30');
    const lastOnsetInput = screen.getByLabelText('Date/Time of Last Reaction Onset');
    expect(lastOnsetInput).toHaveValue('');

    const reactionStartInput = screen.getAllByLabelText('Reaction Start Time')[0];
    fireEvent.change(reactionStartInput, { target: { value: '2025-01-05T02:45' } });

    await waitFor(() => expect(lastOnsetInput).toHaveValue('2025-01-05T02:45'));
  });
});
