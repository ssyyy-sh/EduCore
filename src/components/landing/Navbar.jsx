import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FiMenu, FiX, FiArrowRight } from 'react-icons/fi';
import Logo from '../Logo.jsx';
import LangSwitch from '../LangSwitch.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/access.js';

const LINKS = [
  { href: '#platform', key: 'platform' },
  { href: '#students', key: 'students' },
  { href: '#parents', key: 'parents' },
  { href: '#schools', key: 'schools' },
  { href: '#features', key: 'features' },
  { href: '#pricing', key: 'pricing' },
];

export function scrollToId(e, href) {
  e.preventDefault();
  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Navbar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth > 960 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links" aria-label={t('landing.nav.main')}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => scrollToId(e, l.href)}>
              {t(`landing.nav.${l.key}`)}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <LangSwitch compact />
          {user ? (
            <Link to={homeFor(user.role)} className="btn btn-dark btn-sm">
              {t('landing.nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm nav-signin">
                {t('landing.nav.signIn')}
              </Link>
              <Link to="/register" className="btn btn-dark btn-sm nav-cta">
                {t('landing.nav.getStarted')}
              </Link>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-icon btn-sm nav-burger" aria-label={open ? t('nav.closeNav') : t('nav.openNav')} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
      {open &&
        createPortal(
          <div className="nav-mobile" role="dialog" aria-modal="true" aria-label={t('landing.nav.main')}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  setOpen(false);
                  scrollToId(e, l.href);
                }}
              >
                {t(`landing.nav.${l.key}`)}
                <FiArrowRight aria-hidden="true" />
              </a>
            ))}
            <div className="nav-mobile-actions">
              {user ? (
                <Link to={homeFor(user.role)} className="btn btn-primary btn-lg">
                  {t('landing.nav.dashboard')}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary btn-lg">
                    {t('landing.nav.signIn')}
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    {t('landing.nav.getStarted')}
                  </Link>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
