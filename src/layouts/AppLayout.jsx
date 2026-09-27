import { useEffect, useState } from 'react';
import { Outlet, useLocation, NavLink, Link } from 'react-router-dom';
import { FiMoreHorizontal, FiLock } from 'react-icons/fi';
import Sidebar from '../components/dashboard/Sidebar.jsx';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import { NAV } from '../components/dashboard/nav.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { canAccess, homeFor, ACCESS, viewRoleFor } from '../lib/access.js';
import { EmptyState } from '../components/ui/index.jsx';
import { readJSON, writeJSON } from '../lib/storage.js';

function MobileTabBar({ onMore }) {
  const { role } = useApp();
  const { t } = useI18n();
  const items = [...NAV[role].main.slice(0, 3), NAV[role].comms.find((c) => c.key === 'messages')];
  return (
    <nav className="tabbar" aria-label={t('nav.mobileNav')}>
      {items.map((it) => (
        <NavLink key={it.key} to={it.to} end className={({ isActive }) => `tabbar-item ${isActive ? 'is-active' : ''}`}>
          <it.icon aria-hidden="true" />
          <span>{t(`nav.${it.key}`)}</span>
        </NavLink>
      ))}
      <button type="button" className="tabbar-item" onClick={onMore}>
        <FiMoreHorizontal aria-hidden="true" />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  );
}

function NoAccess({ role }) {
  const { t } = useI18n();
  return (
    <div className="page">
      <section className="panel">
        <EmptyState
          icon={FiLock}
          title={t('noAccess.title')}
          text={t('noAccess.text')}
          action={
            <Link to={homeFor(role)} className="btn btn-primary btn-sm">
              {t('noAccess.back')}
            </Link>
          }
        />
      </section>
    </div>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const { role, isOwner, setViewAs, ready } = useApp();
  const [collapsed, setCollapsed] = useState(() => readJSON('educore.sidebar', false) === true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      writeJSON('educore.sidebar', !c);
      return !c;
    });

  const page = pathname.split('/')[2] || '';
  const known = page in ACCESS;
  const allowed = !known || canAccess(isOwner ? 'owner' : role, page);
  // Owner: switch "view as" to a role that owns this page (e.g. /app/staff → school admin).
  const wanted = isOwner && known && page !== 'owner' ? viewRoleFor(page, role) : role;
  useEffect(() => {
    if (wanted !== role) setViewAs(wanted);
  }, [wanted, role, setViewAs]);

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="app-main">
        <DashboardHeader onOpenMobile={() => setMobileOpen(true)} />
        <main className="app-content" key={pathname}>
          {!ready ? (
            <div className="content-loader" role="status">
              <span className="spinner" />
            </div>
          ) : !allowed ? (
            <NoAccess role={role} />
          ) : wanted !== role ? null : (
            <Outlet />
          )}
        </main>
      </div>
      <MobileTabBar onMore={() => setMobileOpen(true)} />
    </div>
  );
}
