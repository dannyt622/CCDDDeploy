const sidebarSections = [
  { label: 'Snapshot' },
  { label: 'Chart Review' },
  { label: 'Demographics' },
  { label: 'Diagnostic Results Review' },
  { label: 'Devices and Equipment' },
  { label: 'Flowsheets' },
  { label: 'Graphs' },
  { label: 'Growth Chart' },
  { label: 'Synopsis' },
  { label: 'Problem List' },
  { label: 'Medications' },
  { label: 'Letters' },
  {
    label: 'Allergies & Adverse Reactions',
    active: true
  },
  { label: 'Vaccinations' },
  { label: 'Injections' },
  { label: 'Enter/Edit Results' },
  { label: 'Online Lab Release' },
  { label: 'Plan of care' }
];

export default function Sidebar({ surfaceClass = 'bg-sidebar-bg border-slate-200' }) {
  const accent = 'border-l-4 border-brand-blue text-brand-blue';

  return (
    <aside
      className={`w-full lg:w-64 shrink-0 border-r ${surfaceClass} backdrop-blur-sm lg:min-h-[calc(100vh-4rem)]`}
      aria-label="Primary patient navigation"
    >
      <nav className="py-6">
        <ul className="space-y-1">
          {sidebarSections.map((item) => (
            <li key={item.label}>
              <span
                className={`block px-6 py-3 text-sm font-medium text-sidebar-text/90 transition rounded-r-3xl ${
                  item.active
                    ? `bg-white/90 shadow-md ${accent}`
                    : 'hover:bg-white/70 hover:text-brand-blue'
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
