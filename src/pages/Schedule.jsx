import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiList, FiGrid } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { LessonBlock, DaySchedule, toMin } from '../components/dashboard/Schedule.jsx';
import { Segmented } from '../components/ui/index.jsx';
import { SCHEDULE, WEEKDAYS, TODAY, addDays, todayKey } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadICS } from '../lib/download.js';

const SUBJECT_TONE = {
  Mathematics: 1,
  'Computer Science': 1,
  'English Literature': 2,
  French: 2,
  Physics: 3,
  Chemistry: 3,
  Biology: 3,
  History: 4,
  Geography: 4,
  Economics: 4,
  'Art & Design': 5,
  Music: 5,
  'Physical Education': 5,
};
const SLOTS = ['08:30', '09:25', '10:30', '11:25', '13:00', '13:55'];

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

export default function Schedule() {
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('week');
  const [day, setDay] = useState(todayKey().day);
  const { toast } = useApp();
  const { t, tr, ts, tw, fmtDate } = useI18n();
  const monday = addDays(mondayOf(TODAY), offset * 7);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayIdx = WEEKDAYS.findIndex((_, i) => addDays(monday, i).getTime() === TODAY.getTime());
  const lessonsCount = WEEKDAYS.reduce((a, d) => a + SCHEDULE[d].length, 0);
  const dayIdx = WEEKDAYS.indexOf(day);

  const exportICS = () => {
    const events = WEEKDAYS.flatMap((d, i) =>
      SCHEDULE[d].map((l) => {
        const date = addDays(monday, i);
        return { title: ts(l.subject), start: at(date, l.start), end: at(date, l.end), location: tr(l.room), description: l.teacher };
      })
    );
    if (downloadICS(`educore-schedule-${monday.toISOString().slice(0, 10)}.ics`, events)) toast(t('schedule.synced'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.sub', { n: lessonsCount })}
        actions={
          <button type="button" className="btn btn-secondary" onClick={exportICS}>
            <FiDownload /> {t('schedule.sync')}
          </button>
        }
      />

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
        <Segmented
          label={t('schedule.view')}
          value={view}
          onChange={setView}
          options={[
            { value: 'week', label: t('schedule.week'), icon: FiGrid },
            { value: 'day', label: t('schedule.day'), icon: FiList },
          ]}
        />
      </div>

      {view === 'week' ? (
        <section className="panel week-panel">
          <div className="week-scroll">
            <div className="week-grid">
              <div className="week-corner" />
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`week-day ${i === todayIdx ? 'is-today' : ''}`}>
                  <span>{tw(d)}</span>
                  <em className="num">{fmtDate(addDays(monday, i), { day: 'numeric', month: 'short' })}</em>
                </div>
              ))}
              {SLOTS.map((slot, si) => (
                <div className="week-row" key={slot}>
                  <div className={`week-time num ${si === 4 ? 'after-lunch' : ''}`}>{slot}</div>
                  {WEEKDAYS.map((d, di) => {
                    const l = SCHEDULE[d].find((x) => x.start === slot);
                    const active = l && di === todayIdx && nowMin >= toMin(l.start) && nowMin < toMin(l.end);
                    return (
                      <div key={d + slot} className={`week-cell ${si === 4 ? 'after-lunch' : ''}`}>
                        {l ? <LessonBlock l={l} subjectTone={SUBJECT_TONE[l.subject] ?? 5} active={active} /> : <span className="free">{t('common.free')}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="panel-foot">
            <span>{t('schedule.breaks')}</span>
            <span>{t('schedule.changes')}</span>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <Segmented label={t('schedule.day')} value={day} onChange={setDay} options={WEEKDAYS.map((d) => ({ value: d, label: t(`weekdaysShort.${d}`) }))} />
            <span className="t-muted num">{fmtDate(addDays(monday, dayIdx), { weekday: 'long', day: 'numeric', month: 'long', cap: true })}</span>
          </div>
          <div className="panel-body">
            <DaySchedule lessons={SCHEDULE[day]} isToday={dayIdx === todayIdx} />
          </div>
        </section>
      )}
    </div>
  );
}
