import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SearchBar from '../components/SearchBar.jsx';
import DataTable from '../components/DataTable.jsx';
import { fetchPatients } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';

export default function PatientSearch() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ urn: '', name: '', medicareId: '' });
  const [sortState, setSortState] = useState(null);
  const [filters, setFilters] = useState({ gender: undefined });
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const loadPatients = useCallback(async () => {
    if (!hasSearched) return;
    setLoading(true);
    const results = await fetchPatients({ ...searchParams, gender: filters.gender, sort: sortState });
    setPatients(results);
    setLoading(false);
  }, [hasSearched, searchParams, filters.gender, sortState]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleSearch = (query) => {
    if (!query) {
      setHasSearched(false);
      setPatients([]);
      setSearchError('Enter at least one search field to display patients.');
      return;
    }
    setSearchError('');
    setHasSearched(true);
    setSearchParams(query);
  };

  const columns = [
    { key: 'urn', label: 'URN', sortable: true, align: 'left' },
    { key: 'name', label: 'Name', sortable: false, align: 'left' },
    { key: 'medicareId', label: 'Medicare ID', sortable: true, align: 'center' },
    {
      key: 'gender',
      label: 'Gender',
      sortable: false,
      align: 'center',
      filterOptions: ['Male', 'Female']
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      sortable: true,
      align: 'center',
      render: (value) => formatDate(value)
    }
  ];

  return (
    <Layout title="Patient Lookup" breadcrumbs={[{ label: 'patient search', to: '/patients' }]}> 
      <div className="space-y-6">
        <SearchBar onSearch={handleSearch} />
        {searchError && (
          <div className="bg-white/90 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-lg shadow-sm">
            {searchError}
          </div>
        )}
        {hasSearched ? (
          patients.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-700">Patients</h2>
                {loading && <span className="text-xs uppercase text-slate-400">Loading…</span>}
              </div>
              <DataTable
                columns={columns}
                data={patients}
                sortState={sortState}
                onSortChange={setSortState}
                filters={filters}
                onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
                onRowClick={(row) => navigate(`/patients/${row.id}/allergies`)}
                emptyMessage="No patients match the search criteria."
              />
            </>
          ) : loading ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500 bg-white/90">
              Searching for patients…
            </div>
          ) : (
            <div className="border border-dashed border-brand-blue/40 bg-role-recorder/40 rounded-2xl p-8 text-center space-y-4">
              <p className="text-sm text-slate-600">
                No patient records matched your search. Start a new allergy report with the details you entered.
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate('/patients/new/new-event', {
                    state: {
                      prefillPatient: {
                        urn: searchParams.urn,
                        name: searchParams.name,
                        medicareId: searchParams.medicareId
                      }
                    }
                  })
                }
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-blue text-white text-sm font-semibold shadow-md hover:shadow-lg"
              >
                Start new patient report
              </button>
            </div>
          )
        ) : (
          <div className="bg-white/90 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
            Search by URN, name, or Medicare ID to display matching patients.
          </div>
        )}
      </div>
    </Layout>
  );
}
