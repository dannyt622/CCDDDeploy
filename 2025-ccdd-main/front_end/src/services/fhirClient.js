// Lightweight FHIR client for browser (no JSX)
// Public HAPI R4 endpoint by default
import { normalizeCriticality } from '../utils/criticality.js';

export const BASE_URL = 'https://hapi.fhir.org/baseR4';

function toQS(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(x => usp.append(k, x));
      else usp.append(k, v);
    });
  return usp.toString();
}

export async function fhirSearch(resourceType, params = {}, { signal } = {}) {
  const qs = toQS(params);
  const url = `${BASE_URL}/${resourceType}${qs ? `?${qs}` : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/fhir+json' },
      signal: signal || controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`FHIR search ${resourceType} failed: ${res.status} ${txt}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch a single event by composite id like "<AllergyIntoleranceId>~<seq>" or "#<seq>"
export async function fetchEventById(eventId) {
  if (!eventId) return null;
  const raw = String(eventId);
  const parts = raw.split(raw.includes('~') ? '~' : '#');
  const allergyId = parts[0];
  const seq = Number.parseInt(parts[1] || '1', 10);

  const res = await fetch(`${BASE_URL}/AllergyIntolerance/${encodeURIComponent(allergyId)}`, {
    headers: { Accept: 'application/fhir+json' },
  });
  if (!res.ok) return null;
  const ai = await res.json();

  const reactions = Array.isArray(ai.reaction) ? ai.reaction : [];
  const rx = reactions[seq - 1];
  if (!rx) return null;

  // Extract structured values from reaction.note[] we stored during createEvent
  const noteTexts = (rx.note || []).map(n => n.text).filter(Boolean);
  const getByPrefix = (prefix) => {
    const p = `${prefix}:`;
    const hit = noteTexts.find(t => t.toLowerCase().startsWith(p.toLowerCase()));
    return hit ? hit.slice(p.length).trim() : undefined;
  };

  const clinicalManagement = getByPrefix('Clinical management');
  const testResults = getByPrefix('Test results');
  const mustAvoid = getByPrefix('Must avoid') || ai.patientInstruction;
  const autoInjectorText = getByPrefix('Auto-injector');
  const autoInjectorPrescribed = typeof autoInjectorText === 'string' ? /^(yes|true|y)/i.test(autoInjectorText) : undefined;
  const treatingDoctorText = getByPrefix('Treating doctor');
  let treatingDoctor = undefined, doctorRole = undefined;
  if (treatingDoctorText) {
    const m = treatingDoctorText.match(/^(.*)\((.*)\)$/);
    if (m) { treatingDoctor = m[1].trim(); doctorRole = m[2].trim(); }
    else treatingDoctor = treatingDoctorText;
  }
  const severity = getByPrefix('Severity');
  const testMethod = getByPrefix('Test method');
  const outcome = getByPrefix('Outcome');
  const comments = getByPrefix('Comments');
  const riskSubstanceName = getByPrefix('Risk substance name');
  const initialExposure = getByPrefix('Initial exposure time') || getByPrefix('Initial exposure');
  const reactionOnsetNote = getByPrefix('Reaction onset time');
  const firstReactionOnset = getByPrefix('First reaction onset') || initialExposure;

  const recognized = [
    'clinical management',
    'test results',
    'must avoid',
    'auto-injector',
    'treating doctor',
    'initial exposure time',
    'initial exposure',
    'reaction onset time',
    'severity',
    'test method',
    'outcome',
    'comments',
    'risk substance name',
    'first reaction onset'
  ];
  const freeNotes = noteTexts.filter(t => !recognized.some(r => t.toLowerCase().startsWith(r + ':')));
  const joinedNotes = freeNotes.join('; ');

  const substanceName = ai.code?.text || ai.code?.coding?.[0]?.display || ai.code?.coding?.[0]?.code || 'Unknown';
  const patientRef = ai.patient?.reference || '';
  const patientId = patientRef.includes('/') ? patientRef.split('/')[1] : patientRef;

  return {
    id: raw,
    patientId,
    seq,
    substanceId: allergyId,
    substanceName,
    date: ai.recordedDate || ai.meta?.lastUpdated || null,
    treatingDoctor,
    doctorRole,
    notes: joinedNotes,
    clinicalManagement,
    reactionStartTime: rx.onset || null,
    reactionOnsetDescription: reactionOnsetNote || '',
    manifestations: (rx.manifestation || []).map(m => m.text || m.coding?.[0]?.display || m.coding?.[0]?.code),
    verificationStatus: ai.verificationStatus?.coding?.[0]?.code || ai.verificationStatus?.text || 'unknown',
    criticality: normalizeCriticality(
      ai.clinicalStatus?.coding?.[0]?.code === 'resolved'
        ? 'delabeled'
        : ai.criticality || 'unable-to-assess'
    ),
    severity,
    testMethod,
    outcome,
    comments,
    riskSubstanceName: riskSubstanceName || substanceName,
    initialExposureTime: initialExposure || null,
    firstReactionOnset: firstReactionOnset || null,
    firstOnset: firstReactionOnset || null,
    lastOnset: rx.onset || null,
    autoInjectorPrescribed,
    testResults,
    patientMustAvoid: mustAvoid,
  };
}
