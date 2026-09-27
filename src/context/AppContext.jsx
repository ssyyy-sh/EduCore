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
  L,
} from '../data/mock.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { useAuth } from './AuthContext.jsx';

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

export const NOTIF_TYPES = ['assignment', 'grade', 'schedule', 'announcement', 'message', 'attendance'];
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
  const d = { ...EMPTY, ...(stored && typeof stored === 'object' ? stored : {}) };
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
  const { user } = useAuth();
  const role = user?.role ?? null;
  const [theme, setThemeState] = useState(readTheme);
  const [toasts, setToasts] = useState([]);
  const [data, setData] = useState(loadData);
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
        out.push({ id: `sub-${aid}-${s.at}`, type: 'assignment', title: L('New submission', 'Новая сданная работа', 'Yangi topshirilgan ish'), text: compose({ en: 'Alex Morgan · {t}', ru: 'Alex Morgan · {t}', uz: 'Alex Morgan · {t}' }, { t: a.title }), at: new Date(s.at), unread: true });
      }
    }
    return out;
  }, [gradeLog, myStudentIds, role, data.announcements, data.submissions, announcements, assignments, user]);

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
    const logGrade = (d, entry) => ({ ...d, gradeLog: [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), ...entry }, ...d.gradeLog].slice(0, 200) });
    const setMarkIn = (d, cls, studentId, colId, grade) => {
      const g = d.gradebook[cls] || { columns: [], removed: [], marks: {} };
      const marks = { ...g.marks, [studentId]: { ...(g.marks[studentId] || {}), [colId]: grade } };
      return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, marks } } };
    };
    return {
      submitAssignment: (id) => update((d) => ({ ...d, submitted: d.submitted.includes(id) ? d.submitted : [...d.submitted, id] })),
      submitWork: (assignmentId, { files, comment }) =>
        update((d) => ({
          ...d,
          submissions: { ...d.submissions, [assignmentId]: { studentId: DEMO_STUDENT_IDS.alex, files, comment, at: new Date().toISOString(), grade: null, feedback: '' } },
        })),
      gradeSubmission: (assignment, { grade, feedback }) =>
        update((d) => {
          const sub = d.submissions[assignment.id];
          if (!sub) return d;
          const cls = assignment.cls || '9-A';
          let next = { ...d, submissions: { ...d.submissions, [assignment.id]: { ...sub, grade, feedback, gradedAt: new Date().toISOString() } } };
          // Put the mark into the class gradebook under a column named after the assignment.
          const g = next.gradebook[cls] || { columns: [], removed: [], marks: {} };
          let col = (g.columns || []).find((c) => c.fromAssignment === assignment.id);
          if (!col) {
            const title = typeof assignment.title === 'object' ? assignment.title.en : assignment.title;
            col = { id: `a-${assignment.id}`, title, titleL: assignment.title, date: new Date().toISOString(), type: assignment.type, fromAssignment: assignment.id };
            next = { ...next, gradebook: { ...next.gradebook, [cls]: { ...g, columns: [...(g.columns || []), col] } } };
          }
          next = setMarkIn(next, cls, sub.studentId, col.id, grade);
          return logGrade(next, { studentId: sub.studentId, subject: assignment.subject, work: assignment.title, grade });
        }),
      addAssignment: (a) => update((d) => ({ ...d, newAssignments: [{ ...a, id: `n-${Date.now()}`, due: a.due.toISOString() }, ...d.newAssignments] })),
      // Gradebook
      setMark: (cls, student, col, grade, subject) =>
        update((d) => {
          const next = setMarkIn(d, cls, student.id, col.id, grade);
          return grade ? logGrade(next, { studentId: student.id, subject, work: col.titleL || col.title, grade }) : next;
        }),
      addColumn: (cls, col) =>
        update((d) => {
          const g = d.gradebook[cls] || { columns: [], removed: [], marks: {} };
          return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, columns: [...(g.columns || []), { ...col, id: `u-${Date.now()}`, date: col.date.toISOString() }] } } };
        }),
      removeColumn: (cls, colId) =>
        update((d) => {
          const g = d.gradebook[cls] || { columns: [], removed: [], marks: {} };
          return { ...d, gradebook: { ...d.gradebook, [cls]: { ...g, removed: [...new Set([...(g.removed || []), colId])] } } };
        }),
      // Attendance: map of studentId → status for one class and day
      saveAttendanceDay: (iso, cls, map) => update((d) => ({ ...d, attendance: { ...d.attendance, [`${iso}|${cls}`]: { ...(d.attendance[`${iso}|${cls}`] || {}), ...map } } })),
      saveAttendance: (key, map) => update((d) => ({ ...d, attendance: { ...d.attendance, [key]: { ...(d.attendance[key] || {}), ...map } } })),
      // Messages & notifications
      markNotificationRead: (id) => update((d) => addRead(d, 'readNotifications', user?.id, [id])),
      markAllNotificationsRead: (ids) => update((d) => addRead(d, 'readNotifications', user?.id, ids || NOTIFICATIONS.map((n) => n.id))),
      markMessageRead: (id) => update((d) => addRead(d, 'readMessages', user?.id, [id])),
      sendMessage: ({ to, role: r, subject, body }) =>
        update((d) => ({ ...d, sentMessages: [{ id: `sent-${Date.now()}`, owner: user?.id, from: to, role: r || 'School', subject, body, at: new Date().toISOString() }, ...d.sentMessages] })),
      // Announcements
      addAnnouncement: ({ title, body, audience }) =>
        update((d) => ({ ...d, announcements: [{ id: `u-${Date.now()}`, title, body, audience, author: user?.name, at: new Date().toISOString() }, ...d.announcements] })),
      removeAnnouncement: (id) => update((d) => ({ ...d, announcements: d.announcements.filter((a) => a.id !== id) })),
      // Students
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
      moveStudent: (id, cls) => update((d) => ({ ...d, moves: { ...d.moves, [id]: cls } })),
      // Teachers & classes
      addTeacher: (t) => {
        const teacher = { id: `tu-${Date.now()}`, name: t.name, email: t.email, subject: t.subject, classes: t.classes || [], status: 'Active', isNew: true };
        update((d) => ({ ...d, addedTeachers: [teacher, ...d.addedTeachers] }));
        return teacher;
      },
      editTeacher: (id, patch) => update((d) => ({ ...d, teacherEdits: { ...d.teacherEdits, [id]: { ...(d.teacherEdits[id] || {}), ...patch } } })),
      setTutor: (cls, teacherId) => update((d) => ({ ...d, tutors: { ...d.tutors, [cls]: teacherId } })),
      setPref: (type, on) =>
        update((d) => {
          if (!user) return d;
          return { ...d, prefs: { ...d.prefs, [user.id]: { ...(d.prefs[user.id] || {}), [type]: on } } };
        }),
    };
  }, [update, user]);

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
    [role, theme, setTheme, toast, toasts, assignments, notifications, messages, students, teachers, tutors, announcements, gradeLog, recentGrades, myStudentIds, myClasses, data.attendance, gradebookColumns, getMark, getAttendance, attendanceSummary, prefs, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
