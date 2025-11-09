import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { getRoleLabel } from '../constants/roles.js';

const topBarTheme = {
  border: 'border-brand-blue/20',
  background: 'bg-role-recorder/60'
};

export default function TopBar({ title, breadcrumbs = [] }) {
  const { user, selectedRole, logout } = useAppContext();
  const navigate = useNavigate();
  const roleLabel = getRoleLabel(user?.role || selectedRole);
  const displayName = user?.name || user?.email || 'Medical Staff';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const breadcrumbTrail = breadcrumbs.length
    ? breadcrumbs
    : title
      ? [{ label: title }]
      : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (!menuRef.current) return;
      if (!menuOpen) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header
      className={`relative z-40 h-16 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-8 ${topBarTheme.background} backdrop-blur border-b ${topBarTheme.border}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <div className="text-lg font-semibold text-brand-blue">ABC Medical Company</div>
        <nav className="text-sm text-slate-500">
          <ol className="flex items-center gap-2 flex-wrap">
            {breadcrumbTrail.map((crumb, index) => {
              const isLast = index === breadcrumbTrail.length - 1;
              const label = crumb.label;
              const to = crumb.to;
              const linkClasses = isLast
                ? 'font-semibold text-brand-blue'
                : 'hover:text-brand-blue transition-colors';
              const content = to ? (
                <Link to={to} className={linkClasses}>
                  {label}
                </Link>
              ) : (
                <span className={isLast ? 'font-semibold text-brand-blue' : undefined}>{label}</span>
              );
              return (
                <li key={`${label}-${index}`} className="flex items-center gap-2">
                  {content}
                  {!isLast && <span aria-hidden="true" className="text-slate-400">›</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      {user && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/70 px-3 py-2 rounded-md hover:bg-white/50"
          >
            <div className="flex items-center gap-2 truncate max-w-[240px] sm:max-w-xs">
              <span className="text-sm font-semibold text-brand-blue truncate">
                {displayName}
              </span>
              <span className="text-xs tracking-wide text-slate-500 whitespace-nowrap">
                |  {roleLabel}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
