import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiBell, FiShield, FiMonitor, FiSun, FiMoon, FiLock, FiUsers, FiCheck, FiMinus, FiLogOut, FiSmartphone } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { Switch, Avatar, Modal } from '../components/ui/index.jsx';
import { useApp, NOTIF_TYPES } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n, LANGS } from '../i18n/I18nContext.jsx';
import { ACCESS, ROLE_KEYS } from '../lib/access.js';
import { MIN_PASSWORD } from '../config.js';
import { useRoleMeta } from '../components/dashboard/useRoleMeta.js';
import { useInstall } from '../lib/pwa.js';

const SECTIONS = [
  { key: 'profile', icon: FiUser },
  { key: 'notifications', icon: FiBell },
  { key: 'appearance', icon: FiMonitor },
  { key: 'security', icon: FiShield },
  { key: 'roles', icon: FiUsers },
];
const PAGE_ORDER = ['student', 'parent', 'teacher', 'school', 'students', 'staff', 'gradebook', 'attendance', 'analytics', 'assignments', 'grades', 'report-card', 'schedule', 'progress', 'announcements', 'messages', 'notifications', 'settings'];

function InstallApp() {
  const { t } = useI18n();
  const { toast } = useApp();
  const { installed, canInstall, isIOS, install } = useInstall();
  const text = installed ? t('settings.install.installed') : canInstall ? t('settings.install.text') : isIOS ? t('settings.install.ios') : t('settings.install.generic');
  return (
    <div className="install-card">
      <FiSmartphone aria-hidden="true" />
      <div>
        <strong>{t('settings.install.title')}</strong>
        <span>{text}</span>
      </div>
      {canInstall && !installed && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (await install()) toast(t('settings.install.done'));
          }}
        >
          {t('settings.install.button')}
        </button>
      )}
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme, toast, prefs, setPref } = useApp();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const meta = useRoleMeta();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [section, setSection] = useState(() => (SECTIONS.some((s) => s.key === params.get('section')) ? params.get('section') : 'profile'));
  const [name, setName] = useState(user.name);
  const [nameErr, setNameErr] = useState('');
  const [pw, setPw] = useState(null); // { current, next, confirm, error }

  useEffect(() => {
    const s = params.get('section');
    if (s && SECTIONS.some((x) => x.key === s)) setSection(s);
  }, [params]);

  const saveProfile = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameErr(t('settings.errName'));
      return;
    }
    setNameErr('');
    updateProfile({ name });
    toast(t('settings.saved'));
  };

  const submitPassword = (e) => {
    e?.preventDefault();
    if (pw.next.length < MIN_PASSWORD) return setPw({ ...pw, error: t('auth.errPassLen', { n: MIN_PASSWORD }) });
    if (pw.next !== pw.confirm) return setPw({ ...pw, error: t('settings.errMatch') });
    const res = changePassword(pw.current, pw.next);
    if (!res.ok) return setPw({ ...pw, error: t('settings.errCurrent') });
    setPw(null);
    toast(t('settings.passwordChangedToast'));
  };

  return (
    <div className="page">
      <PageHeader title={t('settings.title')} description={t('settings.sub')} />
      <div className="settings">
        <nav className="settings-nav" aria-label={t('settings.sectionsLabel')}>
          {SECTIONS.map((s) => (
            <button key={s.key} type="button" className={`mail-folder ${section === s.key ? 'is-active' : ''}`} onClick={() => setSection(s.key)} aria-current={section === s.key ? 'page' : undefined}>
              <s.icon aria-hidden="true" /> {t(`settings.sections.${s.key}`)}
            </button>
          ))}
        </nav>

        <div className="settings-body">
          {section === 'profile' && (
            <form className="panel" onSubmit={saveProfile} noValidate>
              <div className="panel-head">
                <div>
                  <h3>{t('settings.profile')}</h3>
                  <p>{t('settings.profileSub')}</p>
                </div>
              </div>
              <div className="panel-body settings-form">
                <div className="person">
                  <Avatar name={user.name} size={52} />
                  <span className="person-text">
                    <span className="person-name">{user.name}</span>
                    <span className="person-sub">{meta}</span>
                  </span>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label className="label" htmlFor="s-name">
                      {t('settings.fullName')}
                    </label>
                    <input id="s-name" className="input" value={name} aria-invalid={!!nameErr} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    {nameErr && <span className="field-error">{nameErr}</span>}
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="s-email">
                      {t('settings.email')}
                    </label>
                    <input id="s-email" className="input" value={user.email} disabled />
                    <span className="hint">{t('settings.emailHint')}</span>
                  </div>
                </div>
                <div className="field">
                  <span className="label" id="lang-label">
                    {t('settings.language')}
                  </span>
                  <div className="lang-options" role="radiogroup" aria-labelledby="lang-label">
                    {LANGS.map((l) => (
                      <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} lang={l.code} className={`lang-option ${lang === l.code ? 'is-active' : ''}`} onClick={() => setLang(l.code)}>
                        <span className="mono">{l.short}</span>
                        {l.label}
                        {lang === l.code && <FiCheck aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                  <span className="hint">{t('settings.languageHint')}</span>
                </div>
              </div>
              <div className="panel-foot">
                <span />
                <button type="submit" className="btn btn-primary" disabled={name.trim() === user.name}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          )}

          {section === 'notifications' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>{t('settings.sections.notifications')}</h3>
                  <p>{t('settings.notifSub')}</p>
                </div>
              </div>
              <div className="panel-body">
                <ul className="setting-list">
                  {NOTIF_TYPES.map((k) => {
                    const [title, desc] = t(`settings.notifItems.${k}`);
                    return (
                      <li key={k}>
                        <div>
                          <strong>{title}</strong>
                          <span>{desc}</span>
                        </div>
                        <Switch
                          checked={prefs[k]}
                          onChange={(v) => {
                            setPref(k, v);
                            toast(t('settings.prefSaved'));
                          }}
                          label={title}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {section === 'appearance' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>{t('settings.appearance')}</h3>
                  <p>{t('settings.appearanceSub')}</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="theme-options" role="radiogroup" aria-label={t('settings.theme')}>
                  {[
                    ['system', FiMonitor],
                    ['light', FiSun],
                    ['dark', FiMoon],
                  ].map(([k, I]) => (
                    <button key={k} type="button" role="radio" aria-checked={theme === k} className={`theme-option ${theme === k ? 'is-active' : ''}`} onClick={() => setTheme(k)}>
                      <span className={`theme-swatch theme-swatch-${k}`} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        <I aria-hidden="true" /> {t(`theme.${k}`)}
                      </span>
                    </button>
                  ))}
                </div>
                <InstallApp />
              </div>
            </section>
          )}

          {section === 'security' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>{t('settings.security')}</h3>
                  <p>{t('settings.securitySub')}</p>
                </div>
              </div>
              <div className="panel-body">
                <ul className="setting-list">
                  <li>
                    <div>
                      <strong>
                        <FiLock aria-hidden="true" /> {t('settings.password')}
                      </strong>
                      <span>{t('settings.passwordHint', { n: MIN_PASSWORD })}</span>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPw({ current: '', next: '', confirm: '', error: '' })}>
                      {t('settings.change')}
                    </button>
                  </li>
                  <li>
                    <div>
                      <strong>
                        <FiLogOut aria-hidden="true" /> {t('settings.signOutTitle')}
                      </strong>
                      <span>{t('settings.signOutText')}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        logout();
                        navigate('/login', { replace: true });
                      }}
                    >
                      {t('header.signOut')}
                    </button>
                  </li>
                </ul>
              </div>
            </section>
          )}

          {section === 'roles' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>{t('settings.roles')}</h3>
                  <p>{t('settings.rolesSub')}</p>
                </div>
              </div>
              <div className="panel-body flush">
                <div className="table-wrap">
                  <table className="table perm-table">
                    <thead>
                      <tr>
                        <th>{t('settings.page')}</th>
                        {ROLE_KEYS.map((r) => (
                          <th key={r} className={r === user.role ? 'is-you' : ''}>
                            {t(r === 'school' ? 'roles.schoolShort' : `roles.${r}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PAGE_ORDER.map((p) => (
                        <tr key={p}>
                          <td className="cell-strong">{t(`settings.pages.${p}`)}</td>
                          {ROLE_KEYS.map((r) => (
                            <td key={r} className={r === user.role ? 'is-you' : ''}>
                              {ACCESS[p].includes(r) ? <FiCheck className="t-success" aria-label={t('settings.allowed')} /> : <FiMinus className="t-muted" aria-label={t('settings.denied')} />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <Modal
        open={!!pw}
        onClose={() => setPw(null)}
        title={t('settings.changePassword')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPw(null)}>
              {t('common.cancel')}
            </button>
            <button type="submit" form="pw-form" className="btn btn-primary">
              {t('settings.change')}
            </button>
          </>
        }
      >
        {pw && (
          <form id="pw-form" className="modal-form" onSubmit={submitPassword} noValidate>
            {pw.error && (
              <div className="alert alert-error" role="alert">
                {pw.error}
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="pw-current">
                {t('settings.currentPassword')}
              </label>
              <input id="pw-current" className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="pw-next">
                {t('settings.newPassword')}
              </label>
              <input id="pw-next" className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <span className="hint">{t('auth.errPassLen', { n: MIN_PASSWORD })}</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="pw-confirm">
                {t('settings.confirmPassword')}
              </label>
              <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
