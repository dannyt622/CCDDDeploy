import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fhirSearch, fetchEventById, BASE_URL } from '../fhirClient.js';

const originalFetch = global.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('fhirSearch', () => {
  it('builds a query string and returns JSON', async () => {
    const bundle = { resourceType: 'Bundle', total: 1 };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => bundle
    });

    const result = await fhirSearch('Patient', {
      name: 'Alice',
      identifier: ['URN|123', 'URN|456'],
      gender: 'female'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/Patient?name=Alice&identifier=URN%7C123&identifier=URN%7C456&gender=female`,
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/fhir+json' },
        signal: expect.any(Object)
      })
    );
    expect(result).toEqual(bundle);
  });

  it('throws when the response is not OK', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    });

    await expect(fhirSearch('Observation')).rejects.toThrowError(
      /FHIR search Observation failed: 404 Not Found/
    );
  });
});

describe('fetchEventById', () => {
  it('parses reaction notes and returns normalized event data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        resourceType: 'AllergyIntolerance',
        id: 'ai-123',
        patient: { reference: 'Patient/p-1' },
        code: { text: 'Peanut' },
        verificationStatus: { coding: [{ code: 'confirmed' }] },
        criticality: 'high',
        recordedDate: '2024-01-02',
        reaction: [
          { onset: '2024-01-01T10:00:00Z' },
          {
            onset: '2024-02-01T11:30:00Z',
            manifestation: [{ text: 'Hives' }],
            note: [
              { text: 'Clinical management: Antihistamines' },
              { text: 'Treating doctor: Dr. Adams (Allergist)' },
              { text: 'Must avoid: Nuts' },
              { text: 'Comments: Carry auto-injector' },
              { text: 'Auto-injector: Yes' },
              { text: 'Severity: High' }
            ]
          }
        ]
      })
    });

    const event = await fetchEventById('ai-123~2');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/AllergyIntolerance/ai-123`,
      expect.objectContaining({ headers: { Accept: 'application/fhir+json' } })
    );
    expect(event).toMatchObject({
      id: 'ai-123~2',
      patientId: 'p-1',
      seq: 2,
      substanceName: 'Peanut',
      treatingDoctor: 'Dr. Adams',
      doctorRole: 'Allergist',
      patientMustAvoid: 'Nuts',
      severity: 'High',
      clinicalManagement: 'Antihistamines',
      manifestations: ['Hives']
    });
    expect(event.initialExposureTime).toBeNull();
    expect(event.criticality).toBe('High Risk');
  });

  it('returns null when the reaction sequence does not exist', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        resourceType: 'AllergyIntolerance',
        id: 'ai-123',
        reaction: []
      })
    });

    const event = await fetchEventById('ai-123#5');
    expect(event).toBeNull();
  });
});
