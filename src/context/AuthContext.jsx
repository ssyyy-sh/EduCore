import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './authCore.js';
import { REMOTE } from '../lib/supabase.js';
import { RemoteAuthProvider } from './RemoteAuth.jsx';

export { useAuth } from './authCore.js';
import { DEMO_ACCOUNTS, MIN_PASSWORD, OWNER_ACCOUNT } from '../config.js';
import { hashPassword } from '../lib/hash.js';
import { readJSON, writeJSON, removeKey } from '../lib/storage.js';

/*
 * Client-side accounts for the demo. Each account has its own email, password
 * and role; the role decides which dashboard and pages the account can open.
 * NOTE: in production, authentication must happen on a server — anything kept
 * in the browser can be read by the person using that browser.
 */

const ACCOUNTS_KEY = 'educore.accounts.v1';
const SESSION_KEY = 'educore.session.v1';

const normEmail = (e) => String(e || '').trim().toLowerCase();

function loadAccounts() {
  const stored = readJSON(ACCOUNTS_KEY, []);
  // Only the configured Owner account may have the owner role.
  const list = Array.isArray(stored)
    ? stored.filter((a) => a && a.id && a.email && a.role && a.passHash).map((a) => (a.role === 'owner' && a.id !== OWNER_ACCOUNT.id ? { ...a, role: 'student' } : a))
    : [];
  // Make sure every demo account exists (its password can still be changed by the user).
  for (const d of DEMO_ACCOUNTS) {
    if (!list.some((a) => a.id === d.id)) {
      list.push({ id: d.id, role: d.role, name: d.name, email: d.email, passHash: hashPassword(d.email, d.password), demo: true });
    }
  }
  // Hidden Owner account: email and password always come from src/config.js.
  const owner = { id: OWNER_ACCOUNT.id, role: 'owner', name: OWNER_ACCOUNT.name, email: normEmail(OWNER_ACCOUNT.email), passHash: OWNER_ACCOUNT.passHash, hidden: true };
  const oi = list.findIndex((a) => a.id === owner.id);
  if (oi >= 0) list[oi] = { ...list[oi], email: owner.email, passHash: owner.passHash, role: 'owner', hidden: true };
  else list.push(owner);
  return list;
}

const newId = () => `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const ROLES = ['student', 'parent', 'teacher', 'school'];

function LocalAuthProvider({ children }) {
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
        id: newId(),
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
      const acc = { id: newId(), role, name: String(name).trim(), email: e, passHash: hashPassword(e, password), createdAt: new Date().toISOString() };
      persist([...accounts, acc]);
      return { ok: true, id: acc.id };
    },
    [accounts, persist]
  );

  // ----- Owner only -----
  const isOwner = account?.role === 'owner';
  const allAccounts = useMemo(() => (isOwner ? accounts.map(({ passHash: _h, ...a }) => a) : []), [isOwner, accounts]);
  const setAccountRole = useCallback(
    (id, role) => {
      if (!isOwner || !ROLES.includes(role)) return false;
      persist(accounts.map((a) => (a.id === id && a.role !== 'owner' && !a.demo ? { ...a, role } : a)));
      return true;
    },
    [isOwner, accounts, persist]
  );
  const resetPassword = useCallback(
    (id, password) => {
      if (!isOwner) return false;
      persist(accounts.map((a) => (a.id === id && a.role !== 'owner' ? { ...a, passHash: hashPassword(a.email, password) } : a)));
      return true;
    },
    [isOwner, accounts, persist]
  );
  const deleteAccount = useCallback(
    (id) => {
      if (!isOwner) return false;
      persist(accounts.filter((a) => !(a.id === id && a.role !== 'owner' && !a.demo)));
      return true;
    },
    [isOwner, accounts, persist]
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
      if (!account || account.role === 'owner') return { ok: false, error: 'wrong' };
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

  // Everyone who can be messaged in the demo (name and role only).
  const directory = useMemo(() => (account ? accounts.filter((a) => !a.hidden).map((a) => ({ id: a.id, name: a.name, role: a.role, email: a.email })) : []), [account, accounts]);

  const value = useMemo(
    () => ({ status: 'ready', remote: false, directory, user, login, register, createAccount, logout, updateProfile, changePassword, allAccounts, setAccountRole, resetPassword, deleteAccount }),
    [directory, user, login, register, createAccount, logout, updateProfile, changePassword, allAccounts, setAccountRole, resetPassword, deleteAccount]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Server accounts when Supabase is configured, browser-only demo accounts otherwise. */
export const AuthProvider = REMOTE ? RemoteAuthProvider : LocalAuthProvider;
