import { isValidElement, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { fetchEventById, fetchMhrSnapshot, fetchPatientById } from '../services/api.js';
import { formatDate, formatDateTime, formatReactionOnset } from '../utils/formatters.js';
import { normalizeCriticality } from '../utils/criticality.js';

export default function EventReportView() {
  const { eventId: rawEventId } = useParams();
  const eventId = decodeURIComponent(rawEventId || '');
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [patient, setPatient] = useState(null);
  const [mhr, setMhr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([
    { label: 'patient search', to: '/patients' },
    { label: 'Allergy History' },
    { label: 'Allergy Report', to: location.pathname }
  ]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Insert hash fragment logic if no sequence (~) exists in eventId
      let resolvedId = eventId;
      if (resolvedId && !resolvedId.includes('~') && window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        if (hash) resolvedId = `${resolvedId}~${hash}`;
      }
      let eventRecord = await fetchEventById(resolvedId);
      // Fallback: if the link carried only the AllergyIntolerance id (no sequence), assume first reaction
      if (!eventRecord && eventId && !eventId.includes('~') && !eventId.includes('#')) {
        eventRecord = await fetchEventById(`${eventId}~1`);
      }
      if (!eventRecord) {
        setLoading(false);
        return;
      }
      setEvent(eventRecord);
      const pid = eventRecord.patientId; // from FHIR AllergyIntolerance.patient.reference
      if (pid) {
        const patientRecord = await fetchPatientById(pid);
        setPatient(patientRecord);
        const mhrSnapshot = await fetchMhrSnapshot(pid);
        setMhr(mhrSnapshot);
        const allergiesLink = `/patients/${pid}/allergies`;
        setBreadcrumbs([
          { label: 'patient search', to: '/patients' },
          { label: 'Allergy History', to: allergiesLink },
          { label: 'Allergy Report', to: location.pathname }
        ]);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  if (loading) {
    return (
      <Layout title="Allergy Event">
        <div className="py-20 text-center text-sm text-slate-500">Loading event details…</div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout title="Allergy Event">
        <div className="py-20 text-center text-sm text-slate-500">Event not found.</div>
        <div className="text-right pr-4">
          <button onClick={() => navigate(-1)} className="text-brand-blue font-semibold underline">
            Back
          </button>
        </div>
      </Layout>
    );
  }

  const treatingDoctor = event.treatingDoctor || mhr?.treatingDoctor;
  const treatingDoctorRole = event.doctorRole || mhr?.treatingDoctorRole;
  const patientAvoid = event.patientMustAvoid || mhr?.patientMustAvoid;
  const initialExposureTime =
    event.initialExposureTime ||
    event.initialExposure ||
    mhr?.substances?.[event.substanceName]?.initialExposure ||
    null;
  const firstReactionOnset =
    event.firstReactionOnset ||
    event.firstOnset ||
    mhr?.substances?.[event.substanceName]?.firstOnset ||
    null;
  const lastReactionOnset = event.lastOnset || null;
  const onsetDisplay =
    event.reactionOnsetDescription ||
    (event.reactionStartTime && initialExposureTime
      ? formatReactionOnset(event.reactionStartTime, initialExposureTime)
      : formatReactionOnset(event.reactionStartTime));
  const severity = event.severity || null;
  const testMethod = event.testMethod || null;
  const outcome = event.outcome || null;
  const comments = event.comments || null;
  const riskSubstanceName = event.riskSubstanceName || getSubstanceName(event);
  const initialExposureDisplay = initialExposureTime
    ? formatDateTime(initialExposureTime) || initialExposureTime
    : undefined;
  const reactionStartDisplay = event.reactionStartTime
    ? formatDateTime(event.reactionStartTime) || event.reactionStartTime
    : undefined;
  const firstReactionOnsetDisplay = firstReactionOnset
    ? formatDateTime(firstReactionOnset) || firstReactionOnset
    : undefined;
  const lastReactionOnsetDisplay = lastReactionOnset
    ? formatDateTime(lastReactionOnset) || lastReactionOnset
    : undefined;
  const reportTitle = 'Allergy Event Report';

  const handleExportPdf = () => {
    if (!event) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const marginX = 14;
      const marginY = 18;
      const usableWidth = 180;
      const lineHeight = 6;
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = marginY;

      const ensureSpace = (height = lineHeight) => {
        if (cursorY + height > pageHeight - marginY) {
          doc.addPage();
          cursorY = marginY;
        }
      };

      const addSection = (title) => {
        ensureSpace(lineHeight * 2);
        doc.setFontSize(13);
        doc.setTextColor(0, 94, 184);
        doc.text(title, marginX, cursorY);
        cursorY += 2;
        doc.setDrawColor(0, 94, 184);
        doc.setLineWidth(0.4);
        doc.line(marginX, cursorY, marginX + usableWidth, cursorY);
        cursorY += 6;
        doc.setFontSize(11);
        doc.setTextColor(33, 37, 41);
      };

      const appendField = (label, rawValue) => {
        const value = formatExportValue(rawValue);
        const lines = doc.splitTextToSize(`${label}: ${value}`, usableWidth);
        lines.forEach((line) => {
          ensureSpace(lineHeight);
          doc.text(line, marginX, cursorY);
          cursorY += lineHeight;
        });
        cursorY += 2;
      };

      doc.setFontSize(16);
      doc.setTextColor(0, 94, 184);
      doc.text(reportTitle, marginX, cursorY);
      cursorY += 10;

      doc.setFontSize(10);
      doc.setTextColor(117, 117, 117);
      doc.text(
        `Generated: ${formatDateTime(new Date().toISOString())}`,
        marginX,
        cursorY
      );
      cursorY += 8;
      doc.text(`Report ID: ${event.id || eventId}`, marginX, cursorY);
      cursorY += 10;
      doc.setFontSize(11);

      addSection('Basic Information');
      appendField('Patient Name', patient?.name);
      appendField('Gender', patient?.gender);
      appendField('Date of Birth', patient?.dob ? formatDate(patient.dob) : '-');
      appendField('Treating Doctor', treatingDoctor);
      appendField('Doctor Role', treatingDoctorRole);
      appendField('Date of Report', formatDate(event.date));
      appendField('URN', patient?.urn);
      appendField('Medicare ID', patient?.medicareId);

      addSection('Event Information');
      appendField('Specific Substance (Name of Food or Drug)', getSubstanceName(event));
      appendField('Severity of Reaction', severity);
      appendField('Time of Initial Exposure', initialExposureDisplay);
      appendField('Reaction Start Time', reactionStartDisplay);
      appendField('Reaction Onset Time', onsetDisplay);
      appendField('Manifestations', event.manifestations);
      appendField(
        'Clinical Management',
        event.clinicalManagement || extractField(event.notes, 'Clinical management')
      );

      addSection('Risk of Reaction Status');
      appendField('Substance Name', riskSubstanceName);
      appendField('Verification Status', event.verificationStatus);
      appendField('Criticality', event.criticality);
      appendField('Date/Time of First Reaction Onset', firstReactionOnsetDisplay);
      appendField('Date/Time of Last Reaction Onset', lastReactionOnsetDisplay);

      addSection('Investigation Details');
      appendField('Test Method', testMethod || extractField(event.notes, 'Test method'));
      appendField(
        'Test Results',
        event.testResults || extractField(event.notes, 'Test results')
      );
      appendField('Outcome', outcome || extractField(event.notes, 'Outcome'));
      appendField(
        'Patient Must Avoid Statement',
        patientAvoid || extractField(event.notes, 'Must avoid')
      );
      appendField('Comments', comments || extractField(event.notes, 'Comments'));
      appendField(
        'Adrenaline Autoinjector Prescribed',
        event.autoInjectorPrescribed !== undefined
          ? event.autoInjectorPrescribed
            ? 'Yes'
            : 'No'
          : extractField(event.notes, 'Auto-injector')
      );

      const safeId = (event.id || eventId || 'report').toString().replace(/\s+/g, '-').toLowerCase();
      doc.save(`${safeId}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout title="Allergy Report" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Generating…' : 'Generate Report'}
          </button>
          <Link
            to={-1}
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
            className="text-brand-blue font-semibold"
          >
            Back
          </Link>
        </div>

        <SectionCard title="Basic Information">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <InfoItem label="Patient Name" value={patient?.name} />
            <InfoItem label="Gender" value={patient?.gender} />
            <InfoItem label="Date of Birth" value={patient?.dob ? formatDate(patient.dob) : undefined} />
            <InfoItem label="Treating Doctor" value={treatingDoctor} />
            <InfoItem label="Doctor Role" value={treatingDoctorRole} />
            <InfoItem label="Date of Report" value={formatDate(event.date)} />
            <InfoItem label="URN" value={patient?.urn} />
            <InfoItem label="Medicare ID" value={patient?.medicareId} />
          </div>
        </SectionCard>

        <SectionCard title="Event Information">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem label="Specific Substance (Name of Food or Drug)" value={getSubstanceName(event)} />
            <InfoItem label="Severity of Reaction" value={severity} />
            <InfoItem label="Time of Initial Exposure" value={initialExposureDisplay} />
            <InfoItem label="Reaction Start Time" value={reactionStartDisplay} />
            <InfoItem label="Reaction Onset Time" value={onsetDisplay} />
            <InfoItem label="Manifestations" value={event.manifestations} span={2} />
            <InfoItem label="Clinical Management" value={event.clinicalManagement || extractField(event.notes, 'Clinical management')} span={2} />
          </div>
        </SectionCard>

        <SectionCard title="Risk of Reaction Status">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem label="Substance Name" value={riskSubstanceName} />
            <InfoItem label="Verification Status" value={event.verificationStatus} />
            <InfoItem label="Criticality" value={normalizeCriticality(event.criticality) || '—'} />
            <InfoItem label="Date/Time of First Reaction Onset" value={firstReactionOnsetDisplay} />
            <InfoItem label="Date/Time of Last Reaction Onset" value={lastReactionOnsetDisplay} />
          </div>
        </SectionCard>

        <SectionCard title="Investigation Details">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoItem label="Test Method" value={testMethod || extractField(event.notes, 'Test method')} />
            <InfoItem label="Test Results" value={event.testResults || extractField(event.notes, 'Test results')} span={2} />
            <InfoItem label="Outcome" value={outcome || extractField(event.notes, 'Outcome')} span={2} />
            <InfoItem
              label="Patient Must Avoid Statement"
              value={patientAvoid || extractField(event.notes, 'Must avoid')}
              span={2}
            />
            <InfoItem label="Comments" value={comments || extractField(event.notes, 'Comments')} span={2} />
            <InfoItem
              label="Adrenaline Autoinjector Prescribed?"
              value={event.autoInjectorPrescribed !== undefined ? (event.autoInjectorPrescribed ? 'Yes' : 'No') : extractField(event.notes, 'Auto-injector')}
            />
          </div>
        </SectionCard>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, span = 1 }) {
  const isList = Array.isArray(value);
  const hasValue = isList
    ? value.length > 0
    : value !== undefined && value !== null && value !== '';

  let content;
  if (isList) {
    content = hasValue ? (
      <ol className="list-decimal list-inside space-y-1 text-slate-700">
        {value.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ol>
    ) : (
      <span className="text-slate-700">—</span>
    );
  } else if (isValidElement(value)) {
    content = value;
  } else {
    content = <span className="text-slate-700">{hasValue ? value : '—'}</span>;
  }

  return (
    <div className={`flex flex-col gap-1 ${span === 2 ? 'col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
      {content}
    </div>
  );
}

function getSubstanceName(event) {
  if (!event) return '';
  return event.substanceName || event.substance || 'Amoxicillin';
}

function extractField(notes, prefix) {
  if (!notes || typeof notes !== 'string') return undefined;
  const regex = new RegExp(`${prefix}:\\s*([^;]+)`, 'i');
  const match = notes.match(regex);
  return match ? match[1].trim() : undefined;
}

function formatExportValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => (isValidElement(item) ? '' : String(item)))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (isValidElement(value)) {
    return '-';
  }
  return String(value);
}
