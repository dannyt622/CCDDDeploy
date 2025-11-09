import { createContext, useContext, useMemo, useState } from 'react';
import { DEFAULT_ROLE } from '../constants/roles.js';
import { clearSmartSession } from '../utils/smartAuth.js';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(DEFAULT_ROLE);
  const [expandedSubstance, setExpandedSubstance] = useState(null);

  const login = ({ email, name, role }) => {
    const resolvedRole = role || DEFAULT_ROLE;
    setSelectedRole(resolvedRole);
    setUser({
      email,
      name,
      role: resolvedRole
    });
  };

  const logout = () => {
    setUser(null);
    setSelectedRole(DEFAULT_ROLE);
    setExpandedSubstance(null);
    clearSmartSession();
  };

  const value = useMemo(
    () => ({
      user,
      selectedRole,
      setSelectedRole,
      login,
      logout,
      isAuthenticated: Boolean(user),
      expandedSubstance,
      setExpandedSubstance
    }),
    [user, selectedRole, expandedSubstance]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}
