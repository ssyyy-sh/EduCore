import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiLink, FiKey, FiMessageSquare, FiUsers, FiBookOpen } from 'react-icons/fi';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const LINK_ERRORS = ['invalid', 'kind', 'role', 'already', 'server'];

/** Code from the school → link this account to a student card (student: own card, parent: a child). */
export function CodeForm({ onDone, compact = false }) {
  const { redeemCode, toast } = useApp();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const clean = code.replace(/[\s-]/g, '');
    if (clean.length < 8) return setError(t('link.errShort'));
    setBusy(true);
    setError('');
    const res = await redeemCode(clean);
    setBusy(false);
    if (!res.ok) return setError(t(`link.err.${LINK_ERRORS.includes(res.error) ? res.error : 'server'}`));
    setCode('');
    toast(t('link.done', { name: res.studentName || '—', cls: res.className || '' }));
    onDone?.(res);
  };

  // Show the code as XXXX-XXXX while typing.
  const onChange = (v) => {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
    setError('');
  };

  return (
    <form className={`code-form ${compact ? 'is-compact' : ''}`} onSubmit={submit} noValidate>
      <div className="field">
        <label className="label" htmlFor="link-code">
          {t('link.codeLabel')}
        </label>
        <div className="code-row">
          <input
            id="link-code"
            className="input mono code-input"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ABCD-2345"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            aria-invalid={!!error}
            aria-describedby={error ? 'link-code-err' : undefined}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <span className="spinner" /> : <FiLink />} {t('link.submit')}
          </button>
        </div>
        {error && (
          <span className="field-error" id="link-code-err" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

/** Shown instead of a page until the school has linked this account. */
export function LinkGate() {
  const { role } = useApp();
  const { user } = useAuth();
  const { t } = useI18n();
  const isTeacher = role === 'teacher';
  return (
    <div className="page">
      <section className="panel link-gate">
        <div className="link-gate-icon" aria-hidden="true">
          {isTeacher ? <FiBookOpen /> : role === 'parent' ? <FiUsers /> : <FiKey />}
        </div>
        <h2>{t(`link.gate.${role}.title`)}</h2>
        <p>{t(`link.gate.${role}.text`)}</p>
        {!isTeacher && <CodeForm />}
        <div className="link-gate-alt">
          <p>{t(isTeacher ? 'link.gate.teacher.how' : 'link.gate.noCode', { email: user.email })}</p>
          <Link to="/app/messages" className="btn btn-secondary btn-sm">
            <FiMessageSquare /> {t('link.gate.write')}
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Settings → "My links": what this account is linked to; a parent can add another child. */
export function MyLinks() {
  const { role, children, teacherLink, myTeacherClasses } = useApp();
  const { t, ts } = useI18n();
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{t('link.mine')}</h3>
          <p>{t(`link.mineSub.${role}`)}</p>
        </div>
      </div>
      <div className="panel-body">
        {role === 'teacher' ? (
          teacherLink ? (
            <ul className="link-list">
              <li>
                <FiBookOpen aria-hidden="true" />
                <span>
                  <strong>{teacherLink.teacherName}</strong>
                  <em>{teacherLink.subject ? ts(teacherLink.subject) : ''}</em>
                </span>
              </li>
              {myTeacherClasses.map((c) => (
                <li key={c.name}>
                  <FiUsers aria-hidden="true" />
                  <span>
                    <strong>{t('common.class', { name: c.name })}</strong>
                    <em>{ts(c.subject)}</em>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-note">{t('link.none')}</p>
          )
        ) : children.length ? (
          <ul className="link-list">
            {children.map((c) => (
              <li key={c.studentId}>
                <FiUsers aria-hidden="true" />
                <span>
                  <strong>{c.full}</strong>
                  <em>
                    {t('common.class', { name: c.className })} · <span className="mono">{c.studentId}</span>
                  </em>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-note">{t('link.none')}</p>
        )}
        {role === 'parent' && (
          <div className="link-add">
            <h4>{t('link.addChild')}</h4>
            <CodeForm compact />
          </div>
        )}
        {role === 'student' && !children.length && <CodeForm compact />}
      </div>
    </section>
  );
}
