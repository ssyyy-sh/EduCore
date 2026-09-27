import { Link } from 'react-router-dom';
import Logo from '../Logo.jsx';
import AnchorLink from './AnchorLink.jsx';
import LangSwitch from '../LangSwitch.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const COLS = [
  { title: 'product', links: [['platform', '#platform'], ['features', '#features'], ['security', '#security'], ['pricing', '#pricing']] },
  { title: 'solutions', links: [['forStudents', '#students'], ['forParents', '#parents'], ['forSchools', '#schools'], ['faq', '#faq']] },
  { title: 'account', links: [['signIn', '/login'], ['createAccount', '/register']] },
];

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>{t('landing.footer.tagline')}</p>
            <LangSwitch align="left" />
          </div>
          {COLS.map((c) => (
            <div key={c.title} className="footer-col">
              <h4>{t(`landing.footer.${c.title}`)}</h4>
              <ul>
                {c.links.map(([key, href]) => (
                  <li key={key}>{href.startsWith('/') ? <Link to={href}>{t(`landing.footer.${key}`)}</Link> : <AnchorLink href={href}>{t(`landing.footer.${key}`)}</AnchorLink>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>{t('landing.footer.rights')}</span>
        </div>
      </div>
    </footer>
  );
}
