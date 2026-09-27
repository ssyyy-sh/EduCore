import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_ACCOUNTS, MIN_PASSWORD } from '../config.js';
import { readJSON, writeJSON, removeKey } from '../lib/storage.js';

/*
 * Client-side accounts for the demo. Each account has its own email, password
 * and role; the role decides which dashboard and pages the account can open.
 * NOTE: in production, authentication must happen on a server — anything kept
 * in the browser can be read by the person using that browser.
 */

const ACCOUNTS_KEY = 'educore.accounts.v1';
const SESSION_KEY = 'educore.session.v1';

// cyrb53 — small non-cryptographic hash, enough to avoid storing plain passwords in the demo.
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const hashPassword = (email, password) => cyrb53(`${email.toLowerCase()}::${password}`, 7);
const normEmail = (e) => String(e || '').trim().toLowerCase();

function loadAccounts() {
  const stored = readJSON(ACCOUNTS_KEY, []);
  const list = Array.isArray(stored) ? stored.filter((a) => a && a.id && a.email && a.role && a.passHash) : [];
  // Make sure every demo account exists (its password can still be changed by the user).
  for (const d of DEMO_ACCOUNTS) {
    if (!list.some((a) => a.id === d.id)) {
      list.push({ id: d.id, role: d.role, name: d.name, email: d.email, passHash: hashPassword(d.email, d.password), demo: true });
    }
  }
  return list;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(loadAccounts);
  const [sessionId, setSessionId] = useState(() => readJSON(SESSION_KEY, null));

  const persist = useCallback((next) => {
    setAccounts(next);
    writeJSON(ACCOUNTS_KEY, next);
  }, []);

  const account = accounts.find((a) => a.id === sessionId) || null;

  const login = useCallback(
    (email, password) => {
      const e = normEmail(email);
      const acc = accounts.find((a) => a.email.toLowerCase() === e);
      if (!acc || acc.passHash !== hashPassword(e, password)) return { ok: false, error: 'invalid' };
      setSessionId(acc.id);
      writeJSON(SESSION_KEY, acc.id);
      return { ok: true, role: acc.role };
    },
    [accounts]
  );

  const register = useCallback(
    ({ name, email, password, role, org }) => {
      const e = normEmail(email);
      if (accounts.some((a) => a.email.toLowerCase() === e)) return { ok: false, error: 'exists' };
      if (String(password).length < MIN_PASSWORD) return { ok: false, error: 'weak' };
      const acc = {
        id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        name: String(name).trim(),
        email: e,
        org: org ? String(org).trim() : undefined,
        passHash: hashPassword(e, password),
        createdAt: new Date().toISOString(),
      };
      persist([...accounts, acc]);
      setSessionId(acc.id);
      writeJSON(SESSION_KEY, acc.id);
      return { ok: true, role };
    },
    [accounts, persist]
  );

  /** Admin creates an account for someone else (the session stays the same). */
  const createAccount = useCallback(
    ({ name, email, password, role }) => {
      const e = normEmail(email);
      if (accounts.some((a) => a.email.toLowerCase() === e)) return { ok: false, error: 'exists' };
      const acc = { id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, role, name: String(name).trim(), email: e, passHash: hashPassword(e, password), createdAt: new Date().toISOString() };
      persist([...accounts, acc]);
      return { ok: true, id: acc.id };
    },
    [accounts, persist]
  );

  const logout = useCallback(() => {
    setSessionId(null);
    removeKey(SESSION_KEY);
  }, []);

  const updateProfile = useCallback(
    (patch) => {
      if (!account) return;
      persist(accounts.map((a) => (a.id === account.id ? { ...a, name: String(patch.name ?? a.name).trim() } : a)));
    },
    [account, accounts, persist]
  );

  const changePassword = useCallback(
    (current, next) => {
      if (!account) return { ok: false, error: 'wrong' };
      if (account.passHash !== hashPassword(account.email, current)) return { ok: false, error: 'wrong' };
      if (String(next).length < MIN_PASSWORD) return { ok: false, error: 'weak' };
      persist(accounts.map((a) => (a.id === account.id ? { ...a, passHash: hashPassword(a.email, next) } : a)));
      return { ok: true };
    },
    [account, accounts, persist]
  );

  const user = useMemo(() => {
    if (!account) return null;
    const { passHash: _hash, ...safe } = account; // never expose the hash to components
    return { ...safe, firstName: safe.name.split(/\s+/)[0] };
  }, [account]);

  const value = useMemo(() => ({ user, login, register, createAccount, logout, updateProfile, changePassword }), [user, login, register, createAccount, logout, updateProfile, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
