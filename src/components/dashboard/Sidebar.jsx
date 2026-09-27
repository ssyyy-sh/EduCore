import { NavLink, Link } from 'react-router-dom';
import { FiChevronsLeft, FiChevronsRight, FiX } from 'react-icons/fi';
import { LogoMark } from '../Logo.jsx';
import { NAV, SETTINGS_ITEM, OWNER_ITEM } from './nav.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { Avatar } from '../ui/index.jsx';
import { ORG } from '../../data/mock.js';
import { useRoleMeta } from './useRoleMeta.js';

function Item({ it, collapsed, onNavigate, count }) {
  const { t } = useI18n();
  const label = t(`nav.${it.key}`);
  return (
    <li>
      <NavLink to={it.to} end className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`} onClick={onNavigate} title={collapsed ? label : undefined}>
        <it.icon aria-hidden="true" />
        <span className="side-label">{label}</span>
        {count ? <span className="side-count num">{count}</span> : null}
      </NavLink>
    </li>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { role, isOwner, notifications, chatUnread, students } = useApp();
  const { user } = useAuth();
  const { t, fmtNum } = useI18n();
  const meta = useRoleMeta();
  const nav = NAV[role];
  const counts = {
    notifications: notifications.filter((n) => n.unread).length,
    messages: chatUnread,
  };
  const used = students.length;

  return (
    <>
      {mobileOpen && <div className="side-backdrop" onClick={onCloseMobile} aria-hidden="true" />}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Sidebar">
        <div className="side-top">
          <Link to="/" className="side-brand" aria-label={t('nav.home')}>
            <LogoMark size={24} />
            <span className="side-label">
              <strong>EduCore</strong>
              <em>{user?.org || ORG.name}</em>
            </span>
          </Link>
          <button type="button" className="btn btn-ghost btn-icon btn-sm side-close" onClick={onCloseMobile} aria-label={t('nav.closeNav')}>
            <FiX />
          </button>
        </div>

        <nav className="side-nav">
          {isOwner && (
            <>
              <p className="side-section side-label">{t('nav.ownerSection')}</p>
              <ul>
                <Item it={OWNER_ITEM} collapsed={collapsed} onNavigate={onCloseMobile} />
              </ul>
            </>
          )}
          <p className="side-section side-label">{isOwner ? t('nav.viewingAs', { role: t(`roles.${role}`) }) : t('nav.workspace')}</p>
          <ul>
            {nav.main.map((it) => (
              <Item key={it.key} it={it} collapsed={collapsed} onNavigate={onCloseMobile} />
            ))}
          </ul>
          <p className="side-section side-label">{t('nav.communication')}</p>
          <ul>
            {nav.comms.map((it) => (
              <Item key={it.key} it={it} collapsed={collapsed} onNavigate={onCloseMobile} count={counts[it.key]} />
            ))}
          </ul>
        </nav>

        <div className="side-bottom">
          <ul>
            <Item it={SETTINGS_ITEM} collapsed={collapsed} onNavigate={onCloseMobile} />
          </ul>
          {role === 'school' && (
            <div className="side-plan side-label">
              <div>
                <strong>{t('nav.schoolPlan')}</strong>
              </div>
              <span className="num">{t('nav.seats', { used: fmtNum(used), total: fmtNum(ORG.capacity) })}</span>
              <div className={`bar ${used / ORG.capacity > 0.95 ? 'tone-warning' : ''}`} role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={ORG.capacity}>
                <span style={{ width: `${Math.min(100, (used / ORG.capacity) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="side-user">
            <Avatar name={user?.name || ''} size={30} />
            <div className="side-label">
              <strong>{user?.name}</strong>
              <span>{meta}</span>
            </div>
          </div>
          <button type="button" className="side-collapse" onClick={onToggle} aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}>
            {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            <span className="side-label">{t('nav.collapse')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
