import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RolePicker from '../components/RolePicker.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { launchSmart, smartReady } from '../services/fhirClientSmart.js';
import {
  extractProfileEmail,
  extractProfileName,
  getStoredLoginMode,
  hasSmartSession,
  isMissingSmartState,
  LOGIN_MODE_MOCK,
  LOGIN_MODE_SMART,
  setStoredLoginMode
} from '../utils/smartAuth.js';

export default function Login() {
  const navigate = useNavigate();
  const { login, selectedRole, setSelectedRole, isAuthenticated } = useAppContext();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const smartDefault = import.meta.env?.VITE_SMART_LOGIN_ENABLED === 'true';
  const storedMode = getStoredLoginMode();
  const [useSmartLogin, setUseSmartLogin] = useState(
    () => (storedMode ? storedMode === LOGIN_MODE_SMART : smartDefault)
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/patients', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!hasSmartSession()) return;
    const currentMode = getStoredLoginMode();
    if (currentMode && currentMode !== LOGIN_MODE_SMART) return;

    let cancelled = false;

    async function resumeSmartSession() {
      try {
        const client = await smartReady();
        if (!client || cancelled) return;
        const profile = await client.user?.read?.().catch(() => null);
        const idToken = typeof client.getIdToken === 'function' ? client.getIdToken() : null;
        if (cancelled) return;
        const nameFromProfile =
          extractProfileName(profile) ||
          extractProfileName(idToken?.profile) ||
          'SMART Practitioner';
        const emailFromProfile =
          extractProfileEmail(profile) ||
          extractProfileEmail(idToken?.profile) ||
          '';
        login({
          name: nameFromProfile,
          email: emailFromProfile,
          role: selectedRole
        });
        setStoredLoginMode(LOGIN_MODE_SMART);
        navigate('/patients', { replace: true });
      } catch (error) {
        if (isMissingSmartState(error)) {
          return;
        }
        console.error('SMART auto-login failed:', error);
      }
    }

    resumeSmartSession();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, login, navigate, selectedRole]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (useSmartLogin) {
      // SMART on FHIR login (Authorization Code + PKCE via fhirclient)
      setStoredLoginMode(LOGIN_MODE_SMART);
      await launchSmart();
      return;
    }

    // Mock login (original behaviour)
    if (!form.name.trim()) {
      setErrors((prev) => ({ ...prev, name: 'Full name is required' }));
      return;
    }
    login({
      name: form.name.trim(),
      email: form.email || 'dr.janet@abcmedical.com',
      role: selectedRole
    });
    setStoredLoginMode(LOGIN_MODE_MOCK);
    navigate('/patients');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light to-white">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-blue">ABC Medical Company</h1>
          <p className="text-sm text-slate-500 mt-2">Access allergy history with your medical account.</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sign-in Mode</span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="loginMode"
                value="mock"
                checked={!useSmartLogin}
                onChange={() => {
                  setUseSmartLogin(false);
                  setStoredLoginMode(LOGIN_MODE_MOCK);
                }}
              />
              Mock (No OAuth)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="radio"
                name="loginMode"
                value="smart"
                checked={useSmartLogin}
                onChange={() => {
                  setUseSmartLogin(true);
                  setStoredLoginMode(LOGIN_MODE_SMART);
                }}
              />
              SMART on FHIR
            </label>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                const { value } = e.target;
                setForm((prev) => ({ ...prev, name: value }));
                if (errors.name && value.trim()) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="Dr Janet Baker"
              required={!useSmartLogin}
            />
            {errors.name && <p className="text-xs text-risk-high mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="name@abcmedical.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="••••••••"
              disabled={useSmartLogin}
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Choose Role</span>
            <RolePicker value={selectedRole} onChange={setSelectedRole} />
          </div>
          <p className="text-xs text-slate-500">
            {useSmartLogin
              ? 'SMART mode: You will be redirected to the SMART authorization page. Local name/email are ignored.'
              : 'Mock mode: Your name/email are used locally for demonstration only.'}
          </p>
          <button
            type="submit"
            className="w-full py-3 bg-brand-blue text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
          >
            {useSmartLogin ? 'Log in with SMART' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
