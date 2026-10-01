import { CHILDREN, SUBJECT_GRADES, CHILD_SUBJECT_GRADES, GRADE_HISTORY, SUBJECT_PROGRESS, TEACHER_CLASSES, WEEKDAYS } from '../data/mock.js';
import { lessonsForClass, lessonsForTeacher } from './timetable.js';

/*
 * One shape for every child / student the app shows, whether it is one of the demo Morgan children
 * (with hand-written demo data) or any other student card (numbers derived from the card).
 */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
const round1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const DEFAULT_SUBJECTS = {
  primary: ['Reading', 'Mathematics', 'Science', 'Art', 'Physical Education'],
  middle: ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Music'],
  senior: ['Mathematics', 'English Literature', 'Physics', 'Chemistry', 'Biology', 'History'],
};

function subjectsFromTimetable(tt, cls) {
  const map = new Map();
  for (const d of WEEKDAYS) for (const l of lessonsForClass(tt, cls, d)) if (!map.has(l.subject)) map.set(l.subject, l.teacher || '—');
  return [...map.entries()].map(([subject, teacher]) => ({ subject, teacher }));
}

/** Build the child object for a student card. */
export function buildChild(student, { timetable, tutorName }) {
  const morgan = CHILDREN.find((c) => c.studentId === student.id);
  if (morgan) {
    const subjects = morgan.id === 'alex' ? SUBJECT_GRADES : CHILD_SUBJECT_GRADES[morgan.id];
    const history = morgan.id === 'alex' ? GRADE_HISTORY : GRADE_HISTORY.map((d, i) => ({ ...d, you: morgan.trend[i] ?? d.you, cls: round1((morgan.trend[i] ?? d.you) - 0.2) }));
    const subjectProgress =
      morgan.id === 'alex' ? SUBJECT_PROGRESS : subjects.map((s, i) => ({ subject: s.subject, value: clamp(morgan.progress + ((i * 7) % 11) - 5, 40, 100), done: 18 + i, total: 24 }));
    return { ...morgan, className: student.className, full: student.name, subjects, history, subjectProgress, demo: true };
  }
  const grade = Number(student.grade || String(student.className).split('-')[0]) || 9;
  const band = grade <= 4 ? 'primary' : grade <= 8 ? 'middle' : 'senior';
  const fromTt = subjectsFromTimetable(timetable, student.className);
  const base = fromTt.length ? fromTt : DEFAULT_SUBJECTS[band].map((subject) => ({ subject, teacher: '—' }));
  const score = Number(student.score) || 70;
  const subjects = base.map(({ subject, teacher }) => {
    const h = hash(`${student.id}|${subject}`);
    const average = round1(clamp(2.4 + (score / 100) * 2.6 + (h - 0.5) * 0.6, 2, 5));
    return { subject, teacher, grade: Math.round(average), average, change: round1((hash(`${subject}|${student.id}`) - 0.5) * 0.6) };
  });
  const avgGrade = subjects.length ? round1(subjects.reduce((a, s) => a + s.average, 0) / subjects.length) : 0;
  const trend = GRADE_HISTORY.map((_, i) => round1(clamp(avgGrade + (hash(`${student.id}|m${i}`) - 0.5) * 0.4, 2, 5)));
  const progress = Math.round(Number(student.progress) || 0);
  return {
    id: student.id,
    studentId: student.id,
    name: student.name.split(/\s+/)[0],
    full: student.name,
    className: student.className,
    avgGrade,
    progress,
    trend,
    subjects,
    history: GRADE_HISTORY.map((d, i) => ({ ...d, you: trend[i], cls: round1(clamp(avgGrade - 0.2, 2, 5)) })),
    subjectProgress: subjects.map((s, i) => ({ subject: s.subject, value: clamp(progress + Math.round((hash(`${student.id}|p${i}`) - 0.5) * 20), 0, 100), done: Math.round(((progress || 50) / 100) * 24), total: 24 })),
    recent: [],
    upcoming: [],
    tutor: tutorName || '—',
    demo: false,
  };
}

/** The classes a teacher link covers, with live numbers from the roster and the timetable. */
export function buildTeacherClasses(link, { students, timetable }) {
  if (!link) return [];
  const who = { id: link.teacherId, name: link.teacherName, aliases: link.teacherId === 't-hayes' ? ['Mr. Hayes'] : [] };
  return (link.classes || []).map((name) => {
    const demo = link.teacherId === 't-hayes' ? TEACHER_CLASSES.find((c) => c.name === name) : null;
    const roster = students.filter((s) => s.className === name && s.status !== 'Inactive' && !s.isNew);
    const avg = (key) => (roster.length ? Math.round(roster.reduce((a, s) => a + (Number(s[key]) || 0), 0) / roster.length) : 0);
    let next = null;
    for (const day of WEEKDAYS) {
      const l = lessonsForTeacher(timetable, who, day).find((x) => x.cls === name);
      if (l) {
        next = { day, time: l.start, room: typeof l.room === 'object' ? l.room.en : l.room };
        break;
      }
    }
    return { name, subject: demo?.subject || link.subject || 'Mathematics', attendance: demo?.attendance ?? avg('attendance'), avg: demo?.avg ?? avg('score'), next: next || demo?.next || null };
  });
}
