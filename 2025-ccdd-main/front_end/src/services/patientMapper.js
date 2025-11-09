import { FHIR_SYSTEMS } from '../constants/fhir.js';

// 將 FHIR Patient 轉成你 DataTable 需要的欄位
function getIdentifier(patient, system) {
  const arr = patient.identifier || [];
  const found = arr.find((id) => id.system === system || id.system?.toLowerCase() === system.toLowerCase());
  return found?.value || '';
}

export function mapPatientToRow(patient) {
  const name = Array.isArray(patient.name) && patient.name.length > 0 ? patient.name[0] : null;
  const displayName =
    (name?.text) ||
    ([...(name?.given || [])].join(' ') + (name?.family ? ` ${name.family}` : '')).trim() ||
    'Unknown';

  return {
    id: patient.id,                                            // 用於 onRowClick(`/patients/${id}/allergies`)
    urn:
      getIdentifier(patient, FHIR_SYSTEMS.URN) ||
      getIdentifier(patient, 'urn') ||
      getIdentifier(patient, 'URN') ||
      '',
    medicareId: getIdentifier(patient, FHIR_SYSTEMS.MEDICARE) || '',
    name: displayName,
    gender: patient.gender ? (patient.gender[0].toUpperCase() + patient.gender.slice(1)) : '',
    dob: patient.birthDate || null
  };
}

export function mapBundleToRows(bundle) {
  const entries = bundle?.entry || [];
  return entries
    .map(e => e.resource)
    .filter(r => r && r.resourceType === 'Patient')
    .map(mapPatientToRow);
}
