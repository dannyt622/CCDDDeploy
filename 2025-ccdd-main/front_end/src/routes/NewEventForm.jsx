import { formatISO } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import DateTimeInput from '../components/DateTimeInput.jsx';
import {
  createEvent,
  fetchEvents,
  fetchMhrSnapshot,
  fetchPatientById,
  fetchSubstances
} from '../services/api.js';
import { formatReactionOnset } from '../utils/formatters.js';
import { useAppContext } from '../context/AppContext.jsx';
import { COMMON_ALLERGENS } from '../constants/allergens.js';
import { getRoleLabel, ROLE_OPTIONS } from '../constants/roles.js';
import { normalizeCriticality } from '../utils/criticality.js';

const verificationOptions = ['Unconfirmed', 'Confirmed', 'Delabeled'];
const criticalityOptions = ['Low Risk', 'High Risk', 'Delabeled'];
const manifestationSuggestions = ['Urticaria', 'Wheeze', 'Cough', 'Rash', 'Angioedema', 'Anaphylaxis'];
const testMethodOptions = ['Clinical evaluation/history', 'Skin test', 'Challenge test'];
const recorderDefaults = {
  treatingDoctor: 'Dr Janet Hays',
  treatingDoctorRole: 'Allergist'
};
const genderOptions = ['Male', 'Female', 'Prefer not to say'];
const verificationLookup = verificationOptions.reduce((acc, option) => {
  acc[option.toLowerCase()] = option;
  return acc;
}, {});

function normalizeVerificationStatus(value) {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  return verificationLookup[normalized] || '';
}

function eventTimestamp(event) {
  const candidate =
    event?.lastOnset || event?.reactionStartTime || event?.date || event?.firstOnset || null;
  if (!candidate) return 0;
  const time = new Date(candidate).getTime();
  return Number.isFinite(time) ? time : 0;
}

function selectLatestEvent(events = []) {
  if (!Array.isArray(events) || events.length === 0) return null;
  return events.reduce((latest, current) => {
    if (!current) return latest;
    if (!latest) return current;
    return eventTimestamp(current) >= eventTimestamp(latest) ? current : latest;
  }, null);
}

export default function NewEventForm() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setExpandedSubstance, user, selectedRole } = useAppContext();
  const initialSubstanceId = location.state?.substanceId || null;
  const prefillPatient = location.state?.prefillPatient || {};
  const doctorRoleLabel = getRoleLabel(user?.role || selectedRole);
  const doctorName = user?.name?.trim() || '';
  const doctorDefaults = {
    treatingDoctor: doctorName || recorderDefaults.treatingDoctor,
    treatingDoctorRole: doctorRoleLabel || recorderDefaults.treatingDoctorRole
  };
  const isNewPatient = patientId === 'new';
  const breadcrumbs = useMemo(() => {
    const trail = [{ label: 'patient search', to: '/patients' }];
    const allergiesLink = !isNewPatient ? `/patients/${patientId}/allergies` : undefined;
    trail.push(
      allergiesLink
        ? { label: 'Allergy History', to: allergiesLink }
        : { label: 'Allergy History' }
    );
    trail.push({ label: 'New Allergy Event', to: location.pathname });
    return trail;
  }, [isNewPatient, patientId, location.pathname]);

  const [patient, setPatient] = useState(null);
  const [mhr, setMhr] = useState(null);
  const [substances, setSubstances] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const prefilledFromEvents = useRef(new Set());

  const [form, setForm] = useState({
    patientName: '',
    gender: '',
    dob: '',
    treatingDoctor: doctorDefaults.treatingDoctor,
    treatingDoctorRole: doctorDefaults.treatingDoctorRole,
    eventDate: formatISO(new Date(), { representation: 'date' }),
    urn: '',
    medicareId: '',
    substanceName: '',
    riskSubstanceName: '',
    severity: 'Medium',
    initialExposureTime: '',
    reactionStartTime: '',
    clinicalManagement: '',
    manifestations: ['Urticaria'],
    verificationStatus: '',
    criticality: '',
    testResults: '',
    outcome: '',
    comments: '',
    testMethod: '',
    autoInjectorPrescribed: true,
    patientMustAvoid: '',
    firstOnset: ''
  });

  const [reactionOnset, setReactionOnset] = useState('');
  const [lastOnset, setLastOnset] = useState('');

  useEffect(() => {
    async function load() {
      if (patientId === 'new') {
        const patientRecord = {
          id: 'new',
          urn: prefillPatient.urn || '',
          name: prefillPatient.name || '',
          medicareId: prefillPatient.medicareId || '',
          gender: prefillPatient.gender || '',
          dob: prefillPatient.dob || ''
        };
        setPatient(patientRecord);
        setMhr(null);
        setSubstances([]);
        primeForm('', patientRecord, null, {
          treatingDoctor: doctorDefaults.treatingDoctor,
          treatingDoctorRole: doctorDefaults.treatingDoctorRole,
          patientName: patientRecord.name,
          urn: patientRecord.urn,
          medicareId: patientRecord.medicareId,
          gender: patientRecord.gender,
          dob: patientRecord.dob
        });
        return;
      }

      const [patientRecord, mhrSnapshot, existingSubstances] = await Promise.all([
        fetchPatientById(patientId),
        fetchMhrSnapshot(patientId),
        fetchSubstances(patientId)
      ]);
      setPatient(patientRecord);
      setMhr(mhrSnapshot);
      setSubstances(existingSubstances);
      const initialSubstance = resolveInitialSubstance({
        existingSubstances,
        mhrSnapshot,
        initialId: location.state?.substanceId
      });
      primeForm(initialSubstance, patientRecord, mhrSnapshot, doctorDefaults);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, prefillPatient.urn, prefillPatient.name, prefillPatient.medicareId, prefillPatient.gender, prefillPatient.dob]);

  useEffect(() => {
    if (form.reactionStartTime && form.initialExposureTime) {
      setReactionOnset(formatReactionOnset(form.reactionStartTime, form.initialExposureTime));
    } else {
      setReactionOnset('');
    }
  }, [form.reactionStartTime, form.initialExposureTime]);

  useEffect(() => {
    if (!form.reactionStartTime) {
      setLastOnset('');
      return;
    }
    setLastOnset((prev) => (prev === form.reactionStartTime ? prev : form.reactionStartTime));
  }, [form.reactionStartTime]);

  useEffect(() => {
    if (!substances.length) return;
    const normalizedName = (form.substanceName || '').trim().toLowerCase();
    const matchByName = normalizedName
      ? substances.find((item) => item.name?.trim().toLowerCase() === normalizedName)
      : null;
    const fallbackById = initialSubstanceId
      ? substances.find((item) => item.id === initialSubstanceId)
      : null;
    const targetSubstance = matchByName || fallbackById;
    if (!targetSubstance || !targetSubstance.id) return;
    if (prefilledFromEvents.current.has(targetSubstance.id)) return;

    let cancelled = false;
    const loadPreviousEvent = async () => {
      try {
        const events = await fetchEvents(targetSubstance.id);
        if (cancelled) return;
        const latestEvent = selectLatestEvent(events);
        prefilledFromEvents.current.add(targetSubstance.id);
        if (!latestEvent) return;
        setForm((prev) => ({
          ...prev,
          riskSubstanceName:
            latestEvent.riskSubstanceName || latestEvent.substanceName || prev.riskSubstanceName,
          verificationStatus:
            normalizeVerificationStatus(latestEvent.verificationStatus) ||
            prev.verificationStatus ||
            'Unconfirmed',
          criticality: normalizeCriticality(latestEvent.criticality) || prev.criticality || 'Low Risk',
          firstOnset: latestEvent.firstOnset || prev.firstOnset
        }));
      } catch (error) {
        console.error('Failed to prefill previous event details:', error);
        prefilledFromEvents.current.delete(targetSubstance.id);
      }
    };

    loadPreviousEvent();

    return () => {
      cancelled = true;
    };
  }, [substances, form.substanceName, initialSubstanceId]);

  const primeForm = (substanceName, patientRecord, mhrSnapshot, overrides = {}) => {
    const substanceData = mhrSnapshot?.substances?.[substanceName];
    setForm((prev) => ({
      ...prev,
      patientName: overrides.patientName ?? patientRecord?.name ?? prev.patientName,
      gender: overrides.gender ?? patientRecord?.gender ?? prev.gender,
      dob: overrides.dob ?? patientRecord?.dob ?? prev.dob,
      urn: overrides.urn ?? patientRecord?.urn ?? prev.urn,
      medicareId: overrides.medicareId ?? patientRecord?.medicareId ?? prev.medicareId,
      treatingDoctor:
        overrides.treatingDoctor ??
        mhrSnapshot?.treatingDoctor ??
        prev.treatingDoctor ??
        doctorDefaults.treatingDoctor,
      treatingDoctorRole:
        overrides.treatingDoctorRole ??
        mhrSnapshot?.treatingDoctorRole ??
        prev.treatingDoctorRole ??
        doctorDefaults.treatingDoctorRole,
      substanceName: substanceName || prev.substanceName,
      riskSubstanceName:
        overrides.riskSubstanceName ??
        prev.riskSubstanceName ??
        substanceData?.riskSubstanceName ??
        (substanceName || prev.substanceName),
      severity: overrides.severity ?? prev.severity ?? 'Medium',
      initialExposureTime:
        overrides.initialExposureTime ??
        substanceData?.initialExposureTime ??
        substanceData?.firstOnset ??
        prev.initialExposureTime,
      verificationStatus: substanceData?.verificationStatus || prev.verificationStatus || 'Unconfirmed',
      criticality: normalizeCriticality(substanceData?.criticality) || prev.criticality || 'Low Risk',
      patientMustAvoid: mhrSnapshot?.patientMustAvoid || prev.patientMustAvoid,
      firstOnset: substanceData?.firstOnset || prev.firstOnset,
      manifestations: prev.manifestations?.length ? prev.manifestations : ['Urticaria']
    }));
  };

  const substanceOptions = useMemo(() => {
    const keys = Object.keys(mhr?.substances || {});
    const existing = substances.map((item) => item.name);
    const combined = [...COMMON_ALLERGENS, ...existing, ...keys];
    const seen = new Set();
    return combined
      .map((name) => (typeof name === 'string' ? name.trim() : ''))
      .filter((name) => {
        if (!name) return false;
        const normalized = name.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }, [mhr, substances]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubstanceChange = (value) => {
    const substanceData = mhr?.substances?.[value];
    setForm((prev) => ({
      ...prev,
      substanceName: value,
      riskSubstanceName: prev.riskSubstanceName || value,
      severity: substanceData?.severity || prev.severity || 'Medium',
      verificationStatus: substanceData?.verificationStatus || prev.verificationStatus || 'Unconfirmed',
      criticality: normalizeCriticality(substanceData?.criticality) || prev.criticality || 'Low Risk',
      firstOnset: substanceData?.firstOnset || prev.firstOnset,
      initialExposureTime: substanceData?.initialExposureTime || prev.initialExposureTime,
      patientMustAvoid: substanceData?.patientMustAvoid || prev.patientMustAvoid
    }));
    if (errors.substanceName) {
      setErrors((prev) => ({ ...prev, substanceName: undefined }));
    }
  };

  const handleRiskSubstanceChange = (value) => {
    const substanceData = mhr?.substances?.[value];
    setForm((prev) => ({
      ...prev,
      riskSubstanceName: value,
      verificationStatus: substanceData?.verificationStatus || prev.verificationStatus || 'Unconfirmed',
      criticality: normalizeCriticality(substanceData?.criticality) || prev.criticality || 'Low Risk',
      firstOnset: substanceData?.firstOnset || prev.firstOnset,
      initialExposureTime: substanceData?.initialExposureTime || prev.initialExposureTime,
      patientMustAvoid: substanceData?.patientMustAvoid || prev.patientMustAvoid
    }));
  };

  const updateManifestation = (index, value) => {
    setForm((prev) => {
      const next = [...prev.manifestations];
      next[index] = value;
      return { ...prev, manifestations: next };
    });
    if (errors.manifestations) {
      setErrors((prev) => ({ ...prev, manifestations: undefined }));
    }
  };

  const addManifestation = () => {
    setForm((prev) => ({ ...prev, manifestations: [...prev.manifestations, ''] }));
  };

  const removeManifestation = (index) => {
    setForm((prev) => {
      const filtered = prev.manifestations.filter((_, idx) => idx !== index);
      return { ...prev, manifestations: filtered.length ? filtered : [''] };
    });
  };

  // Normalize UI date/time to FHIR dateTime with local offset (YYYY-MM-DDTHH:MM:SS+/-HH:MM)
  const toFHIRDateTime = (val) => {
    if (!val) return undefined;
    const s = String(val).trim();

    const buildWithOffset = (yyyy, mm, dd, HH = '00', MM = '00') => {
      const d = new Date(+yyyy, +mm - 1, +dd, +HH, +MM);
      if (Number.isNaN(d.getTime())) return undefined;
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

    // YYYY-MM-DDTHH:MM (no seconds)
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (m) return buildWithOffset(m[1], m[2], m[3], m[4], m[5]);

    // YYYY-MM-DD (date only)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return buildWithOffset(s.slice(0, 4), s.slice(5, 7), s.slice(8, 10));

    // Fallback: Date -> ISO string with offset
    try {
      const d = val instanceof Date ? val : new Date(val);
      if (!Number.isNaN(d.getTime())) {
        const tzMin = -d.getTimezoneOffset();
        const sign = tzMin >= 0 ? '+' : '-';
        const ah = String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, '0');
        const am = String(Math.abs(tzMin) % 60).padStart(2, '0');
        const yyyy2 = d.getFullYear();
        const mm2 = String(d.getMonth() + 1).padStart(2, '0');
        const dd2 = String(d.getDate()).padStart(2, '0');
        const HH2 = String(d.getHours()).padStart(2, '0');
        const MM2 = String(d.getMinutes()).padStart(2, '0');
        const SS2 = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy2}-${mm2}-${dd2}T${HH2}:${MM2}:${SS2}${sign}${ah}:${am}`;
      }
    } catch (_) {
      /* ignore */
    }
    return undefined;
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.substanceName) nextErrors.substanceName = 'Required';
    if (!form.initialExposureTime) nextErrors.initialExposureTime = 'Required';
    if (!form.reactionStartTime) nextErrors.reactionStartTime = 'Required';
    if (form.initialExposureTime && form.reactionStartTime) {
      const initialTime = Date.parse(form.initialExposureTime);
      const reactionTime = Date.parse(form.reactionStartTime);
      if (Number.isFinite(initialTime) && Number.isFinite(reactionTime) && initialTime >= reactionTime) {
        nextErrors.initialExposureTime = 'Must be earlier than Reaction Start Time';
        nextErrors.reactionStartTime = 'Must be later than Initial Exposure Time';
      }
    }
    if (!form.verificationStatus) nextErrors.verificationStatus = 'Required';
    if (!form.criticality) nextErrors.criticality = 'Required';
    if (!form.clinicalManagement?.trim()) nextErrors.clinicalManagement = 'Required';
    if (!form.manifestations.some((value) => value.trim())) nextErrors.manifestations = 'Add at least one symptom';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        manifestations: form.manifestations.map((value) => value.trim()).filter(Boolean),
        criticality: normalizeCriticality(form.criticality),
        reactionStartTime: toFHIRDateTime(form.reactionStartTime),
        initialExposureTime: toFHIRDateTime(form.initialExposureTime),
        eventDate: toFHIRDateTime(form.eventDate),
        firstOnset: toFHIRDateTime(form.firstOnset),
        lastOnset: toFHIRDateTime(lastOnset),
        autoInjectorPrescribed: form.autoInjectorPrescribed,
        reactionOnsetDescription: reactionOnset
      };
      const created = await createEvent(patientId, payload);
      const resolvedPatientId = created?.patientId || patientId;
      setExpandedSubstance(created.substanceId);
      navigate(`/patients/${resolvedPatientId}/allergies`);
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <Layout title="New Allergy Event">
        <div className="py-20 text-center text-sm text-slate-500">Loading form…</div>
      </Layout>
    );
  }

  return (
    <Layout title="New Allergy Event" breadcrumbs={breadcrumbs}>
      <form onSubmit={handleSubmit} className="space-y-6 pb-10">
        <SectionCard title="Basic Information">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Patient Name">
                <input
                  type="text"
                  className={isNewPatient ? 'input' : 'input bg-slate-100 cursor-not-allowed'}
                  value={form.patientName}
                  onChange={(e) => isNewPatient && handleChange('patientName', e.target.value)}
                  readOnly={!isNewPatient}
                  aria-readonly={!isNewPatient}
                />
              </Field>
              <Field label="Gender">
                <select
                  className={`input ${!isNewPatient ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  value={form.gender || ''}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={!isNewPatient}
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date of Birth">
                <DateTimeInput
                  value={form.dob}
                  onChange={(next) => handleChange('dob', next)}
                  type="date"
                  disabled={!isNewPatient}
                  inputClassName={!isNewPatient ? 'bg-slate-100 cursor-not-allowed' : ''}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="URN">
                <input
                  type="text"
                  className={isNewPatient ? 'input' : 'input bg-slate-100 cursor-not-allowed'}
                  value={form.urn}
                  onChange={(e) => isNewPatient && handleChange('urn', e.target.value)}
                  readOnly={!isNewPatient}
                  aria-readonly={!isNewPatient}
                />
              </Field>
              <Field label="Medicare ID">
                <input
                  type="text"
                  className={isNewPatient ? 'input' : 'input bg-slate-100 cursor-not-allowed'}
                  value={form.medicareId}
                  onChange={(e) => isNewPatient && handleChange('medicareId', e.target.value)}
                  readOnly={!isNewPatient}
                  aria-readonly={!isNewPatient}
                />
              </Field>
              <div className="hidden sm:block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Treating Doctor">
                <input
                  type="text"
                  className="input"
                  value={form.treatingDoctor}
                  onChange={(e) => handleChange('treatingDoctor', e.target.value)}
                />
              </Field>
              <Field label="Doctor Role">
                <select
                  className="input"
                  value={form.treatingDoctorRole}
                  onChange={(e) => handleChange('treatingDoctorRole', e.target.value)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.label}>
                      {role.label}
                    </option>
                  ))}
                  {form.treatingDoctorRole &&
                    !ROLE_OPTIONS.some((role) => role.label === form.treatingDoctorRole) && (
                      <option value={form.treatingDoctorRole}>{form.treatingDoctorRole}</option>
                    )}
                </select>
              </Field>
              <Field label="Date of Report">
                <DateTimeInput
                  value={form.eventDate}
                  onChange={(next) => handleChange('eventDate', next)}
                  type="date"
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Event Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Specific Substance (Name of Food or Drug)" error={errors.substanceName}>
              <input
                type="text"
                list="substance-options"
                className="input"
                value={form.substanceName}
                onChange={(e) => handleSubstanceChange(e.target.value)}
                placeholder="Select or enter substance"
              />
              <datalist id="substance-options">
                {substanceOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field label="Severity of Reaction">
              <select
                className="input"
                value={form.severity}
                onChange={(event) => handleChange('severity', event.target.value)}
              >
                {['High', 'Medium', 'Low'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Time of Initial Exposure" error={errors.initialExposureTime}>
                <DateTimeInput
                  type="datetime-local"
                  value={form.initialExposureTime}
                  onChange={(next) => handleChange('initialExposureTime', next)}
                />
              </Field>
              <Field label="Reaction Start Time" error={errors.reactionStartTime}>
                <DateTimeInput
                  type="datetime-local"
                  value={form.reactionStartTime}
                  onChange={(next) => handleChange('reactionStartTime', next)}
                />
              </Field>
              <Field label="Reaction Onset Time">
                <input
                  type="text"
                  className="input bg-slate-100 cursor-not-allowed"
                  value={reactionOnset}
                  readOnly
                  aria-readonly="true"
                  placeholder="Auto-calculated"
                />
              </Field>
            </div>
            <Field label="Manifestations" error={errors.manifestations} span={2}>
              <div className="space-y-2">
                {form.manifestations.map((value, index) => (
                  <div
                    key={`manifestation-${index}`}
                    className="flex flex-col sm:flex-row sm:items-start gap-2"
                  >
                    <span className="text-xs font-semibold text-slate-500 sm:mt-2 w-6">
                      {index + 1}.
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <input
                        type="text"
                        list="manifestation-options"
                        className="input flex-1"
                        value={value}
                        onChange={(e) => updateManifestation(index, e.target.value)}
                        placeholder="Enter symptom"
                      />
                      {form.manifestations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManifestation(index)}
                          className="px-3 py-2 text-xs font-semibold text-slate-500 border border-slate-300 rounded-md hover:text-red-500 hover:border-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addManifestation}
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  + Add manifestation
                </button>
                <datalist id="manifestation-options">
                  {manifestationSuggestions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </Field>
            <Field label="Clinical Management" span={2} error={errors.clinicalManagement}>
              <textarea
                className="input h-24"
                value={form.clinicalManagement}
                onChange={(e) => handleChange('clinicalManagement', e.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Risk of Reaction Status">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Substance Name">
                <input
                  type="text"
                  className="input"
                  list="risk-substance-options"
                  value={form.riskSubstanceName}
                  onChange={(e) => handleRiskSubstanceChange(e.target.value)}
                  placeholder="Select or enter substance"
                />
                <datalist id="risk-substance-options">
                  {substanceOptions.map((option) => (
                    <option key={`risk-${option}`} value={option} />
                  ))}
                </datalist>
              </Field>
              <Field label="Verification Status" error={errors.verificationStatus}>
                <select
                  className="input"
                  value={form.verificationStatus}
                  onChange={(e) => handleChange('verificationStatus', e.target.value)}
                >
                  <option value="">Select status</option>
                  {verificationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Criticality" error={errors.criticality}>
                <select
                  className="input"
                  value={form.criticality}
                  onChange={(e) => handleChange('criticality', e.target.value)}
                >
                  <option value="">Select level</option>
                  {criticalityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date/Time of First Reaction Onset">
                <DateTimeInput
                  type="datetime-local"
                  value={form.firstOnset}
                  onChange={(next) => handleChange('firstOnset', next)}
                />
              </Field>
              <Field label="Date/Time of Last Reaction Onset">
                <DateTimeInput
                  type="datetime-local"
                  value={lastOnset}
                  onChange={(next) => setLastOnset(next)}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Investigation Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Test Method" span={2}>
              <div className="flex flex-wrap gap-4">
                {testMethodOptions.map((option) => {
                  const checked = form.testMethod === option;
                  return (
                    <label key={option} className="inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-brand-blue"
                        checked={checked}
                        onChange={() => handleChange('testMethod', checked ? '' : option)}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Test Results" error={errors.testResults} span={2}>
              <textarea
                className="input h-24"
                value={form.testResults}
                onChange={(e) => handleChange('testResults', e.target.value)}
              />
            </Field>
            <Field label="Outcome" span={2}>
              <textarea
                className="input h-24"
                value={form.outcome}
                onChange={(e) => handleChange('outcome', e.target.value)}
              />
            </Field>
            <Field label="Patient Must Avoid Statement" span={2}>
              <textarea
                className="input h-24"
                value={form.patientMustAvoid}
                onChange={(e) => handleChange('patientMustAvoid', e.target.value)}
              />
            </Field>
            <Field label="Comments" span={2}>
              <textarea
                className="input h-24"
                value={form.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
              />
            </Field>
            <Field label="Adrenaline Autoinjector Prescribed?">
              <select
                className="input"
                value={form.autoInjectorPrescribed ? 'yes' : 'no'}
                onChange={(e) => handleChange('autoInjectorPrescribed', e.target.value === 'yes')}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white/70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-brand-blue text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function resolveInitialSubstance({ existingSubstances, mhrSnapshot, initialId }) {
  if (initialId) {
    const match = existingSubstances.find((item) => item.id === initialId);
    if (match) return match.name;
  }
  const keys = Object.keys(mhrSnapshot?.substances || {});
  return keys[0] || existingSubstances[0]?.name || '';
}

function Field({ label, children, span = 1, error }) {
  return (
    <label className={`flex flex-col gap-1 ${span === 2 ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
      {children}
      {error && <span className="text-xs text-risk-high">{error}</span>}
    </label>
  );
}
