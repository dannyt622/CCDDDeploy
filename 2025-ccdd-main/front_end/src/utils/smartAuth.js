const LOGIN_MODE_KEY = 'LOGIN_MODE';
export const LOGIN_MODE_SMART = 'smart';
export const LOGIN_MODE_MOCK = 'mock';
const SMART_SESSION_KEY = 'SMART_KEY';

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getStoredLoginMode() {
  const storage = getSessionStorage();
  if (!storage) return null;
  return storage.getItem(LOGIN_MODE_KEY);
}

export function setStoredLoginMode(mode) {
  const storage = getSessionStorage();
  if (!storage) return;
  if (!mode) {
    storage.removeItem(LOGIN_MODE_KEY);
    return;
  }
  storage.setItem(LOGIN_MODE_KEY, mode);
}

export function hasSmartSession() {
  const storage = getSessionStorage();
  if (!storage) return false;
  return Boolean(storage.getItem(SMART_SESSION_KEY));
}

export function clearSmartSession() {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const pointer = storage.getItem(SMART_SESSION_KEY);
    if (pointer) {
      storage.removeItem(pointer);
    }
    storage.removeItem(SMART_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function isMissingSmartState(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  return /no (?:'state' parameter|state) found/i.test(message);
}

export function extractProfileName(profile) {
  const name = profile?.name?.[0];
  if (!name) return '';
  if (typeof name.text === 'string' && name.text.trim()) {
    return name.text.trim();
  }
  const parts = [];
  if (Array.isArray(name.prefix)) {
    parts.push(name.prefix.filter(Boolean).join(' '));
  }
  if (Array.isArray(name.given)) {
    parts.push(name.given.filter(Boolean).join(' '));
  }
  if (name.family) {
    parts.push(name.family);
  }
  return parts
    .filter((segment) => typeof segment === 'string' && segment.trim())
    .join(' ')
    .trim();
}

export function extractProfileEmail(profile) {
  if (!Array.isArray(profile?.telecom)) return '';
  const emailEntry = profile.telecom.find(
    (item) => item?.system === 'email' && typeof item.value === 'string'
  );
  return emailEntry?.value?.trim() || '';
}
