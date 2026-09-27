import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiEdit, FiInbox, FiSend, FiMail, FiArrowLeft, FiCornerUpLeft, FiMessageSquare } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { Avatar, SearchInput, EmptyState, Modal, Select } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useRelTime } from '../components/dashboard/useRelTime.js';

const ROLES = ['Teacher', 'Parent', 'Student', 'School'];
const ROLE_T = { Teacher: 'roles.teacher', Parent: 'roles.parent', Student: 'roles.student', School: 'roles.schoolShort' };
const T = (value, role) => ({ value, role });
const RECIPIENTS_BY_ROLE = {
  student: [T('Mr. Daniel Hayes', 'Teacher'), T('Ms. Claire Laurent', 'Teacher'), T('Northbridge Academy', 'School')],
  parent: [T('Mr. Daniel Hayes', 'Teacher'), T('Ms. Ana Silva', 'Teacher'), T('Northbridge Academy', 'School')],
  teacher: [T('Olivia Chen', 'School'), T('Sarah Morgan', 'Parent'), T('Alex Morgan', 'Student'), T('Mia Carter', 'Student')],
  school: [T('Mr. Daniel Hayes', 'Teacher'), T('Ms. Claire Laurent', 'Teacher'), T('Sarah Morgan', 'Parent')],
};

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const { messages, markMessageRead, sendMessage, toast, role: myRole } = useApp();
  const RECIPIENTS = RECIPIENTS_BY_ROLE[myRole] || RECIPIENTS_BY_ROLE.student;
  const { t, tr } = useI18n();
  const rel = useRelTime();
  const [folder, setFolder] = useState('inbox');
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [reply, setReply] = useState('');
  const [compose, setCompose] = useState(null); // { to, role, subject, body }
  const [composeErr, setComposeErr] = useState('');
  const [mobileRead, setMobileRead] = useState(false);

  // Links like /app/messages?to=Name&role=Parent open a pre-filled draft.
  useEffect(() => {
    const to = params.get('to');
    if (to) {
      setCompose({ to, role: params.get('role') || 'Teacher', subject: '', body: '' });
      setComposeErr('');
      params.delete('to');
      params.delete('role');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return messages.filter(
      (m) =>
        (folder === 'sent' ? m.box === 'sent' : m.box === 'inbox') &&
        (folder !== 'unread' || m.unread) &&
        (!role || m.role === role) &&
        (!n || tr(m.subject).toLowerCase().includes(n) || m.from.toLowerCase().includes(n) || tr(m.body).toLowerCase().includes(n))
    );
  }, [messages, folder, q, role, tr]);

  // Keep a valid selection when the list changes (desktop shows the first message).
  const selected = list.find((m) => m.id === selectedId) || list[0] || null;
  const unread = messages.filter((m) => m.unread && m.box === 'inbox').length;

  const open = (m) => {
    setSelectedId(m.id);
    setMobileRead(true);
    setReply('');
    if (m.unread) markMessageRead(m.id);
  };

  const sendReply = (e) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    sendMessage({ to: selected.from, role: selected.role, subject: t('messages.rePrefix', { subject: tr(selected.subject).replace(/^Re:\s*/, '') }), body: reply.trim() });
    setReply('');
    toast(t('messages.replySent'));
  };

  const sendCompose = () => {
    if (!compose.subject.trim() || !compose.body.trim()) {
      setComposeErr(t('messages.errSubject'));
      return;
    }
    sendMessage({ to: compose.to, role: compose.role, subject: compose.subject.trim(), body: compose.body.trim() });
    setCompose(null);
    setFolder('sent');
    setSelectedId(null);
    toast(t('messages.sentToast'));
  };

  const recipientOptions = compose && !RECIPIENTS.some((r) => r.value === compose.to) ? [{ value: compose.to, role: compose.role }, ...RECIPIENTS] : RECIPIENTS;

  return (
    <div className="page">
      <PageHeader
        title={t('messages.title')}
        description={t('messages.sub', { n: unread })}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => { setComposeErr(''); setCompose({ to: RECIPIENTS[0].value, role: RECIPIENTS[0].role, subject: '', body: '' }); }}>
            <FiEdit /> {t('messages.new')}
          </button>
        }
      />

      <section className={`panel mail ${mobileRead ? 'is-reading' : ''}`}>
        <aside className="mail-folders">
          {[
            { key: 'inbox', icon: FiInbox },
            { key: 'unread', icon: FiMail },
            { key: 'sent', icon: FiSend },
          ].map((f) => (
            <button key={f.key} type="button" className={`mail-folder ${folder === f.key ? 'is-active' : ''}`} onClick={() => { setFolder(f.key); setSelectedId(null); setMobileRead(false); }}>
              <f.icon aria-hidden="true" />
              {t(`messages.${f.key}`)}
              {f.key === 'unread' && unread > 0 && <span className="side-count num">{unread}</span>}
            </button>
          ))}
          <div className="mail-sep" />
          <p className="side-section">{t('messages.from')}</p>
          {ROLES.map((r) => (
            <button key={r} type="button" className={`mail-folder ${role === r ? 'is-active' : ''}`} onClick={() => setRole(role === r ? '' : r)} aria-pressed={role === r}>
              <span className={`role-dot role-${r.toLowerCase()}`} aria-hidden="true" />
              {t(ROLE_T[r])}
            </button>
          ))}
        </aside>

        <div className="mail-list">
          <div className="mail-list-head">
            <SearchInput value={q} onChange={setQ} placeholder={t('messages.search')} id="mail-search" />
          </div>
          {list.length === 0 ? (
            <EmptyState icon={FiMessageSquare} title={folder === 'unread' && !q && !role ? t('messages.caughtUp') : t('messages.none')} text={folder === 'unread' && !q && !role ? t('messages.noUnread') : t('messages.noneText')} />
          ) : (
            <ul>
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" className={`mail-item ${selected && m.id === selected.id ? 'is-active' : ''} ${m.unread ? 'is-unread' : ''}`} onClick={() => open(m)}>
                    <Avatar name={m.from} size={32} />
                    <div className="mail-item-main">
                      <div className="mail-item-top">
                        <strong>{m.box === 'sent' ? t('messages.toPrefix', { name: m.from }) : m.from}</strong>
                        <span>{rel(m.at)}</span>
                      </div>
                      <span className="mail-item-subject">{tr(m.subject)}</span>
                      <span className="mail-item-preview">{tr(m.body).replace(/\s+/g, ' ')}</span>
                      <span className={`role-tag role-${m.role.toLowerCase()}`}>{t(ROLE_T[m.role])}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mail-read">
          {selected ? (
            <>
              <div className="mail-read-head">
                <button type="button" className="btn btn-ghost btn-sm mobile-only" onClick={() => setMobileRead(false)}>
                  <FiArrowLeft /> {t('common.back')}
                </button>
                <h2>{tr(selected.subject)}</h2>
                <div className="person">
                  <Avatar name={selected.from} size={36} />
                  <span className="person-text">
                    <span className="person-name">{selected.box === 'sent' ? t('messages.toPrefix', { name: selected.from }) : selected.from}</span>
                    <span className="person-sub">
                      {t(ROLE_T[selected.role])} · {rel(selected.at)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="mail-read-body">
                {tr(selected.body)
                  .split('\n')
                  .map((p, i) => (p ? <p key={i}>{p}</p> : <br key={i} />))}
              </div>
              {selected.box === 'inbox' && (
                <form className="mail-reply" onSubmit={sendReply}>
                  <label htmlFor="reply" className="sr-only">
                    {t('messages.reply')}
                  </label>
                  <textarea id="reply" className="textarea" placeholder={t('messages.replyTo', { name: selected.from })} value={reply} onChange={(e) => setReply(e.target.value)} />
                  <div className="mail-reply-actions">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!reply.trim()}>
                      <FiCornerUpLeft /> {t('messages.sendReply')}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <EmptyState icon={FiMail} title={t('messages.select')} text={t('messages.selectText')} />
          )}
        </div>
      </section>

      <Modal
        open={!!compose}
        onClose={() => setCompose(null)}
        title={t('messages.new')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCompose(null)}>
              {t('messages.discard')}
            </button>
            <button type="button" className="btn btn-primary" onClick={sendCompose}>
              <FiSend /> {t('common.send')}
            </button>
          </>
        }
      >
        {compose && (
          <>
            {composeErr && (
              <div className="alert alert-error" role="alert">
                {composeErr}
              </div>
            )}
            <div className="field">
              <span className="label">{t('messages.to')}</span>
              <Select
                ariaLabel={t('messages.recipient')}
                value={compose.to}
                options={recipientOptions.map((r) => ({ value: r.value, label: `${r.value} (${t(ROLE_T[r.role])})` }))}
                onChange={(v) => setCompose({ ...compose, to: v, role: recipientOptions.find((r) => r.value === v)?.role || 'School' })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-subj">
                {t('messages.subject')}
              </label>
              <input id="c-subj" className="input" placeholder={t('messages.subjectPh')} value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="c-body">
                {t('messages.message')}
              </label>
              <textarea id="c-body" className="textarea" rows={5} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
