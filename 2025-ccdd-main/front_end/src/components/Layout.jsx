import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';

const theme = {
  gradient: 'from-role-recorder via-white to-white',
  canvas: 'bg-role-recorder/30',
  sidebar: 'bg-role-recorder/50 border-brand-blue/30',
  main: 'bg-white/90 border border-brand-blue/30 backdrop-blur-sm',
  shadow: 'shadow-[0_10px_50px_rgba(0,94,184,0.12)]'
};

export default function Layout({ title, breadcrumbs = [], children }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} text-slate-800 flex flex-col`}>
      <TopBar title={title} breadcrumbs={breadcrumbs} />
      <div className={`flex-1 flex flex-col lg:flex-row ${theme.canvas}`}>
        <Sidebar surfaceClass={theme.sidebar} />
        <main
          className={`flex-1 px-4 py-6 sm:px-6 lg:px-10 ${theme.main} ${theme.shadow} min-h-[calc(100vh-4rem)]`}
        >
          <div className="max-w-6xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
