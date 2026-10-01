import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './authCore.js';
import { supabase, siteUrl } from '../lib/supabase.js';
import { MIN_PASSWORD } from '../config.js';

/*
 * Accounts on the server (Supabase Auth). The role lives in the `profiles` table and can only be
 * changed by the owner — the database enforces it (see supabase/setup.sql).
 */

const ROLES = ['student', 'parent', 'teacher', 'school', 'pending'];
const normEmail = (e) => String(e || '').trim().toLowerCase();

/** Turn a Supabase Auth error into a short reason the UI can explain. */
export function authReason(error) {
  const m = `${error?.code || ''} ${error?.message || ''}`;
  if (error?.status === 429 || /rate.?limit|over_email_send_rate|too many/i.test(m)) return 'rate';
  if (/failed to fetch|networkerror|load failed|network/i.test(m) || error?.status === 0) return 'network';
  if (/database error/i.test(m)) return 'server';
  return 'other';
}

async function fetchProfile(uid) {
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw error;
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500)); // the profile is created by a trigger right after sign-up
  }
  return null;
}

export function RemoteAuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const profileFor = useRef(null);
  const busy = useRef(false); // login/register in progress: they load the profile themselves
  const [notice, setNotice] = useState('');

  // ----- session -----
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!data.session) setStatus('ready');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Keep this callback synchronous (Supabase recommendation); data is loaded in effects.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
      if (!s) {
        profileFor.current = null;
        setProfile(null);
        setStatus('ready');
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const uid = session?.user?.id || null;
  useEffect(() => {
    if (!uid || profileFor.current === uid || busy.current) return;
    let alive = true;
    setStatus('loading');
    fetchProfile(uid)
      .then(async (p) => {
        if (!alive) return;
        if (p?.disabled) {
          setNotice('blocked');
          await supabase.auth.signOut();
          return;
        }
        profileFor.current = uid;
        setProfile(p || { id: uid, email: session.user.email, name: session.user.email, role: 'pending', prefs: {} });
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        profileFor.current = uid;
        setProfile({ id: uid, email: session.user.email, name: session.user.email, role: 'pending', prefs: {}, loadError: true });
        setStatus('ready');
      });
    return () => {
      alive = false;
    };
  }, [uid, session]);

  // ----- actions -----
  const login = useCallback(async (email, password) => {
    busy.current = true;
    setNotice('');
    try {
      return await doLogin(email, password);
    } finally {
      busy.current = false;
    }
  }, []);

  const doLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normEmail(email), password });
    if (error) {
      const code = error.code || '';
      if (code === 'email_not_confirmed' || /confirm/i.test(error.message)) return { ok: false, error: 'unconfirmed' };
      const why = authReason(error);
      if (why === 'rate' || why === 'network' || why === 'server') return { ok: false, error: why, detail: error.message };
      return { ok: false, error: 'invalid' };
    }
    const p = await fetchProfile(data.user.id).catch(() => null);
    if (p?.disabled) {
      await supabase.auth.signOut();
      return { ok: false, error: 'blocked' };
    }
    profileFor.current = data.user.id;
    setProfile(p || { id: data.user.id, email: data.user.email, name: data.user.email, role: 'pending', prefs: {} });
    setStatus('ready');
    return { ok: true, role: p?.role || 'pending' };
  };

  const register = useCallback(async (args) => {
    busy.current = true;
    try {
      return await doRegister(args);
    } finally {
      busy.current = false;
    }
  }, []);

  const doRegister = async ({ name, email, password, role, org }) => {
    if (String(password).length < MIN_PASSWORD) return { ok: false, error: 'weak' };
    const { data, error } = await supabase.auth.signUp({
      email: normEmail(email),
      password,
      options: { data: { name: String(name).trim(), role, org: org ? String(org).trim() : undefined }, emailRedirectTo: siteUrl() },
    });
    if (error) {
      if (/registered|exists/i.test(error.message)) return { ok: false, error: 'exists' };
      const why = authReason(error);
      if (why === 'other' && /password/i.test(error.message)) return { ok: false, error: 'weak' };
      return { ok: false, error: why, detail: error.message };
    }
    // With e-mail confirmation on, Supabase hides whether the address is taken: no identities = already registered.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: 'exists' };
    if (!data.session) return { ok: true, confirm: true };
    const p = await fetchProfile(data.user.id).catch(() => null);
    profileFor.current = data.user.id;
    setProfile(p || { id: data.user.id, email: data.user.email, name, role: 'pending', prefs: {} });
    setStatus('ready');
    return { ok: true, role: p?.role || 'pending' };
  };

  const logout = useCallback(async () => {
    profileFor.current = null;
    setProfile(null);
    setAccounts([]);
    await supabase.auth.signOut();
  }, []);

  const sendReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normEmail(email), { redirectTo: siteUrl() });
    return error ? { ok: false, error: authReason(error), detail: error.message } : { ok: true };
  }, []);

  const finishRecovery = useCallback(async (password) => {
    if (String(password).length < MIN_PASSWORD) return { ok: false, error: 'weak' };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: 'failed' };
    setRecovery(false);
    return { ok: true };
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      if (!profile) return;
      const name = String(patch.name ?? profile.name).trim();
      setProfile((p) => ({ ...p, name }));
      await supabase.from('profiles').update({ name }).eq('id', profile.id);
    },
    [profile]
  );

  const changePassword = useCallback(
    async (current, next) => {
      if (!profile) return { ok: false, error: 'wrong' };
      if (String(next).length < MIN_PASSWORD) return { ok: false, error: 'weak' };
      const check = await supabase.auth.signInWithPassword({ email: profile.email, password: current });
      if (check.error) return { ok: false, error: 'wrong' };
      const { error } = await supabase.auth.updateUser({ password: next });
      return error ? { ok: false, error: 'weak' } : { ok: true };
    },
    [profile]
  );

  /** School admin / owner: prepare an account. Whoever signs up with this email gets the role. */
  const createAccount = useCallback(async ({ name, email, role }) => {
    const e = normEmail(email);
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', e).maybeSingle();
    if (existing) return { ok: false, error: 'exists' };
    const { error } = await supabase.from('invites').insert({ email: e, name: String(name).trim(), role });
    if (error) return { ok: false, error: 'failed' };
    return { ok: true, invite: true };
  }, []);

  // ----- owner -----
  const isOwner = profile?.role === 'owner';
  const refreshAccounts = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id,email,name,role,requested_role,org,disabled,created_at').order('created_at', { ascending: true });
    setAccounts((data || []).map((a) => ({ ...a, createdAt: a.created_at })));
  }, []);
  useEffect(() => {
    if (isOwner) refreshAccounts();
  }, [isOwner, refreshAccounts]);

  const setAccountRole = useCallback(
    async (id, role) => {
      if (!ROLES.includes(role)) return false;
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      await refreshAccounts();
      return !error;
    },
    [refreshAccounts]
  );
  const blockAccount = useCallback(
    async (id, disabled) => {
      const { error } = await supabase.from('profiles').update({ disabled }).eq('id', id);
      await refreshAccounts();
      return !error;
    },
    [refreshAccounts]
  );
  const resetPassword = useCallback(async (id) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return { ok: false };
    return sendReset(acc.email);
  }, [accounts, sendReset]);

  const user = useMemo(() => {
    if (!profile) return null;
    const name = profile.name || profile.email;
    return { id: profile.id, name, email: profile.email, role: profile.role, org: profile.org || undefined, prefs: profile.prefs || {}, requestedRole: profile.requested_role, firstName: name.split(/\s+/)[0], demo: false };
  }, [profile]);

  const value = useMemo(
    () => ({
      status,
      remote: true,
      notice,
      user,
      recovery,
      login,
      register,
      logout,
      sendReset,
      finishRecovery,
      updateProfile,
      changePassword,
      createAccount,
      allAccounts: isOwner ? accounts : [],
      refreshAccounts,
      setAccountRole,
      blockAccount,
      resetPassword,
      deleteAccount: (id) => blockAccount(id, true),
    }),
    [status, notice, user, recovery, login, register, logout, sendReset, finishRecovery, updateProfile, changePassword, createAccount, isOwner, accounts, refreshAccounts, setAccountRole, blockAccount, resetPassword]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
