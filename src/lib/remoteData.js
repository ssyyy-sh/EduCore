import { supabase, fetchAll } from './supabase.js';

/*
 * School data on the server. `loadAll` returns the same shape the app keeps in memory
 * (see EMPTY in AppContext), and `api` has one writer per change the app can make.
 * Row Level Security in the database decides who may read and write what.
 */

// Personal chats are not part of backups or resets: only the two people in a conversation can read it.
const DATA_TABLES = ['timetable', 'meeting_slots', 'behavior', 'final_grades', 'assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements', 'messages', 'reads', 'students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'];
export const LIVE_TABLES = ['account_links', 'chat_messages', 'timetable', 'meeting_slots', 'behavior', 'final_grades', 'assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements', 'students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'];

const isoDate = (v) => (typeof v === 'string' ? v.slice(0, 10) : v);

/** My chat messages (sent and received), oldest first. */
export async function loadChat(uid) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(`sender.eq.${uid},recipient.eq.${uid}`)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data.reverse().map((m) => ({ id: m.id, from: m.sender, to: m.recipient, body: m.body, at: m.created_at, readAt: m.read_at }));
}

const optional = (p) => p.then((r) => (Array.isArray(r) ? r : r.error ? [] : r.data || [])).catch(() => []);

// Row Level Security returns only what this account may see (own card, own children, own classes).
export async function loadAll({ uid, role }) {
  const isAdmin = role === 'school' || role === 'owner';
  const [assignments, attendance, columns, marks, gradeLog, submissions, announcements, messages, reads, studentsAdded, overrides, teachersAdded, teacherOverrides, tutors, me] = await Promise.all([
    fetchAll('assignments', undefined, ['created_at', 'id']),
    fetchAll('attendance', undefined, ['day', 'class_name', 'student_id']),
    fetchAll('gb_columns', undefined, ['class_name', 'id']),
    fetchAll('marks', undefined, ['class_name', 'student_id', 'column_id']),
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
  const [timetable, slots, behavior, finals, chat, contacts, links, codes] = await Promise.all([
    fetchAll('timetable', undefined, ['class_name', 'day', 'period']),
    fetchAll('meeting_slots', undefined, ['starts_at', 'id']),
    fetchAll('behavior', (q) => q.order('at', { ascending: false }).limit(1000)),
    fetchAll('final_grades', undefined, ['class_name', 'student_id', 'subject']),
    loadChat(uid),
    supabase.rpc('chat_contacts').then((r) => (r.error ? [] : r.data || [])),
    optional(supabase.from('account_links').select('*').order('created_at', { ascending: false }).limit(5000)),
    isAdmin ? optional(supabase.from('link_codes').select('*').is('used_by', null).order('created_at', { ascending: false }).limit(2000)) : Promise.resolve([]),
  ]);

  const attendanceMap = {};
  for (const r of attendance) {
    const k = `${isoDate(r.day)}|${r.class_name}`;
    (attendanceMap[k] ||= {})[r.student_id] = r.status;
  }
  const gradebook = {};
  const gb = (cls) => (gradebook[cls] ||= { columns: [], removed: [], marks: {} });
  for (const c of columns) {
    if (!c.is_seed) gb(c.class_name).columns.push({ id: c.id, title: c.title, titleL: c.title_l || undefined, date: c.date, type: c.type, fromAssignment: c.from_assignment || undefined, subject: c.subject || undefined });
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
      submissions.map((s) => [`${s.assignment_id}|${s.student_id}`, { studentId: s.student_id, studentName: s.student_name, className: s.class_name || undefined, files: s.files || [], comment: s.comment || '', at: s.at, grade: s.grade, feedback: s.feedback || '', gradedAt: s.graded_at }])
    ),
    announcements: [...announcements].reverse().map((a) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, author: a.author, authorId: a.author_id, at: a.at })),
    addedTeachers: [...teachersAdded].reverse().map((r) => r.data),
    teacherEdits: Object.fromEntries(teacherOverrides.map((o) => [o.teacher_id, o.patch])),
    tutors: Object.fromEntries(tutors.map((t) => [t.class_name, t.teacher_id])),
    prefs: { [uid]: me?.data?.prefs || {} },
    timetable: Object.fromEntries(timetable.map((r) => [`${r.class_name}|${r.day}|${r.period}`, r.cleared ? null : { subject: r.subject, teacher: r.teacher_name, teacherId: r.teacher_id, room: r.room }])),
    meetings: slots.map((m) => ({ id: m.id, teacherId: m.teacher_id, teacherName: m.teacher_name, startsAt: m.starts_at, duration: m.duration_min, location: m.location, bookedBy: m.booked_by, bookedName: m.booked_name, child: m.child, note: m.note || '', bookedAt: m.booked_at })),
    behavior: behavior.map((b) => ({ id: b.id, studentId: b.student_id, cls: b.class_name, kind: b.kind, category: b.category, note: b.note || '', author: b.author, authorId: b.author_id, at: b.at })),
    finals: Object.fromEntries(finals.map((f) => [`${f.term}|${f.class_name}|${f.student_id}|${f.subject}`, { grade: f.grade, at: f.confirmed_at }])),
    chat,
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, role: c.role })),
    links: links.map((l) => ({
      id: l.id,
      profileId: l.profile_id,
      email: l.email,
      kind: l.kind,
      studentId: l.student_id,
      studentName: l.student_name,
      className: l.class_name,
      teacherId: l.teacher_id,
      teacherName: l.teacher_name,
      subject: l.subject,
      classes: l.classes || [],
      accountName: l.account_name,
      createdAt: l.created_at,
    })),
    codes: codes.map((c) => ({ code: c.code, kind: c.kind, studentId: c.student_id, studentName: c.student_name, className: c.class_name, expiresAt: c.expires_at, usedBy: c.used_by, usedAt: c.used_at, createdAt: c.created_at })),
  };
}

const check = ({ error }) => {
  if (error) throw error;
};
const upsert = (table, rows, onConflict) => supabase.from(table).upsert(rows, { onConflict }).then(check);
const insert = (table, rows) => supabase.from(table).insert(rows).then(check);

export const api = {
  submitWork: ({ assignmentId, studentId, studentName, cls, files, comment }) => insert('submissions', { assignment_id: assignmentId, student_id: studentId, student_name: studentName, class_name: cls, files, comment }),
  gradeSubmission: async ({ assignmentId, studentId, grade, feedback, column, cls, log }) => {
    await supabase
      .from('submissions')
      .update({ grade, feedback, graded_at: new Date().toISOString() })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .then(check);
    if (column) await upsert('gb_columns', { class_name: cls, id: column.id, title: column.title, title_l: column.titleL, date: column.date, type: column.type, from_assignment: column.fromAssignment, subject: column.subject || null }, 'class_name,id');
    await upsert('marks', { class_name: cls, student_id: studentId, column_id: `a-${assignmentId}`, grade }, 'class_name,student_id,column_id');
    await insert('grade_log', log);
  },
  addAssignment: (a) => insert('assignments', { id: a.id, title: a.title, subject: a.subject, teacher: a.teacher, due: a.due, type: a.type, weight: a.weight, cls: a.cls, instructions: a.instructions }),
  setMark: async ({ cls, studentId, columnId, grade, log }) => {
    await upsert('marks', { class_name: cls, student_id: studentId, column_id: columnId, grade }, 'class_name,student_id,column_id');
    if (log) await insert('grade_log', log);
  },
  addColumn: ({ cls, col }) => insert('gb_columns', { class_name: cls, id: col.id, title: col.title, date: col.date, type: col.type, subject: col.subject || null }),
  removeColumn: ({ cls, colId, isSeed, subject }) => upsert('gb_columns', { class_name: cls, id: colId, removed: true, subject: subject || null, ...(isSeed ? { is_seed: true } : {}) }, 'class_name,id'),
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
  setTimetableCell: ({ cls, day, p, cell }) =>
    upsert(
      'timetable',
      cell
        ? { class_name: cls, day, period: p, subject: cell.subject, teacher_id: cell.teacherId || null, teacher_name: cell.teacher, room: typeof cell.room === 'object' ? cell.room.en : cell.room, cleared: false }
        : { class_name: cls, day, period: p, subject: null, teacher_id: null, teacher_name: null, room: null, cleared: true },
      'class_name,day,period'
    ),
  sendChat: ({ to, body }) => insert('chat_messages', { recipient: to, body }),
  markChatRead: (otherId) => supabase.rpc('chat_mark_read', { other: otherId }).then(check),
  addSlots: (rows) => insert('meeting_slots', rows.map((m) => ({ id: m.id, teacher_name: m.teacherName, starts_at: m.startsAt, duration_min: m.duration, location: m.location }))),
  removeSlot: (id) => supabase.from('meeting_slots').delete().eq('id', id).then(check),
  bookSlot: (id, child, note) =>
    supabase.rpc('book_slot', { slot: id, child_name: child, note_text: note }).then((r) => {
      check(r);
      if (r.data === false) throw new Error('slot-taken');
    }),
  cancelBooking: (id) => supabase.rpc('cancel_booking', { slot: id }).then(check),
  addBehavior: (b) => insert('behavior', { id: b.id, student_id: b.studentId, class_name: b.cls, kind: b.kind, category: b.category, note: b.note, author: b.author }),
  removeBehavior: (id) => supabase.from('behavior').delete().eq('id', id).then(check),
  setFinals: async ({ term, cls, subject, list, logs }) => {
    const set = list.filter((x) => x.grade).map((x) => ({ term, class_name: cls, student_id: x.studentId, subject, grade: x.grade }));
    const clear = list.filter((x) => !x.grade).map((x) => x.studentId);
    if (set.length) await upsert('final_grades', set, 'term,class_name,student_id,subject');
    if (clear.length) await supabase.from('final_grades').delete().eq('term', term).eq('class_name', cls).eq('subject', subject).in('student_id', clear).then(check);
    if (logs.length) await insert('grade_log', logs);
  },
  addLinkCode: (c) => insert('link_codes', { code: c.code, kind: c.kind, student_id: c.studentId, student_name: c.studentName, class_name: c.className, expires_at: c.expiresAt }),
  removeLinkCode: (code) => supabase.from('link_codes').delete().eq('code', code).then(check),
  /** Returns { profileId, role }: profileId is set when an account with this email already exists. */
  addLink: async (email, l) => {
    const row = { email, kind: l.kind, student_id: l.studentId || null, student_name: l.studentName || null, class_name: l.className || null, teacher_id: l.teacherId || null, teacher_name: l.teacherName || null, subject: l.subject || null, classes: l.classes || [] };
    const { data, error } = await supabase.from('account_links').insert(row).select('profile_id').single();
    if (error) throw error;
    if (data?.profile_id) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.profile_id).maybeSingle();
      return { profileId: data.profile_id, role: p?.role || null };
    }
    // No account yet: whoever signs up with this email gets the right role.
    const { data: inv } = await supabase.from('invites').select('id').eq('email', email).limit(1);
    if (!inv?.length) await insert('invites', { email, role: l.kind });
    return { profileId: null, role: null };
  },
  removeLink: (id) => supabase.from('account_links').delete().eq('id', id).then(check),
  redeemCode: (code) =>
    supabase.rpc('redeem_link_code', { c: code }).then((r) => {
      check(r);
      return r.data;
    }),
  setPrefs: (uid, prefs) => supabase.from('profiles').update({ prefs }).eq('id', uid).then(check),
  resetAll: async () => {
    for (const t of DATA_TABLES) {
      // Every table has one of these columns; the filter just means "all rows".
      const col = { timetable: 'class_name', final_grades: 'term', attendance: 'day', marks: 'class_name', gb_columns: 'class_name', reads: 'kind', student_overrides: 'student_id', teacher_overrides: 'teacher_id', tutors: 'class_name', submissions: 'assignment_id' }[t] || 'id';
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
  const channel = supabase.channel('edufy-live');
  for (const table of LIVE_TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
