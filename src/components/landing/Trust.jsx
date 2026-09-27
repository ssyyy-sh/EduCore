import { useI18n } from '../../i18n/I18nContext.jsx';

export default function Trust() {
  const { t } = useI18n();
  const types = t('landing.trust.types');
  return (
    <section className="trust">
      <div className="container">
        <div className="trust-head">
          <p className="eyebrow">{t('landing.trust.eyebrow')}</p>
          <p className="trust-types">
            {types.map((ty, i) => (
              <span key={ty}>
                {ty}
                {i < types.length - 1 && <i aria-hidden="true">/</i>}
              </span>
            ))}
          </p>
        </div>
        <dl className="trust-metrics">
          {t('landing.trust.metrics').map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd className="num">{m.value}</dd>
              <span>{m.note}</span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
