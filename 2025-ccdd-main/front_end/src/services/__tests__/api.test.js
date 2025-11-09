import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPatients, fetchSubstances, fetchEvents, createEvent } from '../api.js';

const clientMocks = vi.hoisted(() => ({
  fhirSearch: vi.fn(),
  fetchEventById: vi.fn()
}));
const mapperMocks = vi.hoisted(() => ({
  mapBundleToRows: vi.fn(),
  mapPatientToRow: vi.fn()
}));

vi.mock('../fhirClient.js', () => ({
  fhirSearch: clientMocks.fhirSearch,
  fetchEventById: clientMocks.fetchEventById,
  BASE_URL: 'https://example.test'
}));

vi.mock('../patientMapper.js', () => ({
  mapBundleToRows: mapperMocks.mapBundleToRows,
  mapPatientToRow: mapperMocks.mapPatientToRow
}));

const originalFetch = global.fetch;
const fetchMock = vi.fn();

beforeAll(() => {
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe('fetchPatients', () => {
  it('builds FHIR query with identifiers, filters results, and applies sorting', async () => {
    const bundleRows = [
      { id: '1', name: 'Alice', gender: 'Female', dob: '1990-01-02' },
      { id: '2', name: 'Bob', gender: 'Male', dob: '1989-05-11' }
    ];
    clientMocks.fhirSearch.mockResolvedValue({ entry: [] });
    mapperMocks.mapBundleToRows.mockReturnValue(bundleRows);

    const result = await fetchPatients({
      urn: ' URN-123 ',
      medicareId: '  999 999 ',
      name: 'Alice',
      gender: 'Female',
      sort: { key: 'name', direction: 'desc' }
    });

    expect(clientMocks.fhirSearch).toHaveBeenCalledWith('Patient', expect.objectContaining({
      _count: 50,
      name: 'Alice',
      gender: 'female',
      identifier: expect.arrayContaining([
        expect.stringContaining('URN|URN-123'),
        expect.stringContaining('urn:oid')
      ]),
      _sort: '-name'
    }));
    expect(result).toEqual([{ id: '1', name: 'Alice', gender: 'Female', dob: '1990-01-02' }]);
  });
});

describe('fetchSubstances', () => {
  it('groups allergy intolerances, normalizes criticality, and supports filters & sorting', async () => {
    const bundle = {
      entry: [
        {
          resource: {
            resourceType: 'AllergyIntolerance',
            id: 'ai-1',
            code: { text: 'Peanut' },
            criticality: 'high',
            verificationStatus: { coding: [{ code: 'confirmed' }] },
            clinicalStatus: { coding: [{ code: 'active' }] },
            recordedDate: '2024-02-10',
            meta: { lastUpdated: '2024-02-11T00:00:00Z' },
            reaction: [
              { onset: '2024-02-01' },
              { onset: '2024-02-05' }
            ]
          }
        },
        {
          resource: {
            resourceType: 'AllergyIntolerance',
            id: 'ai-2',
            code: { text: 'Peanut' },
            criticality: 'low',
            verificationStatus: { text: 'unconfirmed' },
            clinicalStatus: { coding: [{ code: 'resolved' }] },
            meta: { lastUpdated: '2024-02-09T00:00:00Z' },
            reaction: [{ onset: '2024-02-03' }]
          }
        }
      ]
    };
    clientMocks.fhirSearch.mockResolvedValueOnce(bundle);

    const rows = await fetchSubstances('patient-1', {
      filters: { verificationStatus: 'confirmed' },
      sort: { key: 'eventsCount', direction: 'desc' }
    });

    expect(clientMocks.fhirSearch).toHaveBeenCalledWith(
      'AllergyIntolerance',
      expect.objectContaining({ patient: 'patient-1', _count: 100 })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'Peanut',
      eventsCount: 3,
      verificationStatus: 'confirmed',
      criticality: 'High Risk'
    });
    expect(rows[0].lastReportDate).toBe('2024-02-11');
  });
});

describe('fetchEvents', () => {
  it('expands reactions with parsed notes and assigns sequence order', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        resourceType: 'AllergyIntolerance',
        id: 'ai-1',
        code: { text: 'Peanut' },
        verificationStatus: { coding: [{ code: 'confirmed' }] },
        criticality: 'high',
        reaction: [
          {
            onset: '2024-02-01',
            severity: 'mild',
            manifestation: [{ text: 'Hives' }],
            note: [
              { text: 'Treating doctor: Dr. Adams (Allergist)' },
              { text: 'Clinical management: Antihistamines' },
              { text: 'Must avoid: Nuts' },
              { text: 'Comments: Follow up required' }
            ]
          },
          {
            onset: '2024-03-01',
            manifestation: [{ text: 'Swelling' }],
            note: [{ text: 'Treating doctor: Dr. Adams (Allergist)' }]
          }
        ]
      })
    });

    const rows = await fetchEvents('ai-1', { sort: { key: 'date', direction: 'asc' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/AllergyIntolerance/ai-1',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      seq: 1,
      treatingDoctor: 'Dr. Adams',
      doctorRole: 'Allergist',
      notes: expect.stringContaining('Clinical management'),
      patientMustAvoid: 'Nuts'
    });
    expect(rows[1].seq).toBe(2);
  });
});

describe('createEvent', () => {
  it('creates a patient when needed and posts a new allergy intolerance', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pat-1', resourceType: 'Patient' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'allergy-1' })
      });
    mapperMocks.mapPatientToRow.mockReturnValue({ id: 'pat-1', name: 'New Patient' });
    clientMocks.fhirSearch.mockResolvedValueOnce({ entry: [] });

    const result = await createEvent('new', {
      patientName: 'Jamie Smith',
      urn: ' URN-77 ',
      medicareId: '123 456',
      gender: 'Male',
      dob: '1990-02-02',
      substanceName: 'Penicillin',
      verificationStatus: 'Confirmed',
      criticality: 'High Risk',
      severity: 'High',
      patientMustAvoid: 'Penicillin',
      manifestations: ['Rash'],
      eventDate: '2024-03-01'
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.test/Patient',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Jamie Smith')
      })
    );
    expect(clientMocks.fhirSearch).toHaveBeenCalledWith(
      'AllergyIntolerance',
      expect.objectContaining({
        patient: 'pat-1',
        'code:text': 'Penicillin'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.test/AllergyIntolerance',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Penicillin')
      })
    );
    expect(result).toEqual({ id: 'allergy-1#1', substanceId: 'allergy-1' });
  });
});
