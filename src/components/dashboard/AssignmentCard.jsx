import { FiCheckCircle, FiClock, FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

const ICONS = { Completed: FiCheckCircle, Pending: FiClock, Overdue: FiAlertCircle };

/** Compact row used in dashboards' "Upcoming assignments" lists. */
export default function AssignmentCard({ a, onClick }) {
  const { t, tr, ts, relativeDue, tStatus } = useI18n();
  const Icon = ICONS[a.status];
  return (
    <button type="button" className={`assign-row is-${a.status.toLowerCase()}`} onClick={onClick}>
      <Icon className="assign-icon" aria-label={tStatus(a.status)} />
      <div className="assign-main">
        <span className="assign-title">{tr(a.title)}</span>
        <span className="assign-meta">
          {ts(a.subject)} · {a.teacher}
        </span>
      </div>
      <span className="assign-due">{a.status === 'Completed' ? t('dash.student.submitted') : relativeDue(a.due)}</span>
      <FiChevronRight className="assign-chev" aria-hidden="true" />
    </button>
  );
}
