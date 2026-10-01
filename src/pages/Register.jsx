import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiUser, FiUsers, FiBriefcase, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { AuthLayout, PasswordInput } from './Login.jsx';
import { IMAGES } from '../data/images.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { homeFor } from '../lib/access.js';
import { MIN_PASSWORD } from '../config.js';

const TYPES = [
  { key: 'student', icon: FiBookOpen },
  { key: 'parent', icon: FiUser },
  { key: 'teacher', icon: FiUsers },
  { key: 'school', icon: FiBriefcase },
];

export default function Register() {
  const navigate = useNavigate();
  const { register, remote } = useAuth();
  const [confirmSent, setConfirmSent] = useState('');
  const { t } = useI18n();
  const [type, setType] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', org: '', agree: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = t('auth.register.errName');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = t('auth.register.errEmail');
    if (form.password.length < MIN_PASSWORD) errs.password = t('auth.errPassLen', { n: MIN_PASSWORD });
    else if (form.password !== form.confirm) errs.confirm = t('settings.errMatch');
    if (type === 'school' && !form.org.trim()) errs.org = t('auth.register.errOrg');
    if (!form.agree) errs.agree = t('auth.register.errAgree');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const res = await register({ name: form.name, email: form.email, password: form.password, role: type, org: type === 'school' ? form.org : undefined });
    setLoading(false);
    if (!res.ok) {
      const detail = res.detail || '';
      const msg = {
        exists: t('auth.register.errExists'),
        weak: t('auth.errPassLen', { n: MIN_PASSWORD }),
        network: t('auth.login.errNetwork'),
        rate: t('auth.login.errRate'),
        server: t('auth.login.errServer', { detail }),
        other: t('auth.login.errOther', { detail }),
      }[res.error] || t('auth.login.errOther', { detail });
      setErrors(res.error === 'exists' || res.error === 'weak' ? { email: msg } : { form: msg });
      return;
    }
    if (res.confirm) return setConfirmSent(form.email.trim());
    navigate(res.role === 'pending' ? '/app' : homeFor(res.role), { replace: true });
  };

  if (confirmSent) {
    return (
      <AuthLayout image={IMAGES.studentsLaptops}>
        <h1>{t('auth.register.confirmTitle')}</h1>
        <p className="auth-sub">{t('auth.register.confirmText', { email: confirmSent })}</p>
        <Link to="/login" className="btn btn-primary btn-lg">
          {t('auth.register.signIn')} <FiArrowRight />
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout image={IMAGES.studentsLaptops}>
      <h1>{t('auth.register.title')}</h1>
      <p className="auth-sub">{t('auth.register.sub')}</p>
      <form onSubmit={submit} noValidate className="auth-form">
        <div className="type-pick" role="radiogroup" aria-label={t('auth.register.type')}>
          {TYPES.map((x) => {
            const [label, desc] = t(`auth.register.types.${x.key}`);
            return (
              <button type="button" role="radio" aria-checked={type === x.key} key={x.key} className={type === x.key ? 'is-active' : ''} onClick={() => setType(x.key)}>
                <x.icon aria-hidden="true" />
                <strong>{label}</strong>
                <span>{desc}</span>
                {type === x.key && <FiCheck className="type-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {remote && (type === 'teacher' || type === 'school') && (
          <p className="hint hint-box">
            <FiInfo aria-hidden="true" /> {t('auth.register.approval')}
          </p>
        )}
        {errors.form && (
          <div className="alert alert-error" role="alert">
            <FiAlertCircle aria-hidden="true" /> {errors.form}
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="r-name">
            {t('auth.register.name')}
          </label>
          <input id="r-name" className="input" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label className="label" htmlFor="r-email">
            {t('auth.email')}
          </label>
          <input id="r-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-row">
          <div className="field">
            <label className="label" htmlFor="r-pass">
              {t('auth.password')}
            </label>
            <PasswordInput id="r-pass" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" invalid={!!errors.password} />
            {errors.password ? <span className="field-error">{errors.password}</span> : <span className="hint">{t('auth.errPassLen', { n: MIN_PASSWORD })}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="r-confirm">
              {t('settings.confirmPassword')}
            </label>
            <PasswordInput id="r-confirm" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" invalid={!!errors.confirm} />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>
        </div>
        {type === 'school' && (
          <div className="field">
            <label className="label" htmlFor="r-org">
              {t('auth.register.org')}
            </label>
            <input id="r-org" className="input" value={form.org} onChange={set('org')} aria-invalid={!!errors.org} placeholder={t('auth.register.orgPh')} />
            {errors.org && <span className="field-error">{errors.org}</span>}
          </div>
        )}
        <label className="check-row">
          <input type="checkbox" className="checkbox" checked={form.agree} onChange={set('agree')} />
          <span>{t('auth.register.agree')}</span>
        </label>
        {errors.agree && (
          <span className="field-error">
            <FiAlertCircle aria-hidden="true" /> {errors.agree}
          </span>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? t('auth.register.loading') : t('auth.register.submit')}
          {!loading && <FiArrowRight />}
        </button>
      </form>
      <p className="auth-switch">
        {t('auth.register.have')} <Link to="/login">{t('auth.register.signIn')}</Link>
      </p>
    </AuthLayout>
  );
}
