import { supabase, fetchAll } from './supabase.js';

/*
 * School data on the server. `loadAll` returns the same shape the app keeps in memory
 * (see EMPTY in AppContext), and `api` has one writer per change the app can make.
 * Row Level Security in the database decides who may read and write what.
 */

const DATA_TABLES = ['assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements', 'messages', 'reads', 'students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'];
export const LIVE_TABLES = ['assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements', 'students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'];

const isoDate = (v) => (typeof v === 'string' ? v.slice(0, 10) : v);

export async function loadAll({ uid, role, myClasses }) {
  const allClasses = role === 'school' || role === 'owner';
  const byClass = (col) => (q) => (allClasses || !myClasses.length ? q : q.in(col, myClasses));
  const [assignments, attendance, columns, marks, gradeLog, submissions, announcements, messages, reads, studentsAdded, overrides, teachersAdded, teacherOverrides, tutors, me] = await Promise.all([
    fetchAll('assignments', undefined, ['created_at', 'id']),
    fetchAll('attendance', byClass('class_name'), ['day', 'class_name', 'student_id']),
    fetchAll('gb_columns', undefined, ['class_name', 'id']),
    fetchAll('marks', byClass('class_name'), ['class_name', 'student_id', 'column_id']),
    supabase.from('grade_log').select('*').order('at', { ascending: false }).limit(200).then((r) => { if (r.error) throw r.error; return r.data; }),
    fetchAll('submissions', undefined, ['assignment_id', 'student_id']),
    fetchAll('announcements', undefined, ['at', 'id']),
    fetchAll('messages', (q) => q.eq('owner', uid), ['at', 'id']),
    fetchAll('reads', (q) => q.eq('user_id', uid), ['kind', 'item_id']),
    fetchAll('students_added', undefined, ['created_at', 'id']),
    fetchAll('student_overrides', undefined, ['student_id']),
    fetchAll('teachers_added', undefined, ['created_at', 'id']),
    fetchAll('teacher_overrides', undefined, ['teacher_id']),
    fetchAll('tutors', undefined, ['class_name']),
    supabase.from('profiles').select('prefs').eq('id', uid).maybeSingle(),
  ]);

  const attendanceMap = {};
  for (const r of attendance) {
    const k = `${isoDate(r.day)}|${r.class_name}`;
    (attendanceMap[k] ||= {})[r.student_id] = r.status;
  }
  const gradebook = {};
  const gb = (cls) => (gradebook[cls] ||= { columns: [], removed: [], marks: {} });
  for (const c of columns) {
    if (!c.is_seed) gb(c.class_name).columns.push({ id: c.id, title: c.title, titleL: c.title_l || undefined, date: c.date, type: c.type, fromAssignment: c.from_assignment || undefined });
    if (c.removed) gb(c.class_name).removed.push(c.id);
  }
  for (const m of marks) (gb(m.class_name).marks[m.student_id] ||= {})[m.column_id] = m.grade;

  return {
    submitted: [],
    newAssignments: [...assignments].reverse().map((a) => ({ id: a.id, title: a.title, subject: a.subject, teacher: a.teacher, due: a.due, type: a.type, weight: a.weight, cls: a.cls, instructions: a.instructions })),
    readNotifications: { [uid]: reads.filter((r) => r.kind === 'n').map((r) => r.item_id) },
    readMessages: { [uid]: reads.filter((r) => r.kind === 'm').map((r) => r.item_id) },
    sentMessages: [...messages].reverse().map((m) => ({ id: m.id, owner: m.owner, from: m.to_name, role: m.role, subject: m.subject, body: m.body, at: m.at })),
    addedStudents: [...studentsAdded].reverse().map((r) => r.data),
    archived: overrides.filter((o) => o.archived).map((o) => o.student_id),
    moves: Object.fromEntries(overrides.filter((o) => o.class_name).map((o) => [o.student_id, o.class_name])),
    attendance: attendanceMap,
    gradebook,
    gradeLog: gradeLog.map((g) => ({ id: g.id, studentId: g.student_id, subject: g.subject, work: g.work, grade: g.grade, at: g.at })),
    submissions: Object.fromEntries(
      submissions.map((s) => [s.assignment_id, { studentId: s.student_id, studentName: s.student_name, files: s.files || [], comment: s.comment || '', at: s.at, grade: s.grade, feedback: s.feedback || '', gradedAt: s.graded_at }])
    ),
    announcements: [...announcements].reverse().map((a) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, author: a.author, authorId: a.author_id, at: a.at })),
    addedTeachers: [...teachersAdded].reverse().map((r) => r.data),
    teacherEdits: Object.fromEntries(teacherOverrides.map((o) => [o.teacher_id, o.patch])),
    tutors: Object.fromEntries(tutors.map((t) => [t.class_name, t.teacher_id])),
    prefs: { [uid]: me?.data?.prefs || {} },
  };
}

const check = ({ error }) => {
  if (error) throw error;
};
const upsert = (table, rows, onConflict) => supabase.from(table).upsert(rows, { onConflict }).then(check);
const insert = (table, rows) => supabase.from(table).insert(rows).then(check);

export const api = {
  submitWork: ({ assignmentId, studentId, studentName, files, comment }) => insert('submissions', { assignment_id: assignmentId, student_id: studentId, student_name: studentName, files, comment }),
  gradeSubmission: async ({ assignmentId, studentId, grade, feedback, column, cls, log }) => {
    await supabase
      .from('submissions')
      .update({ grade, feedback, graded_at: new Date().toISOString() })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .then(check);
    if (column) await upsert('gb_columns', { class_name: cls, id: column.id, title: column.title, title_l: column.titleL, date: column.date, type: column.type, from_assignment: column.fromAssignment }, 'class_name,id');
    await upsert('marks', { class_name: cls, student_id: studentId, column_id: `a-${assignmentId}`, grade }, 'class_name,student_id,column_id');
    await insert('grade_log', log);
  },
  addAssignment: (a) => insert('assignments', { id: a.id, title: a.title, subject: a.subject, teacher: a.teacher, due: a.due, type: a.type, weight: a.weight, cls: a.cls, instructions: a.instructions }),
  setMark: async ({ cls, studentId, columnId, grade, log }) => {
    await upsert('marks', { class_name: cls, student_id: studentId, column_id: columnId, grade }, 'class_name,student_id,column_id');
    if (log) await insert('grade_log', log);
  },
  addColumn: ({ cls, col }) => insert('gb_columns', { class_name: cls, id: col.id, title: col.title, date: col.date, type: col.type }),
  removeColumn: ({ cls, colId, isSeed }) => upsert('gb_columns', { class_name: cls, id: colId, removed: true, ...(isSeed ? { is_seed: true } : {}) }, 'class_name,id'),
  saveAttendance: ({ iso, cls, map }) => {
    const rows = Object.entries(map).map(([student_id, status]) => ({ day: iso, class_name: cls, student_id, status }));
    return rows.length ? upsert('attendance', rows, 'day,class_name,student_id') : Promise.resolve();
  },
  markRead: ({ uid, kind, ids }) => (ids.length ? upsert('reads', ids.map((item_id) => ({ user_id: uid, kind, item_id })), 'user_id,kind,item_id') : Promise.resolve()),
  sendMessage: (m) => insert('messages', { id: m.id, owner: m.owner, to_name: m.from, role: m.role, subject: m.subject, body: m.body, at: m.at }),
  addAnnouncement: (a) => insert('announcements', { id: a.id, title: a.title, body: a.body, audience: a.audience, author: a.author, at: a.at }),
  removeAnnouncement: (id) => supabase.from('announcements').delete().eq('id', id).then(check),
  addStudent: (s) => insert('students_added', { id: s.id, data: s }),
  archiveStudent: (id) => upsert('student_overrides', { student_id: id, archived: true }, 'student_id'),
  moveStudent: (id, cls) => upsert('student_overrides', { student_id: id, class_name: cls }, 'student_id'),
  addTeacher: (t) => insert('teachers_added', { id: t.id, data: t }),
  editTeacher: (id, patch) => upsert('teacher_overrides', { teacher_id: id, patch }, 'teacher_id'),
  setTutor: (cls, teacherId) => upsert('tutors', { class_name: cls, teacher_id: teacherId }, 'class_name'),
  setPrefs: (uid, prefs) => supabase.from('profiles').update({ prefs }).eq('id', uid).then(check),
  resetAll: async () => {
    for (const t of DATA_TABLES) {
      // Every table has one of these columns; the filter just means "all rows".
      const col = { attendance: 'day', marks: 'class_name', gb_columns: 'class_name', reads: 'kind', student_overrides: 'student_id', teacher_overrides: 'teacher_id', tutors: 'class_name', submissions: 'assignment_id' }[t] || 'id';
      await supabase.from(t).delete().not(col, 'is', null).then(check);
    }
  },
  backup: async () => {
    const out = {};
    for (const t of DATA_TABLES) out[t] = await fetchAll(t);
    const { data } = await supabase.from('profiles').select('id,email,name,role,org,disabled,created_at');
    out.profiles = data || [];
    return out;
  },
};

/** Live updates: calls onChange (debounced by the caller) whenever shared data changes on the server. */
export function subscribe(onChange) {
  const channel = supabase.channel('educore-live');
  for (const table of LIVE_TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
