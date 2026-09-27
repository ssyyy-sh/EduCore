import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCompass } from 'react-icons/fi';
import Logo from '../components/Logo.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function NotFound({ inApp }) {
  const { t } = useI18n();
  const body = (
    <div className="notfound-body">
      <div className="empty-icon">
        <FiCompass />
      </div>
      <span className="mono">404</span>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <div className="notfound-actions">
        <Link to="/" className="btn btn-secondary">
          <FiArrowLeft /> {t('notFound.back')}
        </Link>
        <Link to="/app" className="btn btn-primary">
          {t('notFound.open')}
        </Link>
      </div>
    </div>
  );
  if (inApp) return <div className="page notfound-inapp">{body}</div>;
  return (
    <div className="notfound">
      <Logo />
      {body}
    </div>
  );
}
