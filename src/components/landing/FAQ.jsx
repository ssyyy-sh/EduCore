import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq" id="faq">
      <div className="container faq-grid">
        <div>
          <p className="eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2>{t('landing.faq.title')}</h2>
          <p className="lead">{t('landing.faq.lead')}</p>
        </div>
        <div className="accordion">
          {t('landing.faq.items').map((item, i) => {
            const isOpen = open === i;
            return (
              <div className="accordion-item" key={item.q}>
                <h3 className="accordion-heading">
                  <button type="button" className="accordion-trigger" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-t-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    {item.q}
                    <FiPlus aria-hidden="true" />
                  </button>
                </h3>
                <div className={`accordion-panel ${isOpen ? 'is-open' : ''}`} id={`faq-${i}`} role="region" aria-labelledby={`faq-t-${i}`} hidden={false} aria-hidden={!isOpen}>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
