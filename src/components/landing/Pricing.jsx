import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
import { Segmented } from '../ui/index.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const MONTHLY = [0, 6, 3.5, null];

export default function Pricing() {
  const { t, fmtNum } = useI18n();
  const [cycle, setCycle] = useState('yearly');
  const plans = t('landing.pricing.plans');
  const price = (monthly) => {
    if (monthly === null) return t('landing.pricing.custom');
    if (monthly === 0) return '$0';
    const v = cycle === 'yearly' ? monthly * 0.8 : monthly;
    return `$${fmtNum(v, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  };
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-head section-head-center">
          <p className="eyebrow">{t('landing.pricing.eyebrow')}</p>
          <h2>{t('landing.pricing.title')}</h2>
          <Segmented
            label={t('landing.pricing.cycle')}
            value={cycle}
            onChange={setCycle}
            options={[
              { value: 'monthly', label: t('landing.pricing.monthly') },
              { value: 'yearly', label: t('landing.pricing.yearly') },
            ]}
          />
        </div>
        <div className="pricing-grid">
          {plans.map((p, i) => {
            const featured = i === 2;
            const org = i >= 2;
            return (
              <article key={p.name} className={`plan ${featured ? 'is-featured' : ''} ${org ? 'is-org' : ''}`}>
                <div className="plan-head">
                  <h3>{p.name}</h3>
                  {featured && <span className="badge badge-accent">{t('landing.pricing.popular')}</span>}
                </div>
                <p className="plan-desc">{p.desc}</p>
                <div className="plan-price">
                  <strong className={`num ${MONTHLY[i] === null ? 'is-text' : ''}`}>{price(MONTHLY[i])}</strong>
                  <span>{p.unit}</span>
                </div>
                <Link to="/register" className={`btn ${featured ? 'btn-primary' : 'btn-secondary'}`}>
                  {p.cta}
                  <FiArrowRight />
                </Link>
                <ul className="plan-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <FiCheck aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="pricing-note">{t('landing.pricing.note')}</p>
      </div>
    </section>
  );
}
