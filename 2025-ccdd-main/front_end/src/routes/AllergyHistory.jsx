import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import DataTable from '../components/DataTable.jsx';
import RiskDot from '../components/RiskDot.jsx';
import ExclaimIcon from '../components/ExclaimIcon.jsx';
import { fetchEvents, fetchPatientById, fetchSubstances } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';
import { normalizeCriticality } from '../utils/criticality.js';
import { useAppContext } from '../context/AppContext.jsx';

const verificationOptions = ['Unconfirmed', 'Confirmed', 'Delabeled'];
const criticalityOptions = ['Low Risk', 'High Risk', 'Delabeled'];

export default function AllergyHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { expandedSubstance, setExpandedSubstance } = useAppContext();
  const [patient, setPatient] = useState(null);
  const [substances, setSubstances] = useState([]);
  const [substanceSort, setSubstanceSort] = useState(null);
  const [substanceFilters, setSubstanceFilters] = useState({
    verificationStatus: undefined,
    criticality: undefined
  });
  const [eventSort, setEventSort] = useState(null);
  const [eventFilters, setEventFilters] = useState({
    treatingDoctor: undefined,
    doctorRole: undefined
  });
  const [events, setEvents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const breadcrumbs = useMemo(
    () => [
      { label: 'patient search', to: '/patients' },
      { label: 'Allergy History', to: `/patients/${patientId}/allergies` }
    ],
    [patientId]
  );

  useEffect(() => {
    fetchPatientById(patientId).then(setPatient);
  }, [patientId]);

  const loadSubstances = useCallback(async () => {
    const list = await fetchSubstances(patientId, { filters: substanceFilters, sort: substanceSort });
    setSubstances(list);
  }, [patientId, substanceFilters, substanceSort]);

  useEffect(() => {
    loadSubstances();
  }, [loadSubstances]);

  const loadEvents = useCallback(async () => {
    if (!expandedSubstance) {
      setEvents([]);
      return;
    }
    const list = await fetchEvents(expandedSubstance, { filters: eventFilters, sort: eventSort });
    setEvents(list);
  }, [expandedSubstance, eventFilters, eventSort]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSubstances();
      await loadEvents();
    } catch (error) {
      console.error('Failed to refresh allergy data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSubstances, loadEvents]);

  const patientBanner = patient ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-white/95 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow text-sm">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase">URN</h3>
        <p className="text-slate-700 font-medium">{patient.urn}</p>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase">Medicare ID</h3>
        <p className="text-slate-700 font-medium">{patient.medicareId}</p>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase">Patient Name</h3>
        <p className="text-slate-700 font-medium">{patient.name}</p>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase">Gender</h3>
        <p className="text-slate-700 font-medium">{patient.gender}</p>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase">Date of Birth</h3>
        <p className="text-slate-700 font-medium">{formatDate(patient.dob)}</p>
      </div>
    </div>
  ) : null;

  const substanceColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Specific Substance',
        sortable: true,
        align: 'left',
        render: (value, row) => (
          <div className="flex items-center gap-2 justify-start">
            <span className="font-semibold text-slate-700">{value}</span>
            {normalizeCriticality(row.criticality) === 'High Risk' && <ExclaimIcon />}
          </div>
        )
      },
      {
        key: 'eventsCount',
        label: '# Event',
        sortable: true,
        align: 'center',
        render: (value, row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpandedSubstance(row.id === expandedSubstance ? null : row.id);
            }}
            className={`text-brand-blue font-semibold underline underline-offset-4 ${
              row.id === expandedSubstance ? 'text-brand-blue' : 'text-brand-blue/80'
            }`}
          >
            {value}
          </button>
        )
      },
      {
        key: 'verificationStatus',
        label: 'Verification Status',
        sortable: false,
        align: 'center',
        filterOptions: verificationOptions
      },
      {
        key: 'criticality',
        label: 'Criticality',
        sortable: false,
        align: 'center',
        filterOptions: criticalityOptions,
        render: (value) => (
          <div className="flex items-center gap-2 justify-center">
            <RiskDot level={value} />
            <span className="font-medium text-slate-700">{normalizeCriticality(value) || '—'}</span>
          </div>
        )
      },
      {
        key: 'lastReportDate',
        label: 'Last Date of Report',
        sortable: true,
        align: 'center',
        render: (value) => formatDate(value)
      }
    ],
    [expandedSubstance, setExpandedSubstance]
  );

  const normalizedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        treatingDoctor: event.treatingDoctor || event.clinicianName,
        doctorRole: event.doctorRole || event.clinicianRole
      })),
    [events]
  );

  const clinicianOptions = useMemo(() => {
    const names = Array.from(new Set(normalizedEvents.map((event) => event.treatingDoctor).filter(Boolean)));
    const roles = Array.from(new Set(normalizedEvents.map((event) => event.doctorRole).filter(Boolean)));
    return { names, roles };
  }, [normalizedEvents]);

  const eventColumns = useMemo(
    () => [
      {
        key: 'seq',
        label: 'Events',
        sortable: true,
        align: 'left',
        render: (value, row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/events/${row.id}`);
            }}
            className="text-brand-blue font-semibold underline underline-offset-4"
          >
            #{value}
          </button>
        )
      },
      {
        key: 'date',
        label: 'Date',
        sortable: true,
        align: 'center',
        render: (value) => formatDate(value)
      },
      {
        key: 'notes',
        label: 'Notes',
        sortable: false,
        align: 'left',
        render: (_, row) => {
          const manifestations = Array.isArray(row.manifestations)
            ? row.manifestations.filter(Boolean).join(', ')
            : '';
          const mustAvoid = row.patientMustAvoid;
          const parts = [
            manifestations ? `Manifestations: ${manifestations}` : null,
            mustAvoid ? `Must avoid: ${mustAvoid}` : null
          ].filter(Boolean);
          const text = parts.length ? parts.join(' | ') : '—';
          return <p className="max-w-xl text-left text-slate-600">{text}</p>;
        }
      },
      {
        key: 'treatingDoctor',
        label: 'Treating Doctor',
        sortable: false,
        align: 'center',
        filterOptions: clinicianOptions.names
      },
      {
        key: 'doctorRole',
        label: 'Doctor Role',
        sortable: false,
        align: 'center',
        filterOptions: clinicianOptions.roles
      }
    ],
    [clinicianOptions, navigate]
  );

  return (
    <Layout title="Allergy History" breadcrumbs={breadcrumbs}>
      <div className="space-y-6 relative pb-24">
        {patientBanner}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-700">Allergies &amp; Adverse Reactions</h2>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh allergies and adverse reactions"
              title="Refresh"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-blue/40 text-brand-blue hover:bg-brand-blue/10 hover:text-brand-blue transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4v5h.01M20 20l-.01-5M4.93 9.07a7 7 0 0 1 11.32-2.54L20 9M19.07 14.93a7 7 0 0 1-11.32 2.54L4 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span className="sr-only">Refresh allergies and adverse reactions</span>
            </button>
          </div>
          <Link
            to={`/patients/${patientId}/new-event`}
            className="self-end sm:self-auto inline-flex items-center gap-2 rounded-full bg-brand-blue text-white text-sm font-semibold px-5 py-2 shadow-lg hover:bg-brand-blue/90 transition"
            state={{ substanceId: expandedSubstance }}
            aria-label="Create new allergy report"
          >
            <span className="text-base leading-none">+</span>
            <span className="tracking-wide uppercase text-xs">New Report</span>
          </Link>
        </div>
        <DataTable
          columns={substanceColumns}
          data={substances}
          sortState={substanceSort}
          onSortChange={setSubstanceSort}
          filters={substanceFilters}
          onFilterChange={(next) => setSubstanceFilters((prev) => ({ ...prev, ...next }))}
          emptyMessage="No substances recorded for this patient."
        />
        {expandedSubstance && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const active = substances.find((item) => item.id === expandedSubstance);
                if (!active) return null;
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-700 inline-flex items-center gap-2">
                        <span>{active.name}</span>
                      </h3>
                      {normalizeCriticality(active.criticality) === 'High Risk' && <ExclaimIcon />}
                    </div>
                  </div>
                );
              })()}
            </div>
            <DataTable
              columns={eventColumns}
              data={normalizedEvents}
              sortState={eventSort}
              onSortChange={setEventSort}
              filters={eventFilters}
              onFilterChange={(next) => setEventFilters((prev) => ({ ...prev, ...next }))}
              emptyMessage="No events recorded for this substance."
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
