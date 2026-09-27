import { useState } from 'react';
import { FiCheck, FiBellOff, FiSettings } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { NotificationIcon } from '../components/dashboard/Notifications.jsx';
import { Segmented, EmptyState } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useRelTime, isToday } from '../components/dashboard/useRelTime.js';

const TYPES = ['all', 'assignment', 'grade', 'schedule', 'announcement'];

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead, toast } = useApp();
  const { t, tr } = useI18n();
  const rel = useRelTime();
  const [type, setType] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = notifications.filter((n) => (type === 'all' || n.type === type) && (!unreadOnly || n.unread));
  const unread = notifications.filter((n) => n.unread).length;
  const groups = [
    { g: 'Today', items: list.filter((n) => isToday(n.at)) },
    { g: 'Earlier', items: list.filter((n) => !isToday(n.at)) },
  ].filter((x) => x.items.length);

  return (
    <div className="page page-narrow">
      <PageHeader
        title={t('notifications.title')}
        description={unread ? t('notifications.unread', { count: unread }) : t('notifications.caughtUp')}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!unread}
              onClick={() => {
                markAllNotificationsRead();
                toast(t('notifications.markedAll'));
              }}
            >
              <FiCheck /> {t('notifications.markAll')}
            </button>
            <Link to="/app/settings?section=notifications" className="btn btn-ghost btn-icon" aria-label={t('notifications.settings')} title={t('notifications.settings')}>
              <FiSettings />
            </Link>
          </>
        }
      />
      <div className="filters-row">
        <Segmented label={t('notifications.type')} value={type} onChange={setType} options={TYPES.map((k) => ({ value: k, label: t(`notifications.types.${k}`) }))} />
        <label className="inline-toggle">
          <input type="checkbox" className="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          {t('notifications.unreadOnly')}
        </label>
      </div>

      <section className="panel">
        {groups.length === 0 ? (
          <EmptyState icon={FiBellOff} title={t('notifications.empty')} text={t('notifications.emptyText')} />
        ) : (
          groups.map(({ g, items }) => (
            <div key={g} className="notif-group">
              <h3 className="notif-group-title">{t(`notifications.groups.${g}`)}</h3>
              <ul className="notif-full">
                {items.map((n) => (
                  <li key={n.id} className={n.unread ? 'is-unread' : ''}>
                    <NotificationIcon type={n.type} />
                    <div className="notif-full-main">
                      <strong>{tr(n.title)}</strong>
                      <p>{tr(n.text)}</p>
                      <span>{rel(n.at)}</span>
                    </div>
                    {n.unread ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => markNotificationRead(n.id)}>
                        {t('notifications.markRead')}
                      </button>
                    ) : (
                      <span className="notif-read">{t('notifications.read')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
