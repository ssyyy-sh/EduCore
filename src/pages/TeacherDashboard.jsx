import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiUserCheck, FiAward, FiCheckSquare, FiPlus, FiArrowRight, FiClock, FiCheck } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Bars } from '../components/dashboard/Analytics.jsx';
import { Avatar, Status, SearchInput, Modal, EmptyState, Bar } from '../components/ui/index.jsx';
import { TEACHER_SUBMISSIONS, TODAY, addDays, schoolDays, isoDay } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { greetingKey } from '../components/dashboard/greeting.js';

const lowerFirst = (str) => (str ? str.charAt(0).toLowerCase() + str.slice(1) : str);
const LAST_DAY = schoolDays(1)[0] || TODAY;
const SUBJECT_OF = { 'Algebra I': 'Mathematics', Geometry: 'Mathematics', 'Pre-calculus': 'Mathematics' };
const BANDS = [
  ['<60', 0, 60],
  ['60–69', 60, 70],
  ['70–79', 70, 80],
  ['80–89', 80, 90],
  ['90–100', 90, 101],
];
const mean = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);

export default function TeacherDashboard() {
  const { toast, students, getAttendance, saveAttendanceDay, addAssignment, assignments, myTeacherClasses: classes, teacherLink } = useApp();
  const [pick, setActive] = useState(null);
  const active = classes.some((c) => c.name === pick) ? pick : classes[0]?.name || '';
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const isDemo = teacherLink?.teacherId === 't-hayes';
  const { user } = useAuth();
  const { t, tr, ts, fmtDec, fmtDate, relativeDue } = useI18n();
  const dayIso = isoDay(LAST_DAY);
  const isToday = dayIso === isoDay(TODAY);
  const [draft, setDraft] = useState({});
  const statusOf = (s) => draft[active]?.[s.id] ?? getAttendance(s, dayIso);

  const [form, setForm] = useState({ title: '', cls: '', due: isoDay(addDays(TODAY, 7)), instr: '' });
  const [formErr, setFormErr] = useState('');

  const cls = classes.find((c) => c.name === active) || { attendance: 0, avg: 0 };
  const roster = useMemo(() => students.filter((s) => s.className === active && s.status !== 'Inactive'), [students, active]);
  const filtered = roster.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const myStudents = classes.reduce((a, c) => a + students.filter((s) => s.className === c.name && s.status !== 'Inactive').length, 0);
  const mine = assignments.filter((a) => a.mine && a.created);
  const ungraded = assignments.reduce((n, a) => n + (a.submissions || []).filter((x) => !x.grade).length, 0);
  const toReview = (isDemo ? TEACHER_SUBMISSIONS.reduce((a, s) => a + (s.due < TODAY ? 0 : s.submitted), 0) : 0) + ungraded;
  const created = mine.length;
  // Real numbers for the lists and charts (the demo teacher also keeps the sample assignment progress).
  const subList = isDemo
    ? TEACHER_SUBMISSIONS
    : mine
        .sort((a, b) => b.due - a.due)
        .slice(0, 4)
        .map((a) => ({ id: a.id, title: a.title, cls: a.cls, submitted: (a.submissions || []).length, total: Math.max(1, students.filter((s) => s.className === a.cls && s.status !== 'Inactive').length), due: a.due }));
  const week = schoolDays(5)
    .reverse()
    .map((d) => ({ day: t(`weekdaysShort.${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]}`), present: roster.filter((s) => getAttendance(s, isoDay(d)) !== 'absent').length }));
  const dist = BANDS.map(([band, lo, hi]) => ({ band, count: roster.filter((s) => !s.isNew && s.score >= lo && s.score < hi).length }));

  const openModal = () => {
    setForm({ title: t('dash.teacher.fTitleDefault'), cls: active, due: isoDay(addDays(TODAY, 7)), instr: t('dash.teacher.fInstrDefault') });
    setFormErr('');
    setModal(true);
  };
  const publish = () => {
    if (!form.title.trim()) {
      setFormErr(t('dash.teacher.errTitle'));
      return;
    }
    const clsInfo = classes.find((c) => c.name === form.cls);
    const title = form.title.trim();
    addAssignment({
      title: { en: title, ru: title, uz: title },
      subject: SUBJECT_OF[clsInfo?.subject] || clsInfo?.subject || teacherLink?.subject || 'Mathematics',
      teacher: user.name,
      due: new Date(`${form.due}T23:59:00`),
      type: 'Homework',
      weight: '5%',
      cls: form.cls,
      instructions: form.instr,
    });
    setModal(false);
    toast(t('dash.teacher.published', { cls: form.cls }));
  };

  const saveToday = () => {
    saveAttendanceDay(dayIso, active, Object.fromEntries(roster.map((s) => [s.id, statusOf(s)])));
    setDraft((d) => ({ ...d, [active]: {} }));
    toast(t('dash.teacher.saved', { cls: active }));
  };

  return (
    <div className="page">
      <PageHeader
        title={`${t(greetingKey())}, ${user.firstName}.`}
        description={t('dash.teacher.sub')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={saveToday}>
              <FiUserCheck /> {t('dash.teacher.take')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openModal}>
              <FiPlus /> {t('dash.teacher.newAssignment')}
            </button>
          </>
        }
      />

      <div className="stats-grid">
        <StatsCard icon={FiUsers} label={t('dash.teacher.myStudents')} value={myStudents} hint={t('dash.teacher.acrossClasses')} />
        <StatsCard icon={FiUserCheck} label={t('dash.stats.attendance')} value={`${fmtDec(mean(classes.map((c) => c.attendance)))}%`} hint={t('dash.teacher.acrossClasses')} />
        <StatsCard icon={FiAward} label={t('dash.stats.avgGrade')} value={`${fmtDec(mean(classes.map((c) => c.avg)))}%`} hint={t('dash.teacher.acrossClasses')} />
        <StatsCard icon={FiCheckSquare} label={t('dash.teacher.toReview')} value={toReview} hint={created ? t('dash.teacher.createdCount', { n: created }) : t('dash.teacher.waiting')} />
      </div>

      <section>
        <div className="section-title">
          <h2>{t('dash.teacher.myClasses')}</h2>
        </div>
        <div className="class-grid">
          {classes.map((c) => {
            const n = students.filter((s) => s.className === c.name && s.status !== 'Inactive').length;
            return (
              <button type="button" key={c.name} className={`class-card ${active === c.name ? 'is-active' : ''}`} onClick={() => { setActive(c.name); setQ(''); }} aria-pressed={active === c.name}>
                <div className="class-card-top">
                  <strong>{t('common.class', { name: c.name })}</strong>
                  <span>{ts(c.subject)}</span>
                </div>
                <dl>
                  <div>
                    <dt>{t('dash.teacher.students')}</dt>
                    <dd className="num">{n}</dd>
                  </div>
                  <div>
                    <dt>{t('dash.stats.attendance')}</dt>
                    <dd className="num">{c.attendance}%</dd>
                  </div>
                  <div>
                    <dt>{t('dash.teacher.avgGrade')}</dt>
                    <dd className="num">{c.avg}%</dd>
                  </div>
                </dl>
                {c.next && (
                  <span className="class-next">
                    <FiClock aria-hidden="true" /> {t(`weekdaysShort.${c.next.day}`)} {c.next.time}
                    {c.next.room ? ` · ${c.next.room}` : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('dash.teacher.classStudents', { cls: active })}</h3>
              <p>{t('dash.teacher.classSub', { n: roster.length, att: cls.attendance, avg: cls.avg })}</p>
            </div>
            <SearchInput value={q} onChange={setQ} placeholder={t('dash.teacher.searchClass')} style={{ width: 220 }} id="class-search" />
          </div>
          <div className="panel-body flush">
            {filtered.length === 0 ? (
              <EmptyState
                title={t('dash.teacher.noStudents')}
                text={t('dash.teacher.noStudentsText', { cls: active, q })}
                action={
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQ('')}>
                    {t('common.clearSearch')}
                  </button>
                }
              />
            ) : (
              <div className="table-wrap table-scroll-y">
                <table className="table table-roster">
                  <thead>
                    <tr>
                      <th>{t('table.name')}</th>
                      <th>{t('table.grade')}</th>
                      <th>{t('table.attendance')}</th>
                      <th>{t('table.status')}</th>
                      <th className="right">{isToday ? t('dash.teacher.todayCol') : fmtDate(LAST_DAY, { weekday: 'short', day: 'numeric', month: 'short', cap: true })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const present = statusOf(s) !== 'absent';
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="person">
                              <Avatar name={s.name} />
                              <span className="person-text">
                                <span className="person-name">{s.name}</span>
                                <span className="person-sub mono">{s.id}</span>
                              </span>
                            </div>
                          </td>
                          <td className="num cell-strong">{s.isNew ? '—' : `${fmtDec(s.score)}%`}</td>
                          <td className="num">{fmtDec(s.attendance)}%</td>
                          <td>
                            <Status value={s.status} />
                          </td>
                          <td className="right">
                            <button
                              type="button"
                              className={`present-toggle ${present ? 'is-present' : 'is-absent'}`}
                              onClick={() => setDraft((d) => ({ ...d, [active]: { ...(d[active] || {}), [s.id]: present ? 'absent' : 'present' } }))}
                              aria-pressed={present}
                            >
                              {present ? <FiCheck aria-hidden="true" /> : null}
                              {present ? t('dash.teacher.present') : t('dash.teacher.absent')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h3>{t('dash.stats.assignments')}</h3>
              <Link to="/app/assignments" className="link-more">
                {t('common.viewAll')} <FiArrowRight />
              </Link>
            </div>
            <div className="panel-body">
              {subList.length === 0 && <p className="muted-note">{t('dash.teacher.noCreated')}</p>}
              <ul className="submission-list">
                {subList.map((s) => (
                  <li key={s.id}>
                    <div className="sub-top">
                      <strong>{tr(s.title)}</strong>
                      <span className="num">
                        {s.submitted}/{s.total}
                      </span>
                    </div>
                    <Bar value={Math.round((s.submitted / s.total) * 100)} tone={s.submitted === s.total ? '' : undefined} />
                    <span className="sub-meta">{t('dash.teacher.dueWhen', { cls: s.cls, when: lowerFirst(relativeDue(s.due)) })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{t('dash.teacher.attendanceTitle', { cls: active })}</h3>
                <p>{t('dash.teacher.attendanceSub')}</p>
              </div>
            </div>
            <div className="panel-body">
              <Bars data={week} x="day" y="present" yDomain={[0, Math.max(1, roster.length)]} names={{ present: t('dash.teacher.presentSeries') }} height={160} digits={0} />
            </div>
          </section>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('dash.teacher.distTitle', { cls: active })}</h3>
            <p>{t('dash.teacher.distSub')}</p>
          </div>
          <Link to="/app/analytics" className="link-more">
            {t('common.analytics')} <FiArrowRight />
          </Link>
        </div>
        <div className="panel-body">
          <Bars data={dist} x="band" y="count" names={{ count: t('dash.teacher.studentsSeries') }} height={200} digits={0} />
        </div>
      </section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={t('dash.teacher.modalTitle')}
        description={t('dash.teacher.modalDesc')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={publish}>
              {t('dash.teacher.publish')}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="na-title">
            {t('dash.teacher.fTitle')}
          </label>
          <input id="na-title" className="input" value={form.title} aria-invalid={!!formErr} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {formErr && <span className="field-error">{formErr}</span>}
        </div>
        <div className="form-row">
          <div className="field">
            <label className="label" htmlFor="na-class">
              {t('dash.teacher.fClass')}
            </label>
            <select id="na-class" className="input select-native" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
              {classes.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="na-due">
              {t('dash.teacher.fDue')}
            </label>
            <input id="na-due" className="input" type="date" value={form.due} min={isoDay(TODAY)} onChange={(e) => setForm({ ...form, due: e.target.value || isoDay(addDays(TODAY, 7)) })} />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="na-desc">
            {t('dash.teacher.fInstr')}
          </label>
          <textarea id="na-desc" className="textarea" value={form.instr} onChange={(e) => setForm({ ...form, instr: e.target.value })} />
          <span className="hint">{t('dash.teacher.fInstrHint')}</span>
        </div>
      </Modal>
    </div>
  );
}
