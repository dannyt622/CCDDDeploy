export default function SectionCard({ title, children, actions }) {
  const theme = {
    border: 'border-brand-blue/30',
    header: 'border-brand-blue/20',
    title: 'text-brand-blue'
  };

  return (
    <section className={`bg-white/95 border rounded-2xl shadow-sm ${theme.border}`}>
      <header
        className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b ${theme.header}`}
      >
        <h3 className={`text-base font-semibold ${theme.title}`}>{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="px-6 py-4 space-y-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}
