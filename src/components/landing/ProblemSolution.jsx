import { FiLayers, FiEyeOff, FiClock, FiUsers, FiGrid, FiCheck } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

const ICONS = [FiLayers, FiEyeOff, FiClock, FiUsers, FiGrid];

export default function ProblemSolution() {
  const { t } = useI18n();
  return (
    <section className="section ps">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">{t('landing.problem.eyebrow')}</p>
          <h2>{t('landing.problem.title')}</h2>
        </div>
        <ul className="ps-list">
          {t('landing.problem.items').map((p, i) => {
            const Icon = ICONS[i];
            return (
              <li key={p.title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="ps-solution">
          <div>
            <p className="eyebrow eyebrow-accent">{t('landing.problem.solutionEyebrow')}</p>
            <h2>{t('landing.problem.solutionTitle')}</h2>
            <p className="lead">{t('landing.problem.solutionText')}</p>
          </div>
          <ul className="ps-checks">
            {t('landing.problem.checks').map((s) => (
              <li key={s}>
                <span aria-hidden="true">
                  <FiCheck />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
