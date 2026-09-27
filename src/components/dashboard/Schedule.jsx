import { FiMapPin, FiUser, FiClock } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

export const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function lessonState(l, isToday) {
  if (!isToday) return '';
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= toMin(l.start) && mins < toMin(l.end)) return 'is-now';
  if (mins >= toMin(l.end)) return 'is-past';
  return '';
}

/** Vertical list of lessons for one day (dashboards). */
export function DaySchedule({ lessons, isToday }) {
  const { t, tr, ts } = useI18n();
  return (
    <ol className="day-list">
      {lessons.map((l) => {
        const st = lessonState(l, isToday);
        return (
          <li key={l.start} className={st}>
            <span className="day-time num">
              {l.start}
              <em>{l.end}</em>
            </span>
            <div className="day-body">
              <strong>
                {ts(l.subject)}
                {st === 'is-now' && <span className="now-pill">{t('common.now')}</span>}
              </strong>
              <span>
                <span className="meta-item">
                  <FiUser aria-hidden="true" /> {l.teacher}
                </span>
                <span className="meta-item">
                  <FiMapPin aria-hidden="true" /> {tr(l.room)}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Lesson block for the weekly calendar grid. */
export function LessonBlock({ l, subjectTone, active }) {
  const { tr, ts } = useI18n();
  return (
    <div className={`lesson tone-${subjectTone} ${active ? 'is-now' : ''}`}>
      <strong>{ts(l.subject)}</strong>
      <span>
        <FiClock aria-hidden="true" />
        <em className="num">
          {l.start}–{l.end}
        </em>
      </span>
      <span>
        <FiUser aria-hidden="true" />
        {l.teacher}
      </span>
      <span>
        <FiMapPin aria-hidden="true" />
        {tr(l.room)}
      </span>
    </div>
  );
}
