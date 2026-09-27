import { Bar } from '../ui/index.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

/** Per-subject progress rows. */
export default function SubjectProgress({ items, compact }) {
  const { t, ts } = useI18n();
  return (
    <ul className={`subject-progress ${compact ? 'is-compact' : ''}`}>
      {items.map((s) => (
        <li key={s.subject}>
          <div className="sp-head">
            <span>{ts(s.subject)}</span>
            <span className="num">
              {s.value}%{!compact && s.total ? <em> · {t('progress.tasksOf', { done: s.done, total: s.total })}</em> : null}
            </span>
          </div>
          <Bar value={s.value} label={ts(s.subject)} />
        </li>
      ))}
    </ul>
  );
}
