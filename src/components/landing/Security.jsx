import { FiShield, FiLock, FiUsers, FiCheckCircle, FiDownload, FiCheck, FiMinus } from 'react-icons/fi';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ACCESS, ROLE_KEYS } from '../../lib/access.js';

const ICONS = [FiUsers, FiLock, FiShield, FiDownload];
const PREVIEW_PAGES = ['school', 'students', 'analytics', 'grades'];

export default function Security() {
  const { t } = useI18n();
  return (
    <section className="section security" id="security">
      <div className="container security-grid">
        <div className="security-copy">
          <p className="eyebrow eyebrow-light">{t('landing.security.eyebrow')}</p>
          <h2>{t('landing.security.title')}</h2>
          <p className="lead">{t('landing.security.lead')}</p>
          <ul className="compliance">
            {t('landing.security.facts').map((c) => (
              <li key={c}>
                <FiCheckCircle aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="security-items">
          {t('landing.security.items').map((it, i) => {
            const I = ICONS[i];
            return (
              <div key={it.title} className="security-item">
                <I aria-hidden="true" />
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            );
          })}
          <div className="security-audit">
            <table className="access-preview">
              <caption>{t('landing.security.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">{t('settings.page')}</span>
                  </th>
                  {ROLE_KEYS.map((r) => (
                    <th key={r} scope="col">
                      {t(r === 'school' ? 'roles.schoolShort' : `roles.${r}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_PAGES.map((p) => (
                  <tr key={p}>
                    <th scope="row">{t(`settings.pages.${p}`)}</th>
                    {ROLE_KEYS.map((r) => (
                      <td key={r}>{ACCESS[p].includes(r) ? <FiCheck aria-label={t('settings.allowed')} className="yes" /> : <FiMinus aria-label={t('settings.denied')} className="no" />}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
