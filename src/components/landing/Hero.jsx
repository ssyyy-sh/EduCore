import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import DashboardPreview from './DashboardPreview.jsx';
import AnchorLink from './AnchorLink.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function Hero() {
  const { t } = useI18n();
  const roles = [t('roles.student'), t('roles.parent'), t('roles.teacher'), t('roles.schoolShort')];
  return (
    <section className="hero" id="platform">
      <div className="container hero-grid">
        <div className="hero-copy">
          <AnchorLink href="#features" className="hero-badge">
            <span className="badge badge-accent">EN · RU · UZ</span>
            {t('landing.hero.badge')}
            <FiArrowRight aria-hidden="true" />
          </AnchorLink>
          <h1>{t('landing.hero.title')}</h1>
          <p className="hero-sub">{t('landing.hero.sub')}</p>
          <div className="hero-ctas">
            <Link to="/login" className="btn btn-primary btn-lg">
              {t('landing.hero.try')}
              <FiArrowRight />
            </Link>
            <AnchorLink href="#schools" className="btn btn-secondary btn-lg">
              {t('landing.hero.forSchools')}
            </AnchorLink>
          </div>
          <ul className="hero-points">
            {t('landing.hero.points').map((p) => (
              <li key={p}>
                <FiCheck aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-visual">
          <DashboardPreview variant="school" />
          <div className="hero-roles" aria-label={t('landing.hero.rolesLabel')}>
            {roles.map((r, i) => (
              <span key={r} style={{ animationDelay: `${300 + i * 80}ms` }}>
                <i aria-hidden="true" />
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
