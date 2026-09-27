import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiSun, FiMoon, FiMonitor, FiSettings, FiLogOut, FiHome, FiChevronRight, FiBookOpen, FiUser, FiUsers, FiBriefcase, FiKey, FiChevronDown, FiCheck } from 'react-icons/fi';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { Avatar, SearchInput, Popover } from '../ui/index.jsx';
import LangSwitch from '../LangSwitch.jsx';
import { PAGE_KEYS } from './nav.js';
import { ORG } from '../../data/mock.js';
import { NotificationIcon } from './Notifications.jsx';
import { useRelTime } from './useRelTime.js';

const ROLE_ICONS = { student: FiBookOpen, parent: FiUser, teacher: FiUsers, school: FiBriefcase };

/** Owner: switch which role's view is shown. */
function ViewAsSwitch() {
  const { role, setViewAs } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Popover
      role="menu"
      label={t('header.viewAs')}
      style={{ minWidth: 220 }}
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="role-badge role-badge-owner" aria-haspopup="menu" aria-expanded={open} onClick={toggle} title={t('header.viewAs')}>
          <FiKey aria-hidden="true" />
          <span className="role-badge-label">
            {t('roles.owner')} · {t(`roles.${role}`)}
          </span>
          <FiChevronDown aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="user-menu-head">
            <em>{t('header.viewAs')}</em>
          </div>
          {['student', 'parent', 'teacher', 'school'].map((r) => {
            const I = ROLE_ICONS[r];
            return (
              <button
                key={r}
                type="button"
                role="menuitemradio"
                aria-checked={role === r}
                className={`dropdown-item ${role === r ? 'is-selected' : ''}`}
                onClick={() => {
                  close();
                  setViewAs(r);
                  navigate(`/app/${r}`);
                }}
              >
                <I /> {t(`roles.${r}`)}
                {role === r && <FiCheck className="check" />}
              </button>
            );
          })}
          <div className="dropdown-sep" />
          <Link to="/app/owner" className="dropdown-item" role="menuitem" onClick={close}>
            <FiKey /> {t('nav.owner')}
          </Link>
        </>
      )}
    </Popover>
  );
}

function RoleBadge() {
  const { role, isOwner } = useApp();
  const { t } = useI18n();
  if (isOwner) return <ViewAsSwitch />;
  const Icon = ROLE_ICONS[role];
  return (
    <span className="role-badge" title={t(`roles.${role}`)}>
      <Icon aria-hidden="true" />
      <span className="role-badge-label">{t(`roles.${role}`)}</span>
    </span>
  );
}

function NotificationBell() {
  const { notifications, markNotificationRead } = useApp();
  const { t, tr } = useI18n();
  const rel = useRelTime();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => n.unread);
  return (
    <Popover
      className="notif-pop"
      label={t('header.notifications')}
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="btn btn-ghost btn-icon header-icon" aria-label={t('header.notificationsUnread', { n: unread.length })} aria-expanded={open} onClick={toggle}>
          <FiBell />
          {unread.length > 0 && <span className="header-dot" />}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="notif-pop-head">
            <strong>{t('header.notifications')}</strong>
            {unread.length > 0 && <span className="badge">{t('header.newCount', { n: unread.length })}</span>}
          </div>
          {notifications.slice(0, 4).map((n) => (
            <button
              type="button"
              key={n.id}
              className={`notif-pop-item ${n.unread ? 'is-unread' : ''}`}
              onClick={() => {
                markNotificationRead(n.id);
                close();
                navigate('/app/notifications');
              }}
            >
              <NotificationIcon type={n.type} />
              <div>
                <strong>{tr(n.title)}</strong>
                <p>{tr(n.text)}</p>
                <span>{rel(n.at)}</span>
              </div>
            </button>
          ))}
          <Link to="/app/notifications" className="notif-pop-foot" onClick={close}>
            {t('header.viewAllNotifications')} <FiChevronRight />
          </Link>
        </>
      )}
    </Popover>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useApp();
  const { t } = useI18n();
  const next = { system: 'light', light: 'dark', dark: 'system' };
  const Icon = theme === 'dark' ? FiMoon : theme === 'light' ? FiSun : FiMonitor;
  const label = t('header.themeLabel', { theme: t(`theme.${theme}`), next: t(`theme.${next[theme]}`) });
  return (
    <button type="button" className="btn btn-ghost btn-icon header-icon" onClick={() => setTheme(next[theme])} aria-label={label} title={label}>
      <Icon />
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Popover
      role="menu"
      label={t('header.account')}
      style={{ minWidth: 240 }}
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="user-trigger" aria-label={t('header.account')} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          <Avatar name={user.name} size={30} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="user-menu-head">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <em>{t(`roles.${user.role}`)}</em>
          </div>
          <div className="dropdown-sep" />
          <Link to="/app/settings" className="dropdown-item" role="menuitem" onClick={close}>
            <FiSettings /> {t('nav.settings')}
          </Link>
          <Link to="/" className="dropdown-item" role="menuitem" onClick={close}>
            <FiHome /> {t('header.backToWebsite')}
          </Link>
          <div className="dropdown-sep" />
          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            onClick={() => {
              close();
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <FiLogOut /> {t('header.signOut')}
          </button>
        </>
      )}
    </Popover>
  );
}

export default function DashboardHeader({ onOpenMobile }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role } = useApp();
  const { user } = useAuth();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const seg = pathname.split('/')[2] || role;
  const title = t(`nav.${PAGE_KEYS[seg] ?? 'overview'}`);
  const canSearchStudents = role === 'school' || role === 'teacher';

  return (
    <header className="app-header">
      <button type="button" className="btn btn-ghost btn-icon mobile-only" onClick={onOpenMobile} aria-label={t('nav.openNav')}>
        <FiMenu />
      </button>
      <div className="crumbs">
        <span className="crumb-org">{user?.org || ORG.name}</span>
        <FiChevronRight aria-hidden="true" />
        <span className="crumb-page">{title}</span>
      </div>
      <form
        className="header-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const target = canSearchStudents ? '/app/students' : '/app/assignments';
          navigate(`${target}?q=${encodeURIComponent(q.trim())}`);
          setQ('');
        }}
      >
        <SearchInput value={q} onChange={setQ} placeholder={canSearchStudents ? t('header.searchStudents') : t('header.searchAssignments')} shortcut id="global-search" />
      </form>
      <div className="header-actions">
        <RoleBadge />
        <LangSwitch compact />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
