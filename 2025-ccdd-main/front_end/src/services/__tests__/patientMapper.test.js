import { describe, expect, it } from 'vitest';
import { mapBundleToRows, mapPatientToRow } from '../patientMapper.js';

describe('mapPatientToRow', () => {
  it('extracts primary identifiers and formats name and gender', () => {
    const patient = {
      id: 'p-1',
      name: [
        {
          text: 'Dr Alex Wright',
          given: ['Alex'],
          family: 'Wright'
        }
      ],
      gender: 'male',
      birthDate: '1985-01-01',
      identifier: [
        { system: 'urn:oid:1.2.36.146.595.217.0.1', value: 'URN-77' },
        { system: 'http://ns.ehealth.gov.au/id/medicare-number', value: '99999999' }
      ]
    };

    expect(mapPatientToRow(patient)).toEqual({
      id: 'p-1',
      urn: 'URN-77',
      medicareId: '99999999',
      name: 'Dr Alex Wright',
      gender: 'Male',
      dob: '1985-01-01'
    });
  });

  it('falls back to constructed name and handles missing identifiers', () => {
    const patient = {
      id: 'p-2',
      name: [{ given: ['Jamie', 'Lee'], family: 'Stone' }],
      identifier: [{ system: 'URN', value: 'URN-123' }]
    };

    expect(mapPatientToRow(patient)).toEqual(
      expect.objectContaining({
        urn: 'URN-123',
        medicareId: '',
        name: 'Jamie Lee Stone'
      })
    );
  });
});

describe('mapBundleToRows', () => {
  it('filters non-patient entries and maps each resource', () => {
    const bundle = {
      entry: [
        { resource: { resourceType: 'Patient', id: 'p-1', name: [{ text: 'A' }] } },
        { resource: { resourceType: 'Observation', id: 'obs-1' } },
        { resource: { resourceType: 'Patient', id: 'p-2', name: [{ text: 'B' }] } }
      ]
    };

    const rows = mapBundleToRows(bundle);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toEqual(['p-1', 'p-2']);
  });
});
