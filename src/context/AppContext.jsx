import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ASSIGNMENTS,
  MESSAGES,
  NOTIFICATIONS,
  STUDENTS,
  ORG,
  TEACHERS,
  CLASS_TUTORS,
  GRADEBOOK_SEED,
  ANNOUNCEMENTS_SEED,
  DEMO_STUDENT_IDS,
  TEACHER_CLASSES,
  CHILDREN,
  seedAttendance,
  seedMark,
  isoDay,
  schoolDays,
  MEETINGS_SEED,
  BEHAVIOR_SEED,
  CHAT_SEED,
  TERM,
  L,
} from '../data/mock.js';
import { buildTimetable } from '../lib/timetable.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { useAuth } from './AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { REMOTE } from '../lib/supabase.js';
import { loadAll, loadChat, api, subscribe } from '../lib/remoteData.js';

/*
 * Theme, toasts and the demo's shared school data. Changes people make
 * (grades, attendance, submissions, announcements, staff changes…) are kept
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
  moves: {}, // { studentId: className }
  attendance: {}, // { 'YYYY-MM-DD|9-A': { studentId: 'absent' | 'late' | 'present' } }
  gradebook: {}, // { cls: { columns: [{ id, title, date(ISO), type }], removed: [colId], marks: { studentId: { colId: 2..5 | null } } } }
  gradeLog: [], // [{ id, studentId, subject, work, grade, at(ISO) }]
  submissions: {}, // { assignmentId: { studentId, files: [{ id, name, size, type }], comment, at, grade, feedback, gradedAt } }
  announcements: [], // [{ id, title, body, audience, author, at(ISO) }]
  addedTeachers: [],
  teacherEdits: {}, // { teacherId: { subject, classes, status } }
  tutors: {}, // { cls: teacherId }
  prefs: {}, // { userId: { assignment: true, grade: true, … } }
  timetable: {}, // { 'class|Day|period': { subject, teacher, teacherId, room } | null }
  chat: [], // [{ id, from, to, body, at(ISO), readAt }]
  meetings: [], // [{ id, teacherId, teacherName, startsAt(ISO), duration, location, bookedBy, bookedName, child, note, bookedAt }]
  behavior: [], // [{ id, studentId, cls, kind: 'praise'|'remark', category, note, author, authorId, at }]
  finals: {}, // { 'term|class|studentId|subject': { grade, at } }
  contacts: [], // server mode: people I can chat with [{ id, name, role }]
};

function addRead(d, key, uid, ids) {
  if (!uid) return d;
  const cur = d[key][uid] || [];
  const next = [...new Set([...cur, ...ids])];
  return { ...d, [key]: { ...d[key], [uid]: next } };
}

/** Build a { en, ru, uz } text from a template and a value that may itself be translated. */
const LANGS = ['en', 'ru', 'uz'];
const pickLang = (v, l) => (v && typeof v === 'object' ? v[l] ?? v.en : v);
const compose = (tpl, vars) => Object.fromEntries(LANGS.map((l) => [l, tpl[l].replace(/\{(\w+)\}/g, (_, k) => pickLang(vars[k], l) ?? '')]));

export const NOTIF_TYPES = ['assignment', 'grade', 'schedule', 'announcement', 'message', 'attendance', 'behavior'];
export const GRADE_SUBJECT = { 'Algebra I': 'Mathematics', Geometry: 'Mathematics', 'Pre-calculus': 'Mathematics' };

function readTheme() {
  try {
    return window.localStorage.getItem('educore.theme') || 'system';
  } catch {
    return 'system';
  }
}

function loadData() {
  const stored = readJSON(DATA_KEY, {});
  const base = stored && typeof stored === 'object' ? stored : {};
  const d = { ...EMPTY, ...base };
  // Demo content for the newer sections, added once.
  if (!('meetings' in base)) d.meetings = MEETINGS_SEED;
  if (!('behavior' in base)) d.behavior = BEHAVIOR_SEED;
  if (!('chat' in base)) d.chat = CHAT_SEED;
  // Older saves kept read state as a flat list; start fresh in that case.
  if (Array.isArray(d.readNotifications)) d.readNotifications = {};
  if (Array.isArray(d.readMessages)) d.readMessages = {};
  // Older attendance saves stored `false` for absent.
  for (const k of Object.keys(d.attendance)) {
    for (const sid of Object.keys(d.attendance[k] || {})) if (d.attendance[k][sid] === false) d.attendance[k][sid] = 'absent';
  }
  return d;
}

export function AppProvider({ children }) {
  const { user, directory } = useAuth();
  const isOwner = user?.role === 'owner';
  // The Owner sees the app through one of the four roles at a time ("view as").
  const [viewAs, setViewAsState] = useState(() => {
    const v = readJSON('educore.viewAs', 'school');
    return ['student', 'parent', 'teacher', 'school'].includes(v) ? v : 'school';
  });
  const setViewAs = useCallback((r) => {
    setViewAsState(r);
    writeJSON('educore.viewAs', r);
  }, []);
  const role = isOwner ? viewAs : user?.role ?? null;
  const [theme, setThemeState] = useState(readTheme);
  const [toasts, setToasts] = useState([]);
  const [data, setData] = useState(() => (REMOTE ? { ...EMPTY } : loadData()));
  const [ready, setReady] = useState(!REMOTE);
  const { t: tt } = useI18n();
  const idRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Demo mode keeps data in this browser; server mode keeps it in Supabase (changes are shown at once, then saved).
  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      if (!REMOTE) writeJSON(DATA_KEY, next);
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

  // ----- server sync -----
  const pendingWrites = useRef(0);
  const reloadTimer = useRef(null);
  const uidRef = useRef(null);
  const serverScope = useMemo(() => {
    if (!user || user.role === 'pending') return null;
    const classes = user.role === 'teacher' ? TEACHER_CLASSES.map((c) => c.name) : user.role === 'student' ? ['9-A'] : user.role === 'parent' ? CHILDREN.map((c) => c.className) : [];
    return { uid: user.id, role: user.role, myClasses: classes };
  }, [user]);
  const scopeRef = useRef(serverScope);
  scopeRef.current = serverScope;

  const reload = useCallback(async () => {
    const scope = scopeRef.current;
    if (!REMOTE || !scope) return;
    if (pendingWrites.current > 0) return; // a save is in progress; reload after it
    try {
      const next = await loadAll(scope);
      if (scopeRef.current?.uid !== scope.uid || pendingWrites.current > 0) return;
      setData(next);
    } catch (e) {
      console.warn('[educore] load failed', e);
    } finally {
      if (scopeRef.current?.uid === scope.uid) setReady(true);
    }
  }, []);
  const scheduleReload = useCallback(
    (ms = 600) => {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(reload, ms);
    },
    [reload]
  );
  // Chat messages arrive on their own (lighter than reloading everything).
  const chatTimer = useRef(null);
  const reloadChat = useCallback(() => {
    clearTimeout(chatTimer.current);
    chatTimer.current = setTimeout(async () => {
      const scope = scopeRef.current;
      if (!REMOTE || !scope) return;
      try {
        const chat = await loadChat(scope.uid);
        if (scopeRef.current?.uid === scope.uid) setData((d) => ({ ...d, chat }));
      } catch (e) {
        console.warn('[educore] chat load failed', e);
      }
    }, 150);
  }, []);

  const scopeKey = serverScope ? `${serverScope.uid}|${serverScope.role}` : '';
  useEffect(() => {
    if (!REMOTE) return undefined;
    if (!scopeKey) {
      uidRef.current = null;
      setData({ ...EMPTY });
      setReady(true);
      return undefined;
    }
    if (uidRef.current !== scopeKey) {
      uidRef.current = scopeKey;
      setReady(false);
      setData({ ...EMPTY });
    }
    reload();
    const unsubscribe = subscribe((table) => (table === 'chat_messages' ? reloadChat() : scheduleReload()));
    const onVisible = () => document.visibilityState === 'visible' && scheduleReload(100);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => scheduleReload(0), 60000);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
      clearTimeout(reloadTimer.current);
    };
  }, [scopeKey, reload, scheduleReload, reloadChat]);

  // Demo mode: other tabs of this browser (e.g. another account) see changes at once.
  useEffect(() => {
    if (REMOTE) return undefined;
    const onStorage = (e) => {
      if (e.key === DATA_KEY) setData(loadData());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Save a change on the server. If it fails, the data is reloaded so the screen shows what is really saved. */
  const sync = useCallback(
    (fn) => {
      if (!REMOTE) return Promise.resolve(true);
      pendingWrites.current += 1;
      return Promise.resolve()
        .then(fn)
        .then(() => true)
        .catch((e) => {
          console.warn('[educore] save failed', e);
          toast(tt('sync.error'));
          return false;
        })
        .finally(() => {
          pendingWrites.current -= 1;
          scheduleReload(300);
        });
    },
    [toast, tt, scheduleReload]
  );

  // ----- who am I (demo mapping) -----
  // Student accounts see Alex; parent accounts see the three Morgan children; teachers see Mr. Hayes' classes.
  const myStudentIds = useMemo(() => {
    if (role === 'student') return [DEMO_STUDENT_IDS.alex];
    if (role === 'parent') return CHILDREN.map((c) => c.studentId);
    return [];
  }, [role]);
  const myClasses = useMemo(() => {
    if (role === 'teacher') return TEACHER_CLASSES.map((c) => c.name);
    if (role === 'student') return ['9-A'];
    if (role === 'parent') return CHILDREN.map((c) => c.className);
    return [];
  }, [role]);

  // ----- people -----
  const students = useMemo(() => {
    const archived = new Set(data.archived);
    return [...data.addedStudents, ...STUDENTS].map((s) => {
      let out = s;
      const moved = data.moves[s.id];
      if (moved) out = { ...out, className: moved, grade: Number(moved.split('-')[0]) };
      if (archived.has(s.id)) out = { ...out, status: 'Inactive' };
      return out;
    });
  }, [data.addedStudents, data.archived, data.moves]);

  const teachers = useMemo(
    () => [...data.addedTeachers, ...TEACHERS].map((t) => (data.teacherEdits[t.id] ? { ...t, ...data.teacherEdits[t.id] } : t)),
    [data.addedTeachers, data.teacherEdits]
  );
  const tutors = useMemo(() => ({ ...CLASS_TUTORS, ...data.tutors }), [data.tutors]);

  // ----- assignments -----
  const assignments = useMemo(() => {
    const created = data.newAssignments.map((a) => ({ ...a, due: new Date(a.due), status: 'Pending', created: true }));
    const base = ASSIGNMENTS.map((a) => a);
    return [...created, ...base].map((a) => {
      const sub = data.submissions[a.id];
      if (data.submitted.includes(a.id) || sub) return { ...a, status: 'Completed', submission: sub || null };
      return a;
    });
  }, [data.newAssignments, data.submitted, data.submissions]);

  // ----- gradebook -----
  const gradebookColumns = useCallback(
    (cls) => {
      const g = data.gradebook[cls] || {};
      const removed = new Set(g.removed || []);
      const seed = GRADEBOOK_SEED.filter((c) => !removed.has(c.id));
      const added = (g.columns || []).filter((c) => !removed.has(c.id)).map((c) => ({ ...c, date: new Date(c.date) }));
      return [...seed, ...added].sort((a, b) => a.date - b.date);
    },
    [data.gradebook]
  );
  const getMark = useCallback(
    (cls, student, colId) => {
      const m = data.gradebook[cls]?.marks?.[student.id];
      if (m && colId in m) return m[colId];
      if (student.isNew) return null;
      return GRADEBOOK_SEED.some((c) => c.id === colId) ? seedMark(student, colId) : null;
    },
    [data.gradebook]
  );

  // ----- attendance -----
  const getAttendance = useCallback(
    (student, iso) => {
      const saved = data.attendance[`${iso}|${student.className}`];
      if (saved && saved[student.id]) return saved[student.id];
      if (student.isNew) return 'present';
      return seedAttendance(student, iso);
    },
    [data.attendance]
  );

  /** Attendance since the start of term for one student. */
  const attendanceSummary = useCallback(
    (student) => {
      const days = schoolDays(200);
      const st = student ? days.map((d) => getAttendance(student, isoDay(d))) : [];
      const absent = st.filter((x) => x === 'absent').length;
      const late = st.filter((x) => x === 'late').length;
      return { days: st.length, absent, late, rate: st.length ? ((st.length - absent) / st.length) * 100 : 100 };
    },
    [getAttendance]
  );

  // ----- announcements -----
  const announcements = useMemo(() => {
    const all = [...data.announcements.map((a) => ({ ...a, at: new Date(a.at) })), ...ANNOUNCEMENTS_SEED];
    const visible = all.filter((a) => {
      if (role === 'school') return true;
      if (a.audience === 'all') return true;
      if (a.audience === 'students') return role === 'student';
      if (a.audience === 'parents') return role === 'parent';
      if (a.audience === 'teachers') return role === 'teacher';
      if (a.audience.startsWith('class:')) return myClasses.includes(a.audience.slice(6)) || (role === 'teacher' && a.author === user?.name);
      return false;
    });
    return visible.sort((a, b) => b.at - a.at);
  }, [data.announcements, role, myClasses, user]);

  // ----- recent grades for my students (seeded + given by teachers) -----
  const gradeLog = useMemo(() => data.gradeLog.map((g) => ({ ...g, date: new Date(g.at) })), [data.gradeLog]);
  /** Latest grades of one student: grades given in the app first, then the seeded ones. */
  const recentGrades = useCallback(
    (studentId, base = [], n = 5) => [...gradeLog.filter((g) => g.studentId === studentId), ...base].sort((a, b) => b.date - a.date).slice(0, n),
    [gradeLog]
  );

  // ----- timetable -----
  const timetable = useMemo(() => buildTimetable(data.timetable), [data.timetable]);
  /** Whose lessons a teacher account sees (demo mapping: Mr. Hayes). */
  const meTeacher = useMemo(() => ({ id: 't-hayes', name: 'Daniel Hayes', aliases: ['Mr. Hayes'] }), []);

  // ----- chat -----
  const myId = user?.id;
  const contacts = useMemo(() => {
    if (!myId) return [];
    const list = REMOTE ? data.contacts || [] : (directory || []).filter((a) => a.id !== myId);
    const me = user?.role;
    const allowed = (r) => (me === 'student' || me === 'parent' ? ['teacher', 'school', 'owner'].includes(r) : r !== 'pending');
    return list.filter((c) => allowed(c.role));
  }, [data.contacts, directory, myId, user]);
  const chat = useMemo(() => (myId ? data.chat.filter((m) => m.from === myId || m.to === myId).map((m) => ({ ...m, date: new Date(m.at), mine: m.from === myId })) : []), [data.chat, myId]);
  const chatUnread = useMemo(() => chat.filter((m) => !m.mine && !m.readAt).length, [chat]);

  // ----- meetings, behavior, final grades -----
  const meetings = useMemo(() => [...data.meetings].map((m) => ({ ...m, date: new Date(m.startsAt) })).sort((a, b) => a.date - b.date), [data.meetings]);
  const behavior = useMemo(() => [...data.behavior].map((b) => ({ ...b, date: new Date(b.at) })).sort((a, b) => b.date - a.date), [data.behavior]);
  const getFinal = useCallback((cls, studentId, subject) => data.finals[`${TERM}|${cls}|${studentId}|${subject}`] || null, [data.finals]);
  const finalsForStudent = useCallback(
    (studentId) =>
      Object.entries(data.finals)
        .filter(([k]) => k.startsWith(`${TERM}|`) && k.split('|')[2] === studentId)
        .map(([k, v]) => ({ subject: k.split('|')[3], cls: k.split('|')[1], ...v })),
    [data.finals]
  );

  // ----- notifications -----
  const prefs = useMemo(() => {
    const p = (user && data.prefs[user.id]) || {};
    return Object.fromEntries(NOTIF_TYPES.map((t) => [t, p[t] !== false]));
  }, [data.prefs, user]);

  const uid = user?.id;
  const readN = useMemo(() => (uid && data.readNotifications[uid]) || [], [data.readNotifications, uid]);
  const readM = useMemo(() => (uid && data.readMessages[uid]) || [], [data.readMessages, uid]);

  const dynamicNotifications = useMemo(() => {
    const out = [];
    // New grades for my students
    for (const g of gradeLog) {
      if (!myStudentIds.includes(g.studentId)) continue;
      const child = CHILDREN.find((c) => c.studentId === g.studentId);
      out.push({
        id: `grade-${g.id}`,
        type: 'grade',
        title: role === 'parent' ? compose({ en: 'New grade for {n}', ru: 'Новая оценка: {n}', uz: '{n} uchun yangi baho' }, { n: child?.name }) : L('Grade updated', 'Оценка обновлена', 'Baho yangilandi'),
        text: compose({ en: '{w}: {g}', ru: '{w}: {g}', uz: '{w}: {g}' }, { w: g.work, g: String(g.grade) }),
        at: g.date,
        unread: true,
      });
    }
    // Announcements created in the app
    for (const a of data.announcements) {
      if (!announcements.some((x) => x.id === a.id) || a.author === user?.name) continue;
      out.push({ id: `ann-${a.id}`, type: 'announcement', title: L('New announcement', 'Новое объявление', 'Yangi e’lon'), text: { en: a.title, ru: a.title, uz: a.title }, at: new Date(a.at), unread: true });
    }
    // Submissions waiting for the teacher
    if (role === 'teacher') {
      for (const [aid, s] of Object.entries(data.submissions)) {
        if (s.grade) continue;
        const a = assignments.find((x) => x.id === aid);
        if (!a) continue;
        out.push({ id: `sub-${aid}-${s.at}`, type: 'assignment', title: L('New submission', 'Новая сданная работа', 'Yangi topshirilgan ish'), text: compose({ en: '{n} · {t}', ru: '{n} · {t}', uz: '{n} · {t}' }, { n: s.studentName || 'Alex Morgan', t: a.title }), at: new Date(s.at), unread: true });
      }
    }
    // Chat: one notification per person with unread messages
    const bySender = {};
    for (const m of chat) if (!m.mine && !m.readAt) (bySender[m.from] ||= []).push(m);
    for (const [from, list] of Object.entries(bySender)) {
      const last = list[list.length - 1];
      const who = contacts.find((c) => c.id === from)?.name || '—';
      out.push({ id: `chat-${last.id}`, type: 'message', title: compose({ en: 'Message from {n}', ru: 'Сообщение: {n}', uz: 'Xabar: {n}' }, { n: who }), text: typeof last.body === 'object' ? last.body : { en: last.body, ru: last.body, uz: last.body }, at: last.date, unread: true, link: `/app/messages?chat=${from}` });
    }
    // Behaviour notes about my children / me
    const weekAgo = Date.now() - 14 * 86400000;
    for (const b of behavior) {
      if (!myStudentIds.includes(b.studentId) || b.date.getTime() < weekAgo) continue;
      const child = CHILDREN.find((c) => c.studentId === b.studentId);
      const title = b.kind === 'praise' ? { en: 'Praise', ru: 'Поощрение', uz: 'Rag‘bat' } : { en: 'Remark', ru: 'Замечание', uz: 'Tanbeh' };
      out.push({ id: `beh-${b.id}`, type: 'behavior', title: role === 'parent' ? compose({ en: '{k}: {n}', ru: '{k}: {n}', uz: '{k}: {n}' }, { k: title, n: child?.name }) : title, text: typeof b.note === 'object' ? b.note : { en: b.note, ru: b.note, uz: b.note }, at: b.date, unread: true, link: '/app/behavior' });
    }
    // Conference bookings for my slots
    if (role === 'teacher') {
      for (const m of meetings) {
        if (m.teacherId !== myId || !m.bookedBy || !m.bookedAt) continue;
        out.push({ id: `mt-${m.id}-${m.bookedAt}`, type: 'schedule', title: L('Conference booked', 'Запись на собрание', 'Majlisga yozilish'), text: compose({ en: '{p} · {c}', ru: '{p} · {c}', uz: '{p} · {c}' }, { p: m.bookedName || '—', c: m.child || '' }), at: new Date(m.bookedAt), unread: true, link: '/app/meetings' });
      }
    }
    return out;
  }, [gradeLog, myStudentIds, role, data.announcements, data.submissions, announcements, assignments, user, chat, contacts, behavior, meetings, myId]);

  // Each role gets its own feed; read state is kept per account.
  const notifications = useMemo(
    () =>
      [...dynamicNotifications, ...NOTIFICATIONS.filter((n) => role && n.audience.includes(role))]
        .filter((n) => prefs[n.type] !== false)
        .map((n) => ({ ...n, unread: n.unread && !readN.includes(n.id) }))
        .sort((a, b) => b.at - a.at),
    [dynamicNotifications, role, prefs, readN]
  );

  const messages = useMemo(() => {
    const sent = data.sentMessages.filter((m) => m.owner === uid).map((m) => ({ ...m, at: new Date(m.at), box: 'sent', unread: false }));
    const base = MESSAGES.filter((m) => role && m.audience.includes(role)).map((m) => ({ ...m, unread: m.unread && !readM.includes(m.id) }));
    return [...sent, ...base].sort((a, b) => b.at - a.at);
  }, [data.sentMessages, uid, role, readM]);

  // ----- actions -----
  const actions = useMemo(() => {
    const uid = user?.id;
    const newId = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const logEntry = (entry) => ({ id: newId('g'), at: new Date().toISOString(), ...entry });
    const addLog = (d, entry) => ({ ...d, gradeLog: [entry, ...d.gradeLog].slice(0, 200) });
    const setMarkIn = (d, cls, studentId, colId, grade) => {
      const g = d.gradebook[cls] || { columns: [], removed: [], marks: {} };
      const marks = { ...(g.marks || {}), [studentId]: { ...((g.marks || {})[studentId] || {}), [colId]: grade } };
      return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, marks } } };
    };
    const gbOf = (d, cls) => d.gradebook[cls] || { columns: [], removed: [], marks: {} };
    return {
      submitAssignment: (id) => update((d) => ({ ...d, submitted: d.submitted.includes(id) ? d.submitted : [...d.submitted, id] })),
      submitWork: (assignmentId, { files, comment }) => {
        const sub = { studentId: DEMO_STUDENT_IDS.alex, studentName: user?.name, files, comment, at: new Date().toISOString(), grade: null, feedback: '' };
        update((d) => ({ ...d, submissions: { ...d.submissions, [assignmentId]: sub } }));
        return sync(() => api.submitWork({ assignmentId, studentId: sub.studentId, studentName: sub.studentName, files, comment }));
      },
      gradeSubmission: (assignment, { grade, feedback }) => {
        const d0 = dataRef.current;
        const sub = d0.submissions[assignment.id];
        if (!sub) return Promise.resolve(false);
        const cls = assignment.cls || '9-A';
        const existing = (gbOf(d0, cls).columns || []).find((c) => c.fromAssignment === assignment.id);
        const title = typeof assignment.title === 'object' ? assignment.title.en : assignment.title;
        const column = existing ? null : { id: `a-${assignment.id}`, title, titleL: assignment.title, date: new Date().toISOString(), type: assignment.type, fromAssignment: assignment.id };
        const log = logEntry({ studentId: sub.studentId, subject: assignment.subject, work: assignment.title, grade });
        update((d) => {
          let next = { ...d, submissions: { ...d.submissions, [assignment.id]: { ...sub, grade, feedback, gradedAt: new Date().toISOString() } } };
          if (column) {
            const g = gbOf(next, cls);
            next = { ...next, gradebook: { ...next.gradebook, [cls]: { ...g, columns: [...(g.columns || []), column] } } };
          }
          next = setMarkIn(next, cls, sub.studentId, `a-${assignment.id}`, grade);
          return addLog(next, log);
        });
        return sync(() =>
          api.gradeSubmission({ assignmentId: assignment.id, studentId: sub.studentId, grade, feedback, cls, column, log: { id: log.id, student_id: log.studentId, subject: log.subject, work: log.work, grade, at: log.at } })
        );
      },
      addAssignment: (a) => {
        const row = { ...a, id: newId('n'), due: a.due.toISOString() };
        update((d) => ({ ...d, newAssignments: [row, ...d.newAssignments] }));
        return sync(() => api.addAssignment(row));
      },
      // Gradebook
      setMark: (cls, student, col, grade, subject) => {
        const log = grade ? logEntry({ studentId: student.id, subject, work: col.titleL || col.title, grade }) : null;
        update((d) => {
          const next = setMarkIn(d, cls, student.id, col.id, grade);
          return log ? addLog(next, log) : next;
        });
        return sync(() =>
          api.setMark({ cls, studentId: student.id, columnId: col.id, grade, log: log && { id: log.id, student_id: log.studentId, subject: log.subject, work: log.work, grade, at: log.at } })
        );
      },
      addColumn: (cls, col) => {
        const column = { ...col, id: newId('u'), date: col.date.toISOString() };
        update((d) => {
          const g = gbOf(d, cls);
          return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, columns: [...(g.columns || []), column] } } };
        });
        return sync(() => api.addColumn({ cls, col: column }));
      },
      removeColumn: (cls, colId) => {
        update((d) => {
          const g = gbOf(d, cls);
          return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, removed: [...new Set([...(g.removed || []), colId])] } } };
        });
        return sync(() => api.removeColumn({ cls, colId, isSeed: GRADEBOOK_SEED.some((c) => c.id === colId) }));
      },
      // Attendance: map of studentId → status for one class and day
      saveAttendanceDay: (iso, cls, map) => {
        update((d) => ({ ...d, attendance: { ...d.attendance, [`${iso}|${cls}`]: { ...(d.attendance[`${iso}|${cls}`] || {}), ...map } } }));
        return sync(() => api.saveAttendance({ iso, cls, map }));
      },
      saveAttendance: (key, map) => {
        const [iso, cls] = key.split('|');
        update((d) => ({ ...d, attendance: { ...d.attendance, [key]: { ...(d.attendance[key] || {}), ...map } } }));
        return sync(() => api.saveAttendance({ iso, cls, map }));
      },
      // Messages & notifications
      markNotificationRead: (id) => {
        update((d) => addRead(d, 'readNotifications', uid, [id]));
        return sync(() => api.markRead({ uid, kind: 'n', ids: [id] }));
      },
      markAllNotificationsRead: (ids) => {
        const list = ids || NOTIFICATIONS.map((n) => n.id);
        update((d) => addRead(d, 'readNotifications', uid, list));
        return sync(() => api.markRead({ uid, kind: 'n', ids: list }));
      },
      markMessageRead: (id) => {
        update((d) => addRead(d, 'readMessages', uid, [id]));
        return sync(() => api.markRead({ uid, kind: 'm', ids: [id] }));
      },
      sendMessage: ({ to, role: r, subject, body }) => {
        const m = { id: newId('sent'), owner: uid, from: to, role: r || 'School', subject, body, at: new Date().toISOString() };
        update((d) => ({ ...d, sentMessages: [m, ...d.sentMessages] }));
        return sync(() => api.sendMessage(m));
      },
      // Announcements
      addAnnouncement: ({ title, body, audience }) => {
        const a = { id: newId('u'), title, body, audience, author: user?.name, authorId: uid, at: new Date().toISOString() };
        update((d) => ({ ...d, announcements: [a, ...d.announcements] }));
        return sync(() => api.addAnnouncement(a));
      },
      removeAnnouncement: (id) => {
        update((d) => ({ ...d, announcements: d.announcements.filter((a) => a.id !== id) }));
        return sync(() => api.removeAnnouncement(id));
      },
      // Students
      addStudent: (s) => {
        const d = dataRef.current;
        const total = d.addedStudents.length + STUDENTS.length;
        if (total >= ORG.capacity) return { ok: false, error: 'full' };
        const n = total + 1;
        const student = {
          id: REMOTE ? `NB-${String(24000 + n).padStart(5, '0')}-${Math.random().toString(36).slice(2, 5)}` : `NB-${String(24000 + n).padStart(5, '0')}`,
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
        sync(() => api.addStudent(student));
        return { ok: true, student };
      },
      archiveStudent: (id) => {
        update((d) => ({ ...d, archived: d.archived.includes(id) ? d.archived : [...d.archived, id] }));
        return sync(() => api.archiveStudent(id));
      },
      moveStudent: (id, cls) => {
        update((d) => ({ ...d, moves: { ...d.moves, [id]: cls } }));
        return sync(() => api.moveStudent(id, cls));
      },
      // Teachers & classes
      addTeacher: (t) => {
        const teacher = { id: newId('tu'), name: t.name, email: t.email, subject: t.subject, classes: t.classes || [], status: 'Active', isNew: true };
        update((d) => ({ ...d, addedTeachers: [teacher, ...d.addedTeachers] }));
        sync(() => api.addTeacher(teacher));
        return teacher;
      },
      editTeacher: (id, patch) => {
        const merged = { ...(dataRef.current.teacherEdits[id] || {}), ...patch };
        update((d) => ({ ...d, teacherEdits: { ...d.teacherEdits, [id]: merged } }));
        return sync(() => api.editTeacher(id, merged));
      },
      setTutor: (cls, teacherId) => {
        update((d) => ({ ...d, tutors: { ...d.tutors, [cls]: teacherId } }));
        return sync(() => api.setTutor(cls, teacherId));
      },
      // Timetable (school admin)
      setTimetableCell: (cls, day, p, cell) => {
        const key = `${cls}|${day}|${p}`;
        update((d) => ({ ...d, timetable: { ...d.timetable, [key]: cell } }));
        return sync(() => api.setTimetableCell({ cls, day, p, cell }));
      },
      // Chat
      sendChat: (to, body) => {
        const m = { id: newId('cm'), from: uid, to, body, at: new Date().toISOString(), readAt: null };
        update((d) => ({ ...d, chat: [...d.chat, m] }));
        return sync(() => api.sendChat({ to, body }));
      },
      markChatRead: (otherId) => {
        const now = new Date().toISOString();
        if (!dataRef.current.chat.some((m) => m.from === otherId && m.to === uid && !m.readAt)) return Promise.resolve(true);
        update((d) => ({ ...d, chat: d.chat.map((m) => (m.from === otherId && m.to === uid && !m.readAt ? { ...m, readAt: now } : m)) }));
        return sync(() => api.markChatRead(otherId));
      },
      // Parent–teacher conferences
      addSlots: (slots) => {
        const rows = slots.map((x) => ({ id: REMOTE ? crypto.randomUUID() : newId('ms'), teacherId: uid, teacherName: user?.name, bookedBy: null, bookedName: null, child: null, note: '', ...x }));
        update((d) => ({ ...d, meetings: [...d.meetings, ...rows] }));
        return sync(() => api.addSlots(rows));
      },
      removeSlot: (id) => {
        update((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
        return sync(() => api.removeSlot(id));
      },
      bookSlot: (id, { child, note }) => {
        const now = new Date().toISOString();
        const slot = dataRef.current.meetings.find((m) => m.id === id);
        if (!slot || slot.bookedBy) return Promise.resolve(false);
        update((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, bookedBy: uid, bookedName: user?.name, child, note: note || '', bookedAt: now } : m)) }));
        return sync(() => api.bookSlot(id, child, note || ''));
      },
      cancelBooking: (id) => {
        update((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, bookedBy: null, bookedName: null, child: null, note: '', bookedAt: null } : m)) }));
        return sync(() => api.cancelBooking(id));
      },
      // Behaviour
      addBehavior: ({ studentId, cls, kind, category, note }) => {
        const b = { id: REMOTE ? crypto.randomUUID() : newId('b'), studentId, cls, kind, category, note, author: user?.name, authorId: uid, at: new Date().toISOString() };
        update((d) => ({ ...d, behavior: [b, ...d.behavior] }));
        return sync(() => api.addBehavior(b));
      },
      removeBehavior: (id) => {
        update((d) => ({ ...d, behavior: d.behavior.filter((b) => b.id !== id) }));
        return sync(() => api.removeBehavior(id));
      },
      // Final (term) grades — the grade also goes to "recent grades" of the student
      setFinals: (cls, subject, list) => {
        const at = new Date().toISOString();
        const logs = list.filter((x) => x.grade).map((x) => logEntry({ studentId: x.studentId, subject, work: L('Term grade', 'Итог за четверть', 'Chorak bahosi'), grade: x.grade }));
        update((d) => {
          const finals = { ...d.finals };
          for (const x of list) {
            const k = `${TERM}|${cls}|${x.studentId}|${subject}`;
            if (x.grade) finals[k] = { grade: x.grade, at };
            else delete finals[k];
          }
          return logs.reduce(addLog, { ...d, finals });
        });
        return sync(() =>
          api.setFinals({
            term: TERM,
            cls,
            subject,
            list,
            logs: logs.map((l) => ({ id: l.id, student_id: l.studentId, subject: l.subject, work: l.work, grade: l.grade, at: l.at })),
          })
        );
      },
      resetData: () => {
        update(() => ({ ...EMPTY }));
        return sync(() => api.resetAll());
      },
      backupData: () => (REMOTE ? api.backup() : Promise.resolve(null)),
      setPref: (type, on) => {
        if (!uid) return Promise.resolve(false);
        const merged = { ...(dataRef.current.prefs[uid] || {}), [type]: on };
        update((d) => ({ ...d, prefs: { ...d.prefs, [uid]: merged } }));
        return sync(() => api.setPrefs(uid, merged));
      },
    };
  }, [update, user, sync]);

  const value = useMemo(
    () => ({
      role,
      ready,
      remote: REMOTE,
      timetable,
      meTeacher,
      contacts,
      chat,
      chatUnread,
      meetings,
      behavior,
      getFinal,
      finalsForStudent,
      reload,
      isOwner,
      viewAs,
      setViewAs,
      theme,
      setTheme,
      toast,
      toasts,
      assignments,
      notifications,
      messages,
      students,
      teachers,
      tutors,
      announcements,
      gradeLog,
      recentGrades,
      myStudentIds,
      myClasses,
      attendance: data.attendance,
      gradebookColumns,
      getMark,
      getAttendance,
      attendanceSummary,
      prefs,
      isoDay,
      ...actions,
    }),
    [role, ready, reload, timetable, meTeacher, contacts, chat, chatUnread, meetings, behavior, getFinal, finalsForStudent, isOwner, viewAs, setViewAs, theme, setTheme, toast, toasts, assignments, notifications, messages, students, teachers, tutors, announcements, gradeLog, recentGrades, myStudentIds, myClasses, data.attendance, gradebookColumns, getMark, getAttendance, attendanceSummary, prefs, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
