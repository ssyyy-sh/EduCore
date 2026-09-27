import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiX, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Bars } from '../components/dashboard/Analytics.jsx';
import { Avatar, Select, Segmented, EmptyState, SearchInput } from '../components/ui/index.jsx';
import { TEACHER_CLASSES, CLASSES, GRADE_LEVELS, CHILDREN, schoolDays, isoDay } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

const STATUSES = ['present', 'late', 'absent'];
const ICON = { present: FiCheck, late: FiClock, absent: FiX };
const DAYS = schoolDays(40); // newest first

/* ---------- Teacher / admin: mark and review a class ---------- */
function StaffAttendance() {
  const { role, students, getAttendance, saveAttendanceDay, toast } = useApp();
  const { t, fmtDate, fmtPct } = useI18n();
  const isTeacher = role === 'teacher';
  const [cls, setCls] = useState(isTeacher ? TEACHER_CLASSES[0].name : '9-A');
  const [year, setYear] = useState('9');
  const [dayIdx, setDayIdx] = useState(0);
  const [draft, setDraft] = useState({});
  const [q, setQ] = useState('');
  const day = DAYS[dayIdx];
  const iso = day ? isoDay(day) : '';

  useEffect(() => setDraft({}), [cls, iso]);

  const roster = useMemo(() => students.filter((s) => s.className === cls && s.status !== 'Inactive').sort((a, b) => a.name.localeCompare(b.name)), [students, cls]);
  const statusOf = (s) => draft[s.id] ?? getAttendance(s, iso);
  const counts = STATUSES.reduce((acc, st) => ({ ...acc, [st]: roster.filter((s) => statusOf(s) === st).length }), {});
  const dirty = Object.keys(draft).length > 0;

  const history = DAYS.slice(0, 20)
    .reverse()
    .map((d) => {
      const di = isoDay(d);
      const present = roster.filter((s) => getAttendance(s, di) !== 'absent').length;
      return { label: fmtDate(d, { day: 'numeric', month: 'short' }), pct: roster.length ? Math.round((present / roster.length) * 1000) / 10 : 0 };
    });
  const monthAvg = history.length ? history.reduce((a, h) => a + h.pct, 0) / history.length : 0;

  const save = () => {
    saveAttendanceDay(iso, cls, draft);
    setDraft({});
    toast(t('attendance.saved', { cls, date: fmtDate(day, { day: 'numeric', month: 'long' }) }));
  };

  const exportCSV = () => {
    const days = DAYS.slice(0, 20).reverse();
    const ok = downloadCSV(`educore-attendance-${cls}.csv`, [
      [t('table.name'), 'ID', ...days.map((d) => isoDay(d))],
      ...roster.map((s) => [s.name, s.id, ...days.map((d) => t(`attendance.short.${getAttendance(s, isoDay(d))}`))]),
    ]);
    if (ok) toast(t('attendance.exported'));
  };

  const classOptions = isTeacher ? TEACHER_CLASSES.map((c) => ({ value: c.name, label: c.name })) : CLASSES.filter((c) => String(c.grade) === String(year)).map((c) => ({ value: c.name, label: c.name }));
  const rows = roster.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="page">
      <PageHeader
        title={t('attendance.title')}
        description={t('attendance.subStaff')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCSV}>
              <FiDownload /> {t('common.exportCsv')}
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>
              <FiCheck /> {t('attendance.save')}
            </button>
          </>
        }
      />

      <div className="filters-row">
        <div className="filters-row-right">
          {isTeacher ? (
            <Segmented label={t('table.class')} value={cls} onChange={setCls} options={classOptions} />
          ) : (
            <>
              <Select
                label={t('table.fGrade')}
                value={year}
                options={GRADE_LEVELS.map((g) => ({ value: String(g), label: t('common.yearGroup', { n: g }) }))}
                onChange={(v) => {
                  setYear(v);
                  setCls(`${v}-A`);
                }}
              />
              <Select label={t('table.class')} value={cls} options={classOptions} onChange={setCls} />
            </>
          )}
        </div>
        <div className="week-nav">
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setDayIdx((i) => Math.min(DAYS.length - 1, i + 1))} disabled={dayIdx >= DAYS.length - 1} aria-label={t('attendance.prevDay')}>
            <FiChevronLeft />
          </button>
          <strong className="num">{day ? fmtDate(day, { weekday: 'short', day: 'numeric', month: 'long', cap: true }) : '—'}</strong>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setDayIdx((i) => Math.max(0, i - 1))} disabled={dayIdx === 0} aria-label={t('attendance.nextDay')}>
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard label={t('attendance.present')} value={counts.present} hint={t('attendance.ofN', { n: roster.length })} />
        <StatsCard label={t('attendance.late')} value={counts.late} />
        <StatsCard label={t('attendance.absent')} value={counts.absent} />
        <StatsCard label={t('attendance.avg20')} value={fmtPct(monthAvg)} hint={t('attendance.last20')} />
      </div>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('attendance.classDay', { cls })}</h3>
              <p>{dirty ? t('attendance.unsaved') : t('attendance.hint')}</p>
            </div>
            <div className="panel-head-actions">
              <SearchInput value={q} onChange={setQ} placeholder={t('dash.teacher.searchClass')} id="att-search" style={{ width: 200 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(Object.fromEntries(roster.map((s) => [s.id, 'present'])))}>
                {t('attendance.allPresent')}
              </button>
            </div>
          </div>
          <div className="panel-body flush">
            {rows.length === 0 ? (
              <EmptyState title={t('dash.teacher.noStudents')} />
            ) : (
              <div className="table-wrap table-scroll-y">
                <table className="table att-table">
                  <tbody>
                    {rows.map((s) => {
                      const st = statusOf(s);
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
                          <td className="right">
                            <div className="att-toggle" role="radiogroup" aria-label={s.name}>
                              {STATUSES.map((opt) => {
                                const I = ICON[opt];
                                return (
                                  <button key={opt} type="button" role="radio" aria-checked={st === opt} className={`att-opt is-${opt} ${st === opt ? 'is-on' : ''}`} onClick={() => setDraft((d) => ({ ...d, [s.id]: opt }))}>
                                    <I aria-hidden="true" />
                                    <span>{t(`attendance.${opt}`)}</span>
                                  </button>
                                );
                              })}
                            </div>
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
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('attendance.trend')}</h3>
              <p>{t('attendance.trendSub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <Bars data={history} x="label" y="pct" yDomain={[60, 100]} unit="%" names={{ pct: t('attendance.present') }} height={260} highlightLast interval={4} />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Student / parent: calendar of one child ---------- */
function FamilyAttendance() {
  const { role, students, getAttendance } = useApp();
  const { t, fmtDate, fmtPct } = useI18n();
  const [childId, setChildId] = useState('alex');
  const child = CHILDREN.find((c) => c.id === (role === 'student' ? 'alex' : childId));
  const student = students.find((s) => s.id === child.studentId);
  const days = [...DAYS].reverse();
  const records = days.map((d) => ({ date: d, status: getAttendance(student, isoDay(d)) }));
  const count = (st) => records.filter((r) => r.status === st).length;
  const rate = records.length ? ((records.length - count('absent')) / records.length) * 100 : 100;
  const missed = records.filter((r) => r.status !== 'present').reverse();

  // Calendar grid: weeks (Mon–Fri) since the start of term
  const weeks = [];
  for (const r of records) {
    const wd = r.date.getDay(); // 1..5
    if (wd === 1 || weeks.length === 0) weeks.push(Array(5).fill(null));
    weeks[weeks.length - 1][wd - 1] = r;
  }

  return (
    <div className="page">
      <PageHeader title={t('attendance.title')} description={t('attendance.subFamily', { name: child.full, cls: child.className })} />
      {role === 'parent' && (
        <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={CHILDREN.map((c) => ({ value: c.id, label: `${c.name} · ${c.className}` }))} />
      )}
      <div className="stats-grid">
        <StatsCard label={t('attendance.rate')} value={fmtPct(rate)} hint={t('attendance.sinceStart')} />
        <StatsCard label={t('attendance.present')} value={count('present')} hint={t('attendance.ofDays', { n: records.length })} />
        <StatsCard label={t('attendance.late')} value={count('late')} />
        <StatsCard label={t('attendance.absent')} value={count('absent')} />
      </div>
      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('attendance.calendar')}</h3>
              <p>{t('attendance.calendarSub')}</p>
            </div>
            <div className="legend">
              {STATUSES.map((st) => (
                <span key={st}>
                  <i className={`cal-dot is-${st}`} />
                  {t(`attendance.${st}`)}
                </span>
              ))}
            </div>
          </div>
          <div className="panel-body">
            <div className="cal">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                <div key={d} className="cal-head">
                  {t(`weekdaysShort.${d}`)}
                </div>
              ))}
              {weeks.flat().map((r, i) =>
                r ? (
                  <div key={i} className={`cal-day is-${r.status}`} title={`${fmtDate(r.date, { day: 'numeric', month: 'long' })} · ${t(`attendance.${r.status}`)}`}>
                    <span className="num">{r.date.getDate()}</span>
                    <em>{fmtDate(r.date, { month: 'short' })}</em>
                  </div>
                ) : (
                  <div key={i} className="cal-day is-empty" aria-hidden="true" />
                )
              )}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('attendance.missed')}</h3>
          </div>
          <div className="panel-body">
            {missed.length === 0 ? (
              <p className="muted-note">{t('attendance.noMissed')}</p>
            ) : (
              <ul className="mini-list">
                {missed.map((r) => (
                  <li key={isoDay(r.date)}>
                    <span>{fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long', cap: true })}</span>
                    <em className={r.status === 'absent' ? 't-danger' : 't-warning'}>{t(`attendance.${r.status}`)}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { role } = useApp();
  return role === 'teacher' || role === 'school' ? <StaffAttendance /> : <FamilyAttendance />;
}
