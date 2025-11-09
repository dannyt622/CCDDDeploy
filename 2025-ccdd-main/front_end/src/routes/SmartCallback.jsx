import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartReady } from '../services/fhirClientSmart.js';
import { useAppContext } from '../context/AppContext.jsx';
import {
  extractProfileEmail,
  extractProfileName,
  isMissingSmartState,
  LOGIN_MODE_SMART,
  setStoredLoginMode
} from '../utils/smartAuth.js';

export default function SmartCallback() {
  const navigate = useNavigate();
  const { login, selectedRole } = useAppContext();

  useEffect(() => {
    let cancelled = false;

    async function completeSmartLogin() {
      try {
        const client = await smartReady();
        if (!client || cancelled) return;

        const profile = await client.user?.read?.().catch(() => null);
        const idToken = typeof client.getIdToken === 'function' ? client.getIdToken() : null;
        if (cancelled) return;

        const name =
          extractProfileName(profile) ||
          extractProfileName(idToken?.profile) ||
          'SMART Practitioner';
        const email =
          extractProfileEmail(profile) ||
          extractProfileEmail(idToken?.profile) ||
          '';

        login({
          name,
          email,
          role: selectedRole
        });

        setStoredLoginMode(LOGIN_MODE_SMART);
        navigate('/patients', { replace: true });
      } catch (error) {
        if (cancelled) return;
        if (isMissingSmartState(error)) {
          navigate('/', { replace: true });
          return;
        }
        console.error('SMART callback error:', error);
        navigate('/', { replace: true });
      }
    }

    completeSmartLogin();

    return () => {
      cancelled = true;
    };
  }, [login, navigate, selectedRole]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-700">Finishing SMART sign-in…</h2>
        <p className="text-sm text-slate-500 mt-2">Please wait while we complete the authorization.</p>
      </div>
    </div>
  );
}
