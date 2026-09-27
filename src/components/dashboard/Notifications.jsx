import { FiCheckSquare, FiAward, FiCalendar, FiVolume2, FiMessageSquare, FiUserCheck, FiBell, FiStar } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useRelTime } from './useRelTime.js';

const MAP = {
  assignment: { icon: FiCheckSquare, tone: 'accent' },
  grade: { icon: FiAward, tone: 'success' },
  schedule: { icon: FiCalendar, tone: 'warning' },
  announcement: { icon: FiVolume2, tone: 'info' },
  message: { icon: FiMessageSquare, tone: 'neutral' },
  attendance: { icon: FiUserCheck, tone: 'neutral' },
  behavior: { icon: FiStar, tone: 'success' },
};

export function NotificationIcon({ type }) {
  const cfg = MAP[type] ?? { icon: FiBell, tone: 'neutral' };
  return (
    <span className={`notif-icon tone-${cfg.tone}`} aria-hidden="true">
      <cfg.icon />
    </span>
  );
}

/** Compact list of notifications, used on dashboards. */
export default function NotificationsList({ items, onItem }) {
  const { tr } = useI18n();
  const rel = useRelTime();
  return (
    <ul className="notif-list">
      {items.map((n) => (
        <li key={n.id} className={n.unread ? 'is-unread' : ''}>
          <button type="button" onClick={() => onItem?.(n)}>
            <NotificationIcon type={n.type} />
            <div>
              <strong>{tr(n.title)}</strong>
              <p>{tr(n.text)}</p>
            </div>
            <span className="notif-time">{rel(n.at)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
