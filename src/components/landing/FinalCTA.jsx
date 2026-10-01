import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function FinalCTA() {
  const { t } = useI18n();
  // With the server there are no shared demo accounts, so the button simply says "Sign in".
  const { remote } = useAuth();
  return (
    <section className="final-cta">
      <div className="container">
        <div className="final-cta-inner">
          <h2>{t('landing.cta.title')}</h2>
          <p>{t('landing.cta.text')}</p>
          <div className="final-cta-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              {t('landing.cta.start')}
              <FiArrowRight />
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              {t(remote ? 'landing.nav.signIn' : 'landing.cta.demo')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
