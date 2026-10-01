import { useState } from 'react';
import { FiCopy, FiTrash2, FiKey, FiMail, FiLink2, FiClock } from 'react-icons/fi';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

const isEmail = (e) => /^\S+@\S+\.\S+$/.test(String(e || '').trim());

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** One linked account with an "unlink" button that asks once more. */
function LinkRow({ link }) {
  const { unlink, toast } = useApp();
  const { t } = useI18n();
  const [ask, setAsk] = useState(false);
  const who = link.accountName || link.email || '—';
  return (
    <li className="acc-row">
      <span className="acc-main">
        <strong>{who}</strong>
        <em>
          {t(`link.kind.${link.kind}`)}
          {link.accountName && link.email ? ` · ${link.email}` : ''}
          {!link.profileId && (
            <span className="acc-pending">
              <FiClock aria-hidden="true" /> {t('link.pending')}
            </span>
          )}
        </em>
      </span>
      {ask ? (
        <span className="acc-actions">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={async () => {
              setAsk(false);
              if ((await unlink(link.id)) !== false) toast(t('link.unlinked', { name: who }));
            }}
          >
            {t('link.unlinkYes')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsk(false)}>
            {t('common.cancel')}
          </button>
        </span>
      ) : (
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('link.unlink', { name: who })} onClick={() => setAsk(true)}>
          <FiTrash2 />
        </button>
      )}
    </li>
  );
}

/** Email field + button: link an account (existing now, or when it signs up). */
function EmailLink({ kinds, defaults = {}, onLink }) {
  const { t } = useI18n();
  const [kind, setKind] = useState(kinds[0]);
  const [email, setEmail] = useState(defaults[kinds[0]] || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError(t('link.errEmail'));
    setBusy(true);
    setError('');
    const res = await onLink(kind, email.trim());
    setBusy(false);
    if (!res.ok) return setError(t(res.error === 'exists' ? 'link.errExists' : 'link.err.server'));
    setEmail('');
  };
  return (
    <form className="acc-email" onSubmit={submit} noValidate>
      {kinds.length > 1 && (
        <select
          className="input select-native"
          aria-label={t('link.kindLabel')}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            if (!email || Object.values(defaults).includes(email)) setEmail(defaults[e.target.value] || '');
          }}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {t(`link.kind.${k}`)}
            </option>
          ))}
        </select>
      )}
      <input className="input" type="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(''))} placeholder={t('link.emailPh')} aria-label={t('link.emailLabel')} aria-invalid={!!error} />
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        {busy ? <span className="spinner" /> : <FiLink2 />} {t('link.link')}
      </button>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

function useLinkResultToast() {
  const { toast } = useApp();
  const { t } = useI18n();
  return (res, email, wantRole) => {
    if (!res.ok) return;
    if (!res.linked) toast(t('link.linkedLater', { email }));
    else if (res.role && res.role !== wantRole && res.role !== 'owner') toast(t('link.roleWarn', { email, role: t(`roles.${res.role}`), want: t(`roles.${wantRole}`) }));
    else toast(t('link.linkedNow', { email }));
  };
}

/** School admin: accounts of one student card (the student and parents), codes and email links. */
export function StudentAccounts({ student }) {
  const { links, linkCodes, createLinkCode, removeLinkCode, linkByEmail, toast } = useApp();
  const { t, fmtDate } = useI18n();
  const report = useLinkResultToast();
  const mine = links.filter((l) => l.kind !== 'teacher' && l.studentId === student.id);
  const codes = linkCodes.filter((c) => c.studentId === student.id && !c.usedBy && new Date(c.expiresAt) > new Date());

  const newCode = async (kind) => {
    const code = await createLinkCode(kind, student);
    if (code) toast(t('link.codeMade', { code: `${code.slice(0, 4)}-${code.slice(4)}` }));
  };

  return (
    <div className="drawer-block acc-block">
      <h3>{t('link.accounts')}</h3>
      {mine.length ? (
        <ul className="acc-list">
          {mine.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
        </ul>
      ) : (
        <p className="hint">{t('link.noAccounts')}</p>
      )}

      <h4>{t('link.codes')}</h4>
      <p className="hint">{t('link.codesHint')}</p>
      {codes.length > 0 && (
        <ul className="acc-list">
          {codes.map((c) => {
            const shown = `${c.code.slice(0, 4)}-${c.code.slice(4)}`;
            return (
              <li key={c.code} className="acc-row">
                <span className="acc-main">
                  <strong className="mono code-chip">{shown}</strong>
                  <em>
                    {t(`link.kind.${c.kind}`)} · {t('link.until', { date: fmtDate(new Date(c.expiresAt), { day: 'numeric', month: 'long' }) })}
                  </em>
                </span>
                <span className="acc-actions">
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('link.copy')} onClick={async () => toast((await copyText(shown)) ? t('link.copied') : shown)}>
                    <FiCopy />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('link.removeCode')} onClick={() => removeLinkCode(c.code)}>
                    <FiTrash2 />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="acc-buttons">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => newCode('student')}>
          <FiKey /> {t('link.codeFor.student')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => newCode('parent')}>
          <FiKey /> {t('link.codeFor.parent')}
        </button>
      </div>

      <h4>
        <FiMail aria-hidden="true" /> {t('link.byEmail')}
      </h4>
      <p className="hint">{t('link.byEmailHint')}</p>
      <EmailLink
        kinds={['parent', 'student']}
        defaults={{ parent: student.guardianEmail || '', student: student.email || '' }}
        onLink={async (kind, email) => {
          const res = await linkByEmail(kind, student, email);
          report(res, email, kind);
          return res;
        }}
      />
    </div>
  );
}

/** School admin: the account of one teacher card. */
export function TeacherAccount({ teacher }) {
  const { links, linkByEmail } = useApp();
  const { t } = useI18n();
  const report = useLinkResultToast();
  const mine = links.filter((l) => l.kind === 'teacher' && l.teacherId === teacher.id);
  return (
    <div className="acc-block">
      <span className="label">{t('link.teacherAccount')}</span>
      {mine.length > 0 && (
        <ul className="acc-list">
          {mine.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
        </ul>
      )}
      <p className="hint">{t('link.teacherHint')}</p>
      <EmailLink
        kinds={['teacher']}
        defaults={{ teacher: mine.length ? '' : teacher.email || '' }}
        onLink={async (kind, email) => {
          const res = await linkByEmail('teacher', teacher, email);
          report(res, email, 'teacher');
          return res;
        }}
      />
    </div>
  );
}
