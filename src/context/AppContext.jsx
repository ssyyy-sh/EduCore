import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ASSIGNMENTS, MESSAGES, NOTIFICATIONS, STUDENTS, ORG } from '../data/mock.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { useAuth } from './AuthContext.jsx';

/*
 * Theme, toasts and the demo's shared school data. Changes people make
 * (submitted work, new assignments, read messages, added students…) are kept
 * in this browser's storage so they survive a reload.
 */

const AppContext = createContext(null);
const DATA_KEY = 'educore.data.v1';

const EMPTY = {
  submitted: [], // assignment ids submitted by the student
  newAssignments: [], // [{ id, title, subject, teacher, due(ISO), type, weight, cls }]
  readNotifications: {}, // { userId: [ids] }
  readMessages: {}, // { userId: [ids] }
  sentMessages: [], // [{ id, owner, from(to), role, subject, body, at(ISO) }]
  addedStudents: [],
  archived: [],
  attendance: {}, // { 'YYYY-MM-DD|9-A': { studentId: false } }
  prefs: {}, // { userId: { assignment: true, grade: true, … } }
};

function addRead(d, key, uid, ids) {
  if (!uid) return d;
  const cur = d[key][uid] || [];
  const next = [...new Set([...cur, ...ids])];
  return { ...d, [key]: { ...d[key], [uid]: next } };
}

export const NOTIF_TYPES = ['assignment', 'grade', 'schedule', 'announcement', 'message', 'attendance'];

function readTheme() {
  try {
    return window.localStorage.getItem('educore.theme') || 'system';
  } catch {
    return 'system';
  }
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const [theme, setThemeState] = useState(readTheme);
  const [toasts, setToasts] = useState([]);
  const [data, setData] = useState(() => {
    const stored = readJSON(DATA_KEY, {});
    const d = { ...EMPTY, ...(stored && typeof stored === 'object' ? stored : {}) };
    // Older saves kept read state as a flat list; start fresh in that case.
    if (Array.isArray(d.readNotifications)) d.readNotifications = {};
    if (Array.isArray(d.readMessages)) d.readMessages = {};
    return d;
  });
  const idRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      writeJSON(DATA_KEY, next);
      return next;
    });
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try {
      window.localStorage.setItem('educore.theme', t);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  const toast = useCallback((message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  // ----- derived data -----
  const assignments = useMemo(() => {
    const created = data.newAssignments.map((a) => ({ ...a, due: new Date(a.due), status: 'Pending', created: true }));
    const base = ASSIGNMENTS.map((a) => (data.submitted.includes(a.id) ? { ...a, status: 'Completed' } : a));
    return [...created, ...base];
  }, [data.newAssignments, data.submitted]);

  const prefs = useMemo(() => {
    const p = (user && data.prefs[user.id]) || {};
    return Object.fromEntries(NOTIF_TYPES.map((t) => [t, p[t] !== false]));
  }, [data.prefs, user]);

  const uid = user?.id;
  const readN = useMemo(() => (uid && data.readNotifications[uid]) || [], [data.readNotifications, uid]);
  const readM = useMemo(() => (uid && data.readMessages[uid]) || [], [data.readMessages, uid]);

  // Each role gets its own feed; read state is kept per account.
  const notifications = useMemo(
    () =>
      NOTIFICATIONS.filter((n) => role && n.audience.includes(role) && prefs[n.type] !== false)
        .map((n) => ({ ...n, unread: n.unread && !readN.includes(n.id) }))
        .sort((a, b) => b.at - a.at),
    [role, prefs, readN]
  );

  const messages = useMemo(() => {
    const sent = data.sentMessages.filter((m) => m.owner === uid).map((m) => ({ ...m, at: new Date(m.at), box: 'sent', unread: false }));
    const base = MESSAGES.filter((m) => role && m.audience.includes(role)).map((m) => ({ ...m, unread: m.unread && !readM.includes(m.id) }));
    return [...sent, ...base].sort((a, b) => b.at - a.at);
  }, [data.sentMessages, uid, role, readM]);

  const students = useMemo(() => {
    const archived = new Set(data.archived);
    const all = [...data.addedStudents, ...STUDENTS];
    return archived.size ? all.map((s) => (archived.has(s.id) ? { ...s, status: 'Inactive' } : s)) : all;
  }, [data.addedStudents, data.archived]);

  // ----- actions -----
  const actions = useMemo(
    () => ({
      submitAssignment: (id) => update((d) => ({ ...d, submitted: d.submitted.includes(id) ? d.submitted : [...d.submitted, id] })),
      addAssignment: (a) => update((d) => ({ ...d, newAssignments: [{ ...a, id: `n-${Date.now()}`, due: a.due.toISOString() }, ...d.newAssignments] })),
      markNotificationRead: (id) => update((d) => addRead(d, 'readNotifications', user?.id, [id])),
      markAllNotificationsRead: () => update((d) => addRead(d, 'readNotifications', user?.id, NOTIFICATIONS.map((n) => n.id))),
      markMessageRead: (id) => update((d) => addRead(d, 'readMessages', user?.id, [id])),
      sendMessage: ({ to, role: r, subject, body }) =>
        update((d) => ({ ...d, sentMessages: [{ id: `sent-${Date.now()}`, owner: user?.id, from: to, role: r || 'School', subject, body, at: new Date().toISOString() }, ...d.sentMessages] })),
      addStudent: (s) => {
        const d = dataRef.current;
        const total = d.addedStudents.length + STUDENTS.length;
        if (total >= ORG.capacity) return { ok: false, error: 'full' };
        const n = total + 1;
        const student = {
          id: `NB-${String(24000 + n).padStart(5, '0')}`,
          name: s.name,
          email: '',
          guardianEmail: s.email || '',
          className: s.className,
          grade: Number(s.className.split('-')[0]),
          score: 0,
          attendance: 100,
          progress: 0,
          status: 'Active',
          guardian: s.guardian || '—',
          isNew: true,
        };
        update((prev) => ({ ...prev, addedStudents: [student, ...prev.addedStudents] }));
        return { ok: true, student };
      },
      archiveStudent: (id) => update((d) => ({ ...d, archived: d.archived.includes(id) ? d.archived : [...d.archived, id] })),
      saveAttendance: (key, map) => update((d) => ({ ...d, attendance: { ...d.attendance, [key]: map } })),
      setPref: (type, on) =>
        update((d) => {
          if (!user) return d;
          return { ...d, prefs: { ...d.prefs, [user.id]: { ...(d.prefs[user.id] || {}), [type]: on } } };
        }),
    }),
    [update, user]
  );

  const value = useMemo(
    () => ({
      role,
      theme,
      setTheme,
      toast,
      toasts,
      assignments,
      notifications,
      messages,
      students,
      attendance: data.attendance,
      prefs,
      ...actions,
    }),
    [role, theme, setTheme, toast, toasts, assignments, notifications, messages, students, data.attendance, prefs, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
