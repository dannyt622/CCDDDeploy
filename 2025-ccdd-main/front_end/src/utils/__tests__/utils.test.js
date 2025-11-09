import { describe, expect, it } from 'vitest';
import {
  CRITICALITY_LABELS,
  criticalityToCode,
  normalizeCriticality
} from '../criticality.js';
import { applyFilters } from '../filters.js';
import { cycleSortOrder, sortData } from '../sorting.js';

describe('criticality utilities', () => {
  it('normalizes common criticality labels', () => {
    expect(normalizeCriticality(' high risk ')).toBe('High Risk');
    expect(normalizeCriticality('low risk')).toBe('Low Risk');
    expect(normalizeCriticality('Delabeled')).toBe('Delabeled');
    expect(normalizeCriticality('unable-to-assess')).toBe('unable-to-assess');
  });

  it('converts normalized labels to codes', () => {
    expect(criticalityToCode('High Risk')).toBe('high');
    expect(criticalityToCode('Low Risk')).toBe('low');
    expect(criticalityToCode('Delabeled')).toBe('delabeled');
    expect(criticalityToCode('Unknown')).toBeUndefined();
  });

  it('maps unable-to-assess to Low Risk label', () => {
    expect(CRITICALITY_LABELS['unable-to-assess']).toBe('Low Risk');
  });
});

describe('filters utility', () => {
  const sample = [
    { id: 1, gender: 'Male', active: true },
    { id: 2, gender: 'Female', active: false },
    { id: 3, gender: 'Female', active: true }
  ];

  it('returns original data when no filters active', () => {
    expect(applyFilters(sample, {})).toEqual(sample);
  });

  it('filters by direct property match', () => {
    const filtered = applyFilters(sample, { gender: 'Female' });
    expect(filtered).toEqual([
      { id: 2, gender: 'Female', active: false },
      { id: 3, gender: 'Female', active: true }
    ]);
  });

  it('uses predicate map when provided', () => {
    const filtered = applyFilters(
      sample,
      { active: true },
      { active: (item, value) => item.active === value && item.gender === 'Female' }
    );
    expect(filtered).toEqual([{ id: 3, gender: 'Female', active: true }]);
  });
});

describe('sorting utilities', () => {
  it('cycles sort order between desc, asc, and null', () => {
    let state = cycleSortOrder(null, 'name');
    expect(state).toEqual({ key: 'name', direction: 'desc' });

    state = cycleSortOrder(state, 'name');
    expect(state).toEqual({ key: 'name', direction: 'asc' });

    state = cycleSortOrder(state, 'name');
    expect(state).toBeNull();

    state = cycleSortOrder({ key: 'age', direction: 'invalid' }, 'age');
    expect(state).toEqual({ key: 'age', direction: 'desc' });
  });

  it('sorts data using numeric comparison when possible', () => {
    const data = [{ value: '10' }, { value: '2' }, { value: null }];
    const asc = sortData(data, { key: 'value', direction: 'asc' });
    expect(asc.map((item) => item.value)).toEqual([null, '2', '10']);

    const desc = sortData(data, { key: 'value', direction: 'desc' });
    expect(desc.map((item) => item.value)).toEqual(['10', '2', null]);
  });

  it('sorts date strings chronologically', () => {
    const data = [
      { date: '2024-05-02' },
      { date: '2023-12-31' },
      { date: '2024-01-01' }
    ];
    const sorted = sortData(data, { key: 'date', direction: 'asc' });
    expect(sorted.map((item) => item.date)).toEqual([
      '2023-12-31',
      '2024-01-01',
      '2024-05-02'
    ]);
  });

  it('returns original data when sortState is falsy or incomplete', () => {
    const data = [{ value: 1 }, { value: 2 }];
    expect(sortData(data, null)).toBe(data);
    expect(sortData(data, { key: null, direction: 'asc' })).toBe(data);
    expect(sortData(data, { key: 'value', direction: null })).toBe(data);
  });

  it('falls back to locale comparison for non-numeric values', () => {
    const data = [{ value: 'beta' }, { value: 'alpha' }, { value: 'gamma' }];
    const sorted = sortData(data, { key: 'value', direction: 'asc' });
    expect(sorted.map((item) => item.value)).toEqual(['alpha', 'beta', 'gamma']);
  });
});
