// Convert various inputs to FHIR dateTime with local timezone offset (e.g., +08:00)
function toFHIRDateTime(val) {
  if (!val) return undefined;
  const s = String(val).trim();

  const buildWithOffset = (yyyy, mm, dd, HH = '00', MM = '00') => {
    const d = new Date(+yyyy, +mm - 1, +dd, +HH, +MM);
    if (isNaN(d)) return undefined;
    const tzMin = -d.getTimezoneOffset();
    const sign = tzMin >= 0 ? '+' : '-';
    const ah = String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, '0');
    const am = String(Math.abs(tzMin) % 60).padStart(2, '0');
    const yyyy2 = d.getFullYear();
    const mm2 = String(d.getMonth() + 1).padStart(2, '0');
    const dd2 = String(d.getDate()).padStart(2, '0');
    const HH2 = String(d.getHours()).padStart(2, '0');
    const MM2 = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy2}-${mm2}-${dd2}T${HH2}:${MM2}:00${sign}${ah}:${am}`;
  };

  // DD/MM/YYYY [HH:mm]
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) return buildWithOffset(m[3], m[2], m[1], m[4], m[5]);

  // YYYY-MM-DDTHH:mm
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (m) return buildWithOffset(m[1], m[2], m[3], m[4], m[5]);

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return buildWithOffset(s.slice(0, 4), s.slice(5, 7), s.slice(8, 10));

  // Fallback: Date-parsable string
  const d = new Date(s);
  if (!isNaN(d)) {
    const tzMin = -d.getTimezoneOffset();
    const sign = tzMin >= 0 ? '+' : '-';
    const ah = String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, '0');
    const am = String(Math.abs(tzMin) % 60).padStart(2, '0');
    const yyyy2 = d.getFullYear();
    const mm2 = String(d.getMonth() + 1).padStart(2, '0');
    const dd2 = String(d.getDate()).padStart(2, '0');
    const HH2 = String(d.getHours()).padStart(2, '0');
    const MM2 = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy2}-${mm2}-${dd2}T${HH2}:${MM2}:00${sign}${ah}:${am}`;
  }
  return undefined;
}
/**
 * Service layer: switch Patient calls to FHIR; keep others on mock for now.
 */

import { mhr } from './mockData.js';
import { sortData } from '../utils/sorting.js';
import { applyFilters } from '../utils/filters.js';
import { normalizeCriticality } from '../utils/criticality.js';

import { fhirSearch, BASE_URL } from './fhirClient.js';
import { fetchEventById as fhirFetchEventById } from './fhirClient.js';
import { mapBundleToRows, mapPatientToRow } from './patientMapper.js';
import { FHIR_SYSTEMS } from '../constants/fhir.js';
import { normalizeIdValue } from '../utils/identifiers.js';

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const ALLERGY_CATEGORY_KEYWORDS = {
  medication: ['cillin', 'penicillin', 'amoxi', 'cephal', 'drug', 'medication', 'tablet'],
  food: ['milk', 'egg', 'peanut', 'nut', 'shellfish', 'seafood', 'shrimp', 'fish', 'wheat', 'soy', 'gluten']
};

const patientCache = new Map();
const eventCache = new Map();

function canonicalEventKey(eventId) {
  if (!eventId) return null;
  const raw = String(eventId);
  const delimiter = raw.includes('~') ? '~' : '#';
  const [allergyId, seqPart] = raw.split(delimiter);
  if (!allergyId) return null;
  const seq = Number.parseInt(seqPart || '1', 10);
  const normalizedSeq = Number.isFinite(seq) && seq > 0 ? seq : 1;
  return `${allergyId}#${normalizedSeq}`;
}

function invalidateEventCache(allergyId) {
  if (!allergyId) return;
  const prefix = `${allergyId}#`;
  for (const key of Array.from(eventCache.keys())) {
    if (key.startsWith(prefix)) {
      eventCache.delete(key);
    }
  }
}

function inferAllergyCategory(substanceName = '') {
  const lower = substanceName.toLowerCase();
  if (!lower) return undefined;
  if (ALLERGY_CATEGORY_KEYWORDS.medication.some((token) => lower.includes(token))) return 'medication';
  if (ALLERGY_CATEGORY_KEYWORDS.food.some((token) => lower.includes(token))) return 'food';
  return undefined;
}

function parseReactionNotes(notes = []) {
  const noteTexts = notes.map((n) => n?.text).filter(Boolean);
  const getByPrefix = (prefix) => {
    const p = `${prefix}:`;
    const hit = noteTexts.find((text) => text.toLowerCase().startsWith(p.toLowerCase()));
    return hit ? hit.slice(p.length).trim() : undefined;
  };

  const treatingDoctorText = getByPrefix('Treating doctor');
  let treatingDoctor;
  let doctorRole;
  if (treatingDoctorText) {
    const match = treatingDoctorText.match(/^(.*)\((.*)\)$/);
    if (match) {
      treatingDoctor = match[1].trim();
      doctorRole = match[2].trim();
    } else {
      treatingDoctor = treatingDoctorText;
    }
  }

  const autoInjectorText = getByPrefix('Auto-injector');
  const autoInjectorPrescribed =
    typeof autoInjectorText === 'string' ? /^(yes|true|y)/i.test(autoInjectorText) : undefined;

  return {
    severity: getByPrefix('Severity'),
    riskSubstanceName: getByPrefix('Risk substance name'),
    clinicalManagement: getByPrefix('Clinical management'),
    testMethod: getByPrefix('Test method'),
    testResults: getByPrefix('Test results'),
    outcome: getByPrefix('Outcome'),
    patientMustAvoid: getByPrefix('Must avoid'),
    comments: getByPrefix('Comments'),
    initialExposureTime:
      getByPrefix('Initial exposure time') ?? getByPrefix('Initial exposure') ?? undefined,
    reactionOnsetDescription: getByPrefix('Reaction onset time'),
    firstReactionOnset: getByPrefix('First reaction onset'),
    treatingDoctor,
    doctorRole,
    autoInjectorPrescribed
  };
}

/** ------------------ Patients------------------ */
export async function fetchPatients({ urn, name, medicareId, gender, sort } = {}) {
  // FHIR query
  const params = { _count: 50 };
  const identifiers = [];
  if (urn) {
    const value = normalizeIdValue(urn);
    if (value) {
      identifiers.push(`${FHIR_SYSTEMS.URN}|${value}`, `URN|${value}`);
    }
  }
  if (medicareId) {
    const value = normalizeIdValue(medicareId);
    if (value) {
      identifiers.push(`${FHIR_SYSTEMS.MEDICARE}|${value}`, `AUS-MEDICARE|${value}`);
    }
  }
  if (identifiers.length) params.identifier = identifiers;
  if (name) params.name = name;
  if (gender) {
    const g = String(gender).toLowerCase();
    if (['male', 'female', 'other', 'unknown'].includes(g)) params.gender = g;
  }
  if (sort?.key) {
    const keyMap = { name: 'name', dob: 'birthdate' };
    const fhirKey = keyMap[sort.key];
    if (fhirKey) params._sort = sort.direction === 'desc' ? `-${fhirKey}` : fhirKey;
  }

  const bundle = await fhirSearch('Patient', params);
  let rows = mapBundleToRows(bundle);

  rows = applyFilters(rows, { gender });
  if (sort) rows = sortData(rows, sort);

  return rows;
}

export async function fetchPatientById(id) {
  if (!id) return null;
  const key = String(id);
  if (!patientCache.has(key)) {
    const request = (async () => {
      const res = await fetch(`${BASE_URL}/Patient/${encodeURIComponent(key)}`, {
        headers: { Accept: 'application/fhir+json' }
      });
      if (!res.ok) return null;
      const patient = await res.json();
      if (patient?.resourceType !== 'Patient') return null;
      return mapPatientToRow(patient);
    })().catch((error) => {
      patientCache.delete(key);
      throw error;
    });
    patientCache.set(key, request);
  }
  const result = await patientCache.get(key);
  if (result === null) {
    patientCache.delete(key);
  }
  return result;
}

/** ------------------ Substances & Events ------------------ */
export async function fetchSubstances(patientId, { filters, sort } = {}) {
  // FHIR: AllergyIntolerance per patient -> rows for the substance table
  const searchParams = {
    patient: patientId,
    _count: 100,
    _sort: '-_lastUpdated'
  };
  const bundle = await fhirSearch('AllergyIntolerance', searchParams);
  const groups = {};
  (bundle.entry || []).forEach(e => {
    const ai = e.resource;
    if (ai?.resourceType !== 'AllergyIntolerance') return;
    const keyRaw = (ai.code?.text || ai.code?.coding?.[0]?.display || '').trim();
    const key = keyRaw.toLowerCase() || 'unknown';
    if (!groups[key]) groups[key] = { name: keyRaw, items: [] };
    groups[key].items.push(ai);
  });

  let rows = Object.values(groups).map(({ name, items }) => {
    let totalReactions = 0;
    let lastDate = null;
    items.forEach(ai => {
      const reactions = ai.reaction || [];
      totalReactions += reactions.length;
      const candidateDates = reactions.map(r => r.onset).concat([ai.recordedDate, ai.meta?.lastUpdated]).filter(Boolean);
      candidateDates.forEach(d => {
        const dt = new Date(d);
        if (!lastDate || dt > new Date(lastDate)) lastDate = d;
      });
    });

    const rep = items.slice().sort((a,b) => new Date(b.meta?.lastUpdated||0) - new Date(a.meta?.lastUpdated||0))[0];
    const verification = rep.verificationStatus?.coding?.[0]?.code || rep.verificationStatus?.text || 'unknown';
    const clinical = rep.clinicalStatus?.coding?.[0]?.code;
    const crit = clinical === 'resolved' ? 'delabeled' : (rep.criticality || 'unable-to-assess');

    const ids = items.map(ai => ai.id);

    return {
      id: ids.join(','),          
      name: name || 'Unknown',
      eventsCount: totalReactions,
      verificationStatus: verification,
      criticality: normalizeCriticality(crit),
      lastReportDate: lastDate ? String(lastDate).substring(0,10) : null,
      _groupIds: ids,
      _raw: rep
    };
  });
  // keep existing client-side filters/sort
  rows = applyFilters(rows, filters);
  if (sort) rows = sortData(rows, sort);
  return rows;
}

export async function fetchEvents(substanceId, { filters, sort } = {}) {
  const ids = String(substanceId).split(',').map(s => s.trim()).filter(Boolean);
  const allRows = [];

  for (const id of ids) {
    const res = await fetch(`${BASE_URL}/AllergyIntolerance/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/fhir+json' }
    });
    if (!res.ok) continue;
    const ai = await res.json();
    (ai.reaction || []).forEach((rx, localIdx) => {
      const parsed = parseReactionNotes(rx.note || []);
      const manifestations = Array.isArray(rx.manifestation)
        ? rx.manifestation
            .map((m) =>
              typeof m === 'string'
                ? m
                : (m?.text || m?.display || m?.code || (Array.isArray(m?.coding) && (m.coding[0]?.display || m.coding[0]?.code)) || '')
            )
            .filter(Boolean)
        : [];
      const treatingDoctor = parsed.treatingDoctor || ai.asserter?.display || '';
      const doctorRole = parsed.doctorRole || '';
      const primarySubstanceName = ai.code?.text || ai.code?.coding?.[0]?.display || 'Unknown';
      const mustAvoid = parsed.patientMustAvoid || ai.patientInstruction || '';
      const notesParts = [
        parsed.clinicalManagement ? `Clinical management: ${parsed.clinicalManagement}` : null,
        parsed.testResults ? `Test results: ${parsed.testResults}` : null,
        mustAvoid ? `Must avoid: ${mustAvoid}` : null,
        parsed.comments ? `Comments: ${parsed.comments}` : null
      ].filter(Boolean);
      allRows.push({
        id: `${ai.id}#${localIdx + 1}`, 
        seq: 0,                        
        substanceId: ai.id,
        substanceName: primarySubstanceName,
        date: rx.onset || null,
        notes: notesParts.join('; '),
        treatingDoctor,
        doctorRole,
        riskSubstanceName: parsed.riskSubstanceName || primarySubstanceName,
        verificationStatus: ai.verificationStatus?.coding?.[0]?.code || 'unknown',
        criticality: normalizeCriticality(
          ai.clinicalStatus?.coding?.[0]?.code === 'resolved'
            ? 'delabeled'
            : ai.criticality || 'unable-to-assess'
        ),
        reactionStartTime: rx.onset || null,
        manifestations,
        clinicalManagement: parsed.clinicalManagement || '',
        autoInjectorPrescribed: parsed.autoInjectorPrescribed,
        patientMustAvoid: mustAvoid,
        testResults: parsed.testResults || '',
        testMethod: parsed.testMethod || '',
        outcome: parsed.outcome || '',
        comments: parsed.comments || '',
        severity: parsed.severity || rx.severity || '',
        initialExposureTime: parsed.initialExposureTime || '',
        reactionOnsetDescription: parsed.reactionOnsetDescription || '',
        firstOnset: parsed.firstReactionOnset || '',
        lastOnset: rx.onset || null
      });
    });
  }

  allRows.sort((a,b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return ad - bd;
  });
  allRows.forEach((row, i) => row.seq = i + 1);

  let rows = allRows;
  rows = applyFilters(rows, filters);
  if (sort) rows = sortData(rows, sort, (row, key) => row[key]);
  return rows;
}

export async function fetchEventById(eventId) {
  const cacheKey = canonicalEventKey(eventId);
  if (!cacheKey) return null;
  if (!eventCache.has(cacheKey)) {
    const request = fhirFetchEventById(cacheKey).catch((error) => {
      console.error('⚠️ fetchEventById error:', error);
      eventCache.delete(cacheKey);
      throw error;
    });
    eventCache.set(cacheKey, request);
  }
  const result = await eventCache.get(cacheKey);
  if (result === null) {
    eventCache.delete(cacheKey);
  }
  return result;
}

export async function createEvent(patientId, payload) {
  // If no patientId (or it's a placeholder like 'new'), create a FHIR Patient first
  let targetPatientId = patientId;
  if (!targetPatientId || targetPatientId === 'new') {
    const fullName = (payload.patientName || payload.name || '').trim();
    let family; // don't force 'Unknown' — omit family if user entered a single token
    let given = fullName || 'New Patient';
    if (fullName && fullName.includes(' ')) {
      const parts = fullName.split(/\s+/);
      given = parts.slice(0, -1).join(' ') || parts[0];
      family = parts.slice(-1)[0];
    }

    const idValueURN = payload.urn ? normalizeIdValue(payload.urn) : undefined;
    const idValueMedicare = payload.medicareId ? normalizeIdValue(payload.medicareId) : undefined;
    const identifiers = [
      idValueURN && { system: FHIR_SYSTEMS.URN, value: idValueURN },
      idValueURN && { system: 'URN', value: idValueURN },
      idValueMedicare && { system: FHIR_SYSTEMS.MEDICARE, value: idValueMedicare },
      idValueMedicare && { system: 'AUS-MEDICARE', value: idValueMedicare }
    ].filter(Boolean);

    const newPatient = {
      resourceType: 'Patient',
      identifier: identifiers.length ? identifiers : undefined,
      name: [(() => {
        const n = { use: 'official', given: [given] };
        if (family) n.family = family;
        n.text = fullName || given;
        return n;
      })()],
      gender: payload.gender ? String(payload.gender).toLowerCase() : undefined,
      birthDate: payload.dob || undefined
    };

    const res = await fetch(`${BASE_URL}/Patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(newPatient)
    });
    if (!res.ok) throw new Error('Failed to create Patient');
    const created = await res.json();
    targetPatientId = created.id;
    if (targetPatientId) {
      patientCache.set(String(targetPatientId), Promise.resolve(mapPatientToRow(created)));
    }
  }

  // Build one reaction from form payload
  const severityMap = { High: 'severe', Medium: 'moderate', Low: 'mild' };
  const patientInstruction = (payload.patientMustAvoid || '').trim() || undefined;
  const reaction = {
    onset: toFHIRDateTime(payload.reactionStartTime || payload.lastOnset || payload.eventDate) || null,
    severity: severityMap[payload.severity] || undefined,
    manifestation: (payload.manifestations || [])
      .filter(Boolean)
      .map((item) => {
        if (typeof item === 'string') {
          return { text: item };
        }
        const text = item.text || item.display || item.code || '';
        const system = item.system || item.codingSystem;
        const coding = item.code
          ? [
              {
                system: system || 'http://snomed.info/sct',
                code: item.code,
                display: item.display || text
              }
            ]
          : undefined;
        return {
          ...(coding ? { coding } : {}),
          ...(text ? { text } : {})
        };
      }),
    note: [
      payload.severity && { text: `Severity: ${payload.severity}` },
      payload.riskSubstanceName && { text: `Risk substance name: ${payload.riskSubstanceName}` },
      payload.clinicalManagement && { text: `Clinical management: ${payload.clinicalManagement}` },
      payload.testMethod && { text: `Test method: ${payload.testMethod}` },
      payload.testResults && { text: `Test results: ${payload.testResults}` },
      payload.outcome && { text: `Outcome: ${payload.outcome}` },
      payload.firstOnset && { text: `First reaction onset: ${payload.firstOnset}` },
      payload.patientMustAvoid && { text: `Must avoid: ${payload.patientMustAvoid}` },
      (payload.autoInjectorPrescribed !== undefined && payload.autoInjectorPrescribed !== null) && { text: `Auto-injector: ${payload.autoInjectorPrescribed ? 'Yes' : 'No'}` },
      (payload.treatingDoctor || payload.treatingDoctorRole) && { text: `Treating doctor: ${payload.treatingDoctor || ''}${payload.treatingDoctorRole ? ` (${payload.treatingDoctorRole})` : ''}` },
      payload.initialExposureTime && { text: `Initial exposure time: ${payload.initialExposureTime}` },
      payload.reactionOnsetDescription && { text: `Reaction onset time: ${payload.reactionOnsetDescription}` },
      payload.comments && { text: `Comments: ${payload.comments}` }
    ].filter(Boolean)
  };

  // Try to find existing AllergyIntolerance for same substance
  const substanceText = payload.substanceName?.trim();
  const searchParams = { patient: targetPatientId, _count: 10 };
  if (substanceText) searchParams['code:text'] = substanceText;
  const bundle = await fhirSearch('AllergyIntolerance', searchParams);
  const candidates = (bundle.entry || []).map(e => e.resource).filter(r => r.resourceType === 'AllergyIntolerance');
  let ai = candidates.find(r => {
    const codeText = (r.code?.text || '').trim().toLowerCase();
    const codeCoding = (r.code?.coding || []).some(c => (c.display || c.code || '').trim().toLowerCase() === substanceText?.toLowerCase());
    return codeText === substanceText?.toLowerCase() || codeCoding;
  });

  const verificationMap = { Confirmed: 'confirmed', Unconfirmed: 'unconfirmed', Refuted: 'refuted' };
  const criticalityMap = { 'High Risk': 'high', 'Low Risk': 'low' };

  if (ai) {
    // append reaction and update status
    const getRes = await fetch(`${BASE_URL}/AllergyIntolerance/${ai.id}`, { headers: { Accept: 'application/fhir+json' } });
    ai = await getRes.json();
    ai.reaction = [...(ai.reaction || []), reaction];

    if (patientInstruction !== undefined) {
      ai.patientInstruction = patientInstruction;
    } else if ('patientInstruction' in ai) {
      delete ai.patientInstruction;
    }
    const inferredCategory = inferAllergyCategory(substanceText || ai.code?.text || '');
    if (inferredCategory) {
      const categories = new Set(Array.isArray(ai.category) ? ai.category : []);
      categories.add(inferredCategory);
      ai.category = Array.from(categories);
    }
    ai.type = ai.type || 'allergy';

    const v = verificationMap[payload.verificationStatus];
    if (v) {
      ai.verificationStatus = {
        coding: [{ system: FHIR_SYSTEMS.ALLERGY_VERIFICATION, code: v }]
      };
    }
    const normalizedCriticality = normalizeCriticality(payload.criticality);

    if (normalizedCriticality === 'Delabeled') {
      ai.clinicalStatus = {
        coding: [{ system: FHIR_SYSTEMS.ALLERGY_CLINICAL_STATUS, code: 'resolved' }]
      };
      delete ai.criticality;
    } else if (criticalityMap[normalizedCriticality]) {
      ai.criticality = criticalityMap[normalizedCriticality];
      if (ai.clinicalStatus && ai.clinicalStatus.coding) {
        delete ai.clinicalStatus;
      }
    } else {
      delete ai.criticality;
      if (ai.clinicalStatus && ai.clinicalStatus.coding) {
        delete ai.clinicalStatus;
      }
    }

    const headers = { 'Content-Type': 'application/fhir+json' };

    const putRes = await fetch(`${BASE_URL}/AllergyIntolerance/${ai.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(ai)
    });
    if (!putRes.ok) throw new Error('Failed to update AllergyIntolerance');

    invalidateEventCache(ai.id);

    return { id: `${ai.id}#${(ai.reaction || []).length}`, substanceId: ai.id };
  }

  if (!ai) {
    // only create when no existing AllergyIntolerance of same substance
    const inferredCategory = inferAllergyCategory(substanceText);
    const newAI = {
      resourceType: 'AllergyIntolerance',
      patient: { reference: `Patient/${targetPatientId}` },
      code: { text: substanceText || 'Unknown substance' },
      type: 'allergy',
      category: inferredCategory ? [inferredCategory] : undefined,
      verificationStatus: verificationMap[payload.verificationStatus]
        ? {
            coding: [
              {
                system: FHIR_SYSTEMS.ALLERGY_VERIFICATION,
                code: verificationMap[payload.verificationStatus]
              }
            ]
          }
        : undefined,
      clinicalStatus: normalizeCriticality(payload.criticality) === 'Delabeled'
        ? {
            coding: [
              {
                system: FHIR_SYSTEMS.ALLERGY_CLINICAL_STATUS,
                code: 'resolved'
              }
            ]
          }
        : undefined,
      criticality: criticalityMap[normalizeCriticality(payload.criticality)] || undefined,
      reaction: [reaction],
      ...(patientInstruction !== undefined ? { patientInstruction } : {}),
      recordedDate: toFHIRDateTime(payload.eventDate) || undefined
    };

    const postRes = await fetch(`${BASE_URL}/AllergyIntolerance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(newAI)
    });
    if (!postRes.ok) throw new Error('Failed to create AllergyIntolerance');
    const created = await postRes.json();
    invalidateEventCache(created.id);
    return { id: `${created.id}#1`, substanceId: created.id };
  }
}

export async function fetchMhrSnapshot(patientId) {
  await delay();
  return mhr[patientId] || null;
}
