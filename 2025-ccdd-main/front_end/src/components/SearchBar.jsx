import { Search } from 'lucide-react';
import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState({ urn: '', name: '', medicareId: '' });

  const handleChange = (key, value) => {
    setQuery((prev) => ({ ...prev, [key]: value }));
  };

  const triggerSearch = () => {
    const hasCriteria = Object.values(query).some((value) => value.trim() !== '');
    if (!hasCriteria) {
      onSearch?.(null);
      return;
    }
    onSearch?.(query);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    triggerSearch();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/90 border border-slate-200 rounded-lg p-4 shadow-sm"
    >
      {[
        { key: 'urn', label: 'URN' },
        { key: 'name', label: 'Name' },
        { key: 'medicareId', label: 'Medicare ID' }
      ].map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
            <input
              type="text"
              value={query[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              placeholder={`Search by ${label}`}
            />
            {['urn', 'medicareId'].includes(key) ? (
              <button
                type="button"
                onClick={triggerSearch}
                className="px-2 h-full text-slate-500 hover:text-brand-blue"
              >
                <Search className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
      <div className="md:col-span-3 flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-brand-blue text-white text-sm font-semibold rounded-md shadow hover:shadow-md"
        >
          Search
        </button>
      </div>
    </form>
  );
}
