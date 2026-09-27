import { FiTrendingUp, FiCheckSquare, FiCalendar, FiAward, FiMessageSquare, FiBarChart2, FiGlobe, FiUsers } from 'react-icons/fi';
import FeatureCard from './FeatureCard.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const ICONS = [FiTrendingUp, FiCheckSquare, FiCalendar, FiAward, FiMessageSquare, FiBarChart2, FiGlobe, FiUsers];

export default function Features() {
  const { t } = useI18n();
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head section-head-split">
          <div>
            <p className="eyebrow">{t('landing.features.eyebrow')}</p>
            <h2>{t('landing.features.title')}</h2>
          </div>
          <p className="lead">{t('landing.features.lead')}</p>
        </div>
        <div className="features-grid">
          {t('landing.features.items').map((f, i) => (
            <FeatureCard key={f.title} icon={ICONS[i]} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
