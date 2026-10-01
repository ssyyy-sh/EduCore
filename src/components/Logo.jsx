import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

export function LogoMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M9 11h14M9 16h9M9 21h14" stroke="var(--accent-contrast)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = '/', compact }) {
  const { t } = useI18n();
  return (
    <Link to={to} className="logo" aria-label={t('nav.home')}>
      <LogoMark />
      {!compact && <span>EduFY</span>}
    </Link>
  );
}
