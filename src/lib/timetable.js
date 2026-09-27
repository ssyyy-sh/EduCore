import { PERIODS, TIMETABLE_SEED, WEEKDAYS } from '../data/mock.js';

/*
 * Timetable helpers. The timetable is a map 'class|Day|period' → { subject, teacher, teacherId, room };
 * edits are stored as overrides on top of the starting timetable (null = lesson removed).
 */

export const cellKey = (cls, day, p) => `${cls}|${day}|${p}`;
export const roomText = (room) => (room && typeof room === 'object' ? room.en : room || '');
const teacherKeyOf = (c) => c?.teacherId || (c?.teacher || '').trim().toLowerCase();

export function buildTimetable(overrides = {}) {
  const out = { ...TIMETABLE_SEED };
  for (const [k, v] of Object.entries(overrides)) {
    if (v) out[k] = v;
    else delete out[k];
  }
  return out;
}

const toLesson = (k, c) => {
  const [cls, day, p] = k.split('|');
  const per = PERIODS.find((x) => x.p === Number(p));
  return { key: k, cls, day, p: Number(p), start: per.start, end: per.end, subject: c.subject, teacher: c.teacher, teacherId: c.teacherId, room: c.room };
};

/** Lessons of one class for one day, in order. */
export function lessonsForClass(tt, cls, day) {
  return PERIODS.map((per) => tt[cellKey(cls, day, per.p)] && toLesson(cellKey(cls, day, per.p), tt[cellKey(cls, day, per.p)])).filter(Boolean);
}

/** Lessons a teacher gives on one day (any class). `who` = { id, name }. */
export function lessonsForTeacher(tt, who, day) {
  const keys = new Set([who.id, (who.name || '').trim().toLowerCase(), ...(who.aliases || []).map((a) => a.toLowerCase())].filter(Boolean));
  return Object.entries(tt)
    .filter(([k, c]) => k.split('|')[1] === day && (keys.has(c.teacherId) || keys.has((c.teacher || '').trim().toLowerCase())))
    .map(([k, c]) => toLesson(k, c))
    .sort((a, b) => a.p - b.p);
}

export const weekCount = (tt, pick) => WEEKDAYS.reduce((n, d) => n + pick(tt, d).length, 0);

/**
 * Clashes for putting `cell` into class/day/period: the same teacher or the same room
 * already has a lesson in another class at that time.
 */
export function findConflicts(tt, cls, day, p, cell) {
  const out = [];
  const tk = teacherKeyOf(cell);
  const room = roomText(cell.room).trim().toLowerCase();
  for (const [k, c] of Object.entries(tt)) {
    const [kc, kd, kp] = k.split('|');
    if (kd !== day || Number(kp) !== Number(p) || kc === cls) continue;
    if (tk && teacherKeyOf(c) === tk) out.push({ type: 'teacher', cls: kc, lesson: c });
    if (room && roomText(c.room).trim().toLowerCase() === room) out.push({ type: 'room', cls: kc, lesson: c });
  }
  return out;
}
