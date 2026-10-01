import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiList, FiGrid, FiEdit3, FiPlus, FiAlertTriangle, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { LessonBlock, DaySchedule, toMin } from '../components/dashboard/Schedule.jsx';
import { Segmented, Select, Modal } from '../components/ui/index.jsx';
import { WEEKDAYS, PERIODS, TODAY, addDays, todayKey, CLASSES, GRADE_LEVELS } from '../data/mock.js';
import { useChild } from '../components/dashboard/useChild.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadICS } from '../lib/download.js';
import { lessonsForClass, lessonsForTeacher, findConflicts, roomText, cellKey } from '../lib/timetable.js';

const SUBJECT_TONE = {
  Mathematics: 1,
  'Computer Science': 1,
  'English Literature': 2,
  English: 2,
  French: 2,
  Reading: 2,
  Physics: 3,
  Chemistry: 3,
  Biology: 3,
  Science: 3,
  History: 4,
  Geography: 4,
  Economics: 4,
  'Art & Design': 5,
  Art: 5,
  Music: 5,
  'Physical Education': 5,
};
const SUBJECTS = ['Mathematics', 'English Literature', 'English', 'Physics', 'Chemistry', 'Biology', 'Science', 'History', 'Geography', 'Computer Science', 'Economics', 'Art & Design', 'Art', 'Music', 'Physical Education', 'French', 'Reading'];
const LUNCH_BEFORE = 5;

/** Monday of the current week; at weekends, the coming Monday. */
function mondayOf(d) {
  const day = d.getDay() || 7; // Mon=1 … Sun=7
  return addDays(d, day >= 6 ? 8 - day : 1 - day);
}
const at = (date, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

/** All double bookings in the timetable: same teacher in two classes at one time. */
function allClashes(tt) {
  const byTime = {};
  for (const [k, c] of Object.entries(tt)) {
    const [cls, day, p] = k.split('|');
    const who = c.teacherId || (c.teacher || '').trim().toLowerCase();
    if (!who) continue;
    const key = `${day}|${p}|${who}`;
    (byTime[key] ||= []).push({ cls, day, p: Number(p), teacher: c.teacher });
  }
  return Object.values(byTime).filter((list) => list.length > 1);
}

function EditLesson({ ctx, onClose }) {
  const { timetable, teachers, setTimetableCell, toast } = useApp();
  const { t, ts, tw } = useI18n();
  const existing = timetable[cellKey(ctx.cls, ctx.day, ctx.p)];
  const [form, setForm] = useState(() => ({
    subject: existing?.subject || 'Mathematics',
    teacherId: existing?.teacherId || '',
    teacherName: existing?.teacher || '',
    room: roomText(existing?.room),
    allTeachers: false,
  }));
  const active = teachers.filter((x) => x.status === 'Active');
  const options = (form.allTeachers ? active : active.filter((x) => x.subject === form.subject || x.id === form.teacherId)).sort((a, b) => a.name.localeCompare(b.name));
  const cell = form.teacherId || form.teacherName ? { subject: form.subject, teacher: form.teacherName, teacherId: form.teacherId || null, room: form.room.trim() } : null;
  const conflicts = cell ? findConflicts(timetable, ctx.cls, ctx.day, ctx.p, cell) : [];
  const per = PERIODS.find((x) => x.p === ctx.p);

  const save = async () => {
    const ok = await setTimetableCell(ctx.cls, ctx.day, ctx.p, cell);
    if (ok !== false) toast(t('timetable.saved', { cls: ctx.cls }));
    onClose();
  };
  const remove = async () => {
    const ok = await setTimetableCell(ctx.cls, ctx.day, ctx.p, null);
    if (ok !== false) toast(t('timetable.removed'));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('timetable.editTitle', { cls: ctx.cls })}
      description={`${tw(ctx.day)} · ${t('timetable.period', { n: ctx.p })} · ${per.start}–${per.end}`}
      footer={
        <>
          {existing && (
            <button type="button" className="btn btn-ghost btn-danger-text" onClick={remove}>
              <FiTrash2 /> {t('timetable.remove')}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!cell || conflicts.length > 0}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor="tt-subject">
          {t('staff.subject')}
        </label>
        <select id="tt-subject" className="input select-native" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          {SUBJECTS.map((x) => (
            <option key={x} value={x}>
              {ts(x)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="tt-teacher">
          {t('timetable.teacher')}
        </label>
        <select
          id="tt-teacher"
          className="input select-native"
          value={form.teacherId}
          onChange={(e) => {
            const tch = active.find((x) => x.id === e.target.value);
            setForm({ ...form, teacherId: e.target.value, teacherName: tch ? tch.name : '' });
          }}
        >
          <option value="">{form.teacherName && !form.teacherId ? form.teacherName : '—'}</option>
          {options.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {ts(x.subject)}
            </option>
          ))}
        </select>
        <label className="check-row check-row-sm">
          <input type="checkbox" className="checkbox" checked={form.allTeachers} onChange={(e) => setForm({ ...form, allTeachers: e.target.checked })} />
          <span>{t('timetable.allTeachers')}</span>
        </label>
      </div>
      <div className="field">
        <label className="label" htmlFor="tt-room">
          {t('timetable.room')}
        </label>
        <input id="tt-room" className="input" value={form.room} maxLength={20} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="B204" />
      </div>
      {conflicts.length > 0 ? (
        <div className="alert alert-error" role="alert">
          <FiAlertTriangle aria-hidden="true" />
          <div>
            <strong>{t('timetable.conflict')}</strong>
            <ul className="conflict-list">
              {conflicts.map((c, i) => (
                <li key={i}>{c.type === 'teacher' ? t('timetable.teacherBusy', { name: c.lesson.teacher, cls: c.cls }) : t('timetable.roomBusy', { room: roomText(c.lesson.room), cls: c.cls })}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        cell && (
          <p className="hint hint-ok">
            <FiCheckCircle aria-hidden="true" /> {t('timetable.noConflict')}
          </p>
        )
      )}
    </Modal>
  );
}

export default function Schedule() {
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('week');
  const [day, setDay] = useState(todayKey().day);
  const { toast, role, timetable, meTeacher } = useApp();
  const { t, tr, ts, tw, fmtDate } = useI18n();
  const { child, childId, setChildId, options, many } = useChild();
  const [year, setYear] = useState('9');
  const [adminCls, setAdminCls] = useState('9-A');
  const [editing, setEditing] = useState(false);
  const [editCell, setEditCell] = useState(null);

  const isAdmin = role === 'school';
  const isTeacher = role === 'teacher';
  const cls = isAdmin ? adminCls : child?.className || '';
  const lessonsOf = (d) =>
    isTeacher ? lessonsForTeacher(timetable, meTeacher, d).map((l) => ({ ...l, who: t('common.class', { name: l.cls }) })) : lessonsForClass(timetable, cls, d);

  const monday = addDays(mondayOf(TODAY), offset * 7);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayIdx = WEEKDAYS.findIndex((_, i) => addDays(monday, i).getTime() === TODAY.getTime());
  const week = useMemo(() => Object.fromEntries(WEEKDAYS.map((d) => [d, lessonsOf(d)])), [timetable, cls, isTeacher, meTeacher, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const lessonsCount = WEEKDAYS.reduce((a, d) => a + week[d].length, 0);
  const dayIdx = WEEKDAYS.indexOf(day);
  const lastPeriod = Math.max(6, ...Object.values(week).flat().map((l) => l.p), editing ? 7 : 0);
  const rows = PERIODS.filter((x) => x.p <= lastPeriod);
  const clashes = useMemo(() => (isAdmin ? allClashes(timetable) : []), [isAdmin, timetable]);

  const exportICS = () => {
    const events = WEEKDAYS.flatMap((d, i) =>
      week[d].map((l) => {
        const date = addDays(monday, i);
        return { title: ts(l.subject), start: at(date, l.start), end: at(date, l.end), location: tr(l.room), description: isTeacher ? l.cls : l.teacher };
      })
    );
    if (downloadICS(`educore-schedule-${monday.toISOString().slice(0, 10)}.ics`, events)) toast(t('schedule.synced'));
  };

  const description = isTeacher ? t('timetable.subTeacher', { n: lessonsCount }) : isAdmin ? t('timetable.subAdmin', { cls, n: lessonsCount }) : t('schedule.sub', { n: lessonsCount });

  return (
    <div className="page">
      <PageHeader
        title={isAdmin ? t('timetable.title') : t('schedule.title')}
        description={description}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportICS}>
              <FiDownload /> {t('schedule.sync')}
            </button>
            {isAdmin && (
              <button type="button" className={`btn ${editing ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
                <FiEdit3 /> {editing ? t('timetable.done') : t('timetable.edit')}
              </button>
            )}
          </>
        }
      />

      {role === 'parent' && many && <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={options} />}

      {isAdmin && (
        <div className="filters-row">
          <div className="filters-row-right">
            <Select
              label={t('table.fGrade')}
              value={year}
              options={GRADE_LEVELS.map((g) => ({ value: String(g), label: t('common.yearGroup', { n: g }) }))}
              onChange={(v) => {
                setYear(v);
                setAdminCls(`${v}-A`);
              }}
            />
            <Select label={t('table.class')} value={adminCls} options={CLASSES.filter((c) => String(c.grade) === year).map((c) => ({ value: c.name, label: c.name }))} onChange={setAdminCls} />
          </div>
          <p className={`hint ${clashes.length ? 't-danger' : 'hint-ok'}`}>
            {clashes.length ? <FiAlertTriangle aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}{' '}
            {clashes.length ? t('timetable.clashes', { n: clashes.length }) : t('timetable.noClashes')}
          </p>
        </div>
      )}
      {isAdmin && clashes.length > 0 && (
        <ul className="clash-list">
          {clashes.slice(0, 6).map((list, i) => (
            <li key={i}>
              {tw(list[0].day)}, {t('timetable.period', { n: list[0].p })}: {list[0].teacher} — {list.map((x) => x.cls).join(', ')}
            </li>
          ))}
        </ul>
      )}

      <div className="filters-row">
        <div className="week-nav">
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setOffset((o) => o - 1)} aria-label={t('schedule.prev')}>
            <FiChevronLeft />
          </button>
          <strong className="num">
            {fmtDate(monday, { day: 'numeric', month: 'short' })} – {fmtDate(addDays(monday, 4), { day: 'numeric', month: 'short', year: 'numeric' })}
          </strong>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setOffset((o) => o + 1)} aria-label={t('schedule.next')}>
            <FiChevronRight />
          </button>
          {offset !== 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>
              {t('schedule.thisWeek')}
            </button>
          )}
        </div>
        {!editing && (
          <Segmented
            label={t('schedule.view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'week', label: t('schedule.week'), icon: FiGrid },
              { value: 'day', label: t('schedule.day'), icon: FiList },
            ]}
          />
        )}
      </div>

      {view === 'week' || editing ? (
        <section className={`panel week-panel ${editing ? 'is-editing' : ''}`}>
          <div className="week-scroll">
            <div className="week-grid">
              <div className="week-corner" />
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`week-day ${i === todayIdx ? 'is-today' : ''}`}>
                  <span>{tw(d)}</span>
                  <em className="num">{fmtDate(addDays(monday, i), { day: 'numeric', month: 'short' })}</em>
                </div>
              ))}
              {rows.map((per) => (
                <div className="week-row" key={per.p}>
                  <div className={`week-time num ${per.p === LUNCH_BEFORE ? 'after-lunch' : ''}`}>{per.start}</div>
                  {WEEKDAYS.map((d, di) => {
                    const l = week[d].find((x) => x.p === per.p);
                    const activeNow = l && di === todayIdx && offset === 0 && nowMin >= toMin(l.start) && nowMin < toMin(l.end);
                    const content = l ? <LessonBlock l={l} subjectTone={SUBJECT_TONE[l.subject] ?? 5} active={activeNow} /> : editing ? <span className="free free-add"><FiPlus aria-hidden="true" /> {t('timetable.add')}</span> : <span className="free">{t('common.free')}</span>;
                    return (
                      <div key={d + per.p} className={`week-cell ${per.p === LUNCH_BEFORE ? 'after-lunch' : ''}`}>
                        {editing ? (
                          <button type="button" className="week-edit" onClick={() => setEditCell({ cls, day: d, p: per.p })} aria-label={`${tw(d)} ${per.start}: ${l ? ts(l.subject) : t('timetable.add')}`}>
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="panel-foot">
            <span>{editing ? t('timetable.editHint') : t('schedule.breaks')}</span>
            <span>{t('schedule.changes')}</span>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <Segmented label={t('schedule.day')} value={day} onChange={setDay} options={WEEKDAYS.map((d) => ({ value: d, label: t(`weekdaysShort.${d}`) }))} />
            <span className="t-muted num">{fmtDate(addDays(monday, dayIdx), { weekday: 'long', day: 'numeric', month: 'long', cap: true })}</span>
          </div>
          <div className="panel-body">{week[day].length ? <DaySchedule lessons={week[day]} isToday={dayIdx === todayIdx && offset === 0} /> : <p className="muted-note">{t('timetable.noLessons')}</p>}</div>
        </section>
      )}

      {editCell && <EditLesson ctx={editCell} onClose={() => setEditCell(null)} />}
    </div>
  );
}
