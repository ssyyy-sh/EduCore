import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function FinalCTA() {
  const { t } = useI18n();
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
              {t('landing.cta.demo')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
