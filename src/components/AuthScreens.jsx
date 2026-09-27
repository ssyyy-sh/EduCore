import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiLogOut, FiKey, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { Modal } from './ui/index.jsx';
import { PasswordInput } from '../pages/Login.jsx';
import { LogoMark } from './Logo.jsx';
import { MIN_PASSWORD } from '../config.js';

/** Full-page loader while the session is checked. */
export function FullPageLoader() {
  const { t } = useI18n();
  return (
    <div className="full-loader" role="status" aria-live="polite">
      <LogoMark size={32} />
      <span className="spinner" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

/** Signed in, but the owner hasn't approved the account yet (teacher / school admin sign-ups). */
export function PendingApproval() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="pending-screen">
      <div className="pending-card">
        <span className="pending-icon">
          <FiClock aria-hidden="true" />
        </span>
        <h1>{t('pending.title')}</h1>
        <p>{t('pending.text', { role: user.requestedRole ? t(`roles.${user.requestedRole}`) : '—' })}</p>
        <p className="hint">{user.email}</p>
        <div className="pending-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          <FiRefreshCw /> {t('pending.check')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          <FiLogOut /> {t('header.signOut')}
        </button>
        </div>
      </div>
    </div>
  );
}

/** Opened from a password-reset email: set a new password. */
export function RecoveryModal() {
  const { recovery, finishRecovery } = useAuth();
  const { t } = useI18n();
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!recovery) return null;
  const submit = async (e) => {
    e?.preventDefault();
    if (pw.length < MIN_PASSWORD) return setError(t('auth.errPassLen', { n: MIN_PASSWORD }));
    setBusy(true);
    const res = await finishRecovery(pw);
    setBusy(false);
    if (!res.ok) setError(t('recovery.failed'));
  };
  return (
    <Modal
      open
      onClose={() => {}}
      title={t('recovery.title')}
      description={t('recovery.text')}
      footer={
        <button type="submit" form="recovery-form" className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : <FiKey />} {t('recovery.save')}
        </button>
      }
    >
      <form id="recovery-form" onSubmit={submit} className="field">
        <label className="label" htmlFor="rec-pass">
          {t('settings.newPassword')}
        </label>
        <PasswordInput id="rec-pass" value={pw} onChange={setPw} autoComplete="new-password" invalid={!!error} />
        {error && <span className="field-error">{error}</span>}
      </form>
    </Modal>
  );
}

/** An expired or reused link from a Supabase email comes back as "#error=…". Explain it and go to sign-in. */
export function EmailLinkError() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!/error_description=|error_code=/.test(window.location.hash)) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setShow(true);
    navigate('/login', { replace: true });
  }, [navigate]);
  return (
    <Modal
      open={show}
      onClose={() => setShow(false)}
      title={t('emailLink.title')}
      description={t('emailLink.text')}
      footer={
        <button type="button" className="btn btn-primary" onClick={() => setShow(false)}>
          {t('staff.done')}
        </button>
      }
    />
  );
}
