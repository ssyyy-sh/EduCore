import { FiArrowUpRight, FiArrowDownRight, FiMinus } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function GradeChip({ value, scale = 5 }) {
  const tone = value >= scale * 0.9 ? 'high' : value >= scale * 0.75 ? 'mid' : 'low';
  return <span className={`grade-chip grade-${tone} num`}>{value}</span>;
}

export function Change({ value }) {
  const { fmtDec } = useI18n();
  if (value === 0)
    return (
      <span className="change is-flat">
        <FiMinus aria-hidden="true" />
        <span className="num">{fmtDec(0)}</span>
      </span>
    );
  const up = value > 0;
  const I = up ? FiArrowUpRight : FiArrowDownRight;
  return (
    <span className={`change ${up ? 'is-up' : 'is-down'}`}>
      <I aria-hidden="true" />
      <span className="num">
        {up ? '+' : '−'}
        {fmtDec(Math.abs(value))}
      </span>
    </span>
  );
}

/** Recent grades list for dashboards. */
export default function RecentGrades({ items }) {
  const { t, tr, ts, fmtDate } = useI18n();
  if (!items.length) return <p className="muted-note">{t('common.noGradesYet')}</p>;
  return (
    <ul className="recent-grades">
      {items.map((g) => (
        <li key={g.id}>
          <div>
            <strong>{tr(g.work)}</strong>
            <span>
              {ts(g.subject)} · {fmtDate(g.date)}
            </span>
          </div>
          <GradeChip value={g.grade} />
        </li>
      ))}
    </ul>
  );
}
