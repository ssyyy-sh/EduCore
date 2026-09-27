import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiEye, FiEyeOff, FiAlertCircle, FiInfo, FiCheck } from 'react-icons/fi';
import Logo from '../components/Logo.jsx';
import LangSwitch from '../components/LangSwitch.jsx';
import { Photo } from '../components/ui/index.jsx';
import { IMAGES } from '../data/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { canAccess, homeFor } from '../lib/access.js';
import { DEMO_ACCOUNTS, SHOW_DEMO_ACCOUNTS } from '../config.js';

export function AuthLayout({ children, image }) {
  const { t } = useI18n();
  const points = t('auth.side.points');
  return (
    <div className="auth">
      <div className="auth-form-side">
        <div className="auth-top">
          <Logo />
          <div className="auth-top-right">
            <LangSwitch compact />
            <Link to="/" className="link-more">
              {t('auth.back')}
            </Link>
          </div>
        </div>
        <div className="auth-form-wrap">{children}</div>
        <p className="auth-foot">{t('auth.foot')}</p>
      </div>
      <div className="auth-visual">
        <Photo src={image} alt="" className="auth-photo" eager />
        <div className="auth-quote">
          <h2>{t('auth.side.title')}</h2>
          <ul>
            {points.map((p) => (
              <li key={p}>
                <FiCheck aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder, invalid }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="input-affix">
      <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} value={value} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('auth.hide') : t('auth.show')}>
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
}

const LOGIN_ERRORS = { unconfirmed: 'auth.login.errUnconfirmed', blocked: 'auth.login.errBlocked', network: 'auth.login.errNetwork' };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, remote, sendReset, notice } = useAuth();
  const [resetSent, setResetSent] = useState(false);
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => (notice === 'blocked' ? t('auth.login.errBlocked') : ''));
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('auth.login.errEmail'));
    if (!password) return setError(t('auth.login.errPassEmpty'));
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(t(LOGIN_ERRORS[res.error] || 'auth.login.errInvalid'));
      return;
    }
    if (res.role === 'pending') return navigate('/app', { replace: true });
    const from = location.state?.from;
    const page = from?.split('/')[2]?.split('?')[0];
    navigate(from && page && canAccess(res.role, page) ? from : homeFor(res.role), { replace: true });
  };

  const requestReset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('auth.login.errEmail'));
    setError('');
    const res = await sendReset(email);
    if (res.ok) setResetSent(true);
    else setError(t('auth.login.errNetwork'));
  };

  return (
    <AuthLayout image={IMAGES.campus}>
      <h1>{t('auth.login.title')}</h1>
      <p className="auth-sub">{t('auth.login.sub')}</p>
      <form onSubmit={submit} noValidate className="auth-form">
        {error && (
          <div className="alert alert-error" role="alert">
            <FiAlertCircle aria-hidden="true" /> {error}
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="l-email">
            {t('auth.email')}
          </label>
          <input id="l-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.edu" />
        </div>
        <div className="field">
          <div className="label-row">
            <label className="label" htmlFor="l-pass">
              {t('auth.password')}
            </label>
            <button type="button" className="link-more" onClick={() => setForgot((f) => !f)} aria-expanded={forgot}>
              {t('auth.forgot')}
            </button>
          </div>
          <PasswordInput id="l-pass" value={password} onChange={setPassword} autoComplete="current-password" />
          {forgot &&
            (remote ? (
              <div className="hint hint-box">
                <FiInfo aria-hidden="true" />
                <div>
                  {resetSent ? (
                    t('auth.resetSent', { email: email.trim() })
                  ) : (
                    <>
                      {t('auth.resetText')}{' '}
                      <button type="button" className="link-btn" onClick={requestReset}>
                        {t('auth.resetSend')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="hint hint-box">
                <FiInfo aria-hidden="true" /> {t('auth.forgotText')}
              </p>
            ))}
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? t('auth.login.loading') : t('auth.login.submit')}
          {!loading && <FiArrowRight />}
        </button>
      </form>

      {SHOW_DEMO_ACCOUNTS && !remote && (
        <div className="demo-accounts">
          <p className="demo-title">{t('auth.demo.title')}</p>
          <p className="hint">{t('auth.demo.text')}</p>
          <ul>
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    setError('');
                  }}
                >
                  <strong>{t(`roles.${a.role}`)}</strong>
                  <span className="mono">{a.email}</span>
                  <span className="mono">{a.password}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="auth-switch">
        {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.create')}</Link>
      </p>
    </AuthLayout>
  );
}
