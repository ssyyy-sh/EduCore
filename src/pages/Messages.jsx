import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiEdit, FiSend, FiArrowLeft, FiMessageSquare, FiCheck } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { Avatar, SearchInput, EmptyState, Modal } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useRelTime } from '../components/dashboard/useRelTime.js';

const MAX = 4000;
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Real-time chat between people of the school (teacher ↔ parent, staff ↔ anyone). */
export default function Messages() {
  const [params, setParams] = useSearchParams();
  const { chat, contacts, sendChat, markChatRead, toast } = useApp();
  const { t, tr, fmtDate } = useI18n();
  const rel = useRelTime();
  const [activeId, setActiveId] = useState(null);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState(null); // search text in "new chat"
  const [mobileThread, setMobileThread] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const nameOf = (id) => contacts.find((c) => c.id === id)?.name || t('chat.unknown');
  const roleOf = (id) => contacts.find((c) => c.id === id)?.role;

  // Conversations: one per person, newest first.
  const threads = useMemo(() => {
    const map = new Map();
    for (const m of chat) {
      const other = m.mine ? m.to : m.from;
      const th = map.get(other) || { id: other, last: null, unread: 0 };
      th.last = m;
      if (!m.mine && !m.readAt) th.unread += 1;
      map.set(other, th);
    }
    return [...map.values()].sort((a, b) => b.last.date - a.last.date);
  }, [chat]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return threads.filter((th) => !n || nameOf(th.id).toLowerCase().includes(n));
  }, [threads, q, contacts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a conversation from a link: ?chat=<id> or ?to=<name>.
  useEffect(() => {
    const id = params.get('chat');
    const to = params.get('to');
    if (!id && !to) return;
    if (id) {
      setActiveId(id);
      setMobileThread(true);
    } else {
      const n = to.toLowerCase().replace(/^(mr|ms|mrs|dr)\.?\s+/, '');
      const match = contacts.find((c) => c.name.toLowerCase().includes(n));
      if (match) {
        setActiveId(match.id);
        setMobileThread(true);
      } else setPicker(to.replace(/^(mr|ms|mrs|dr)\.?\s+/i, ''));
    }
    params.delete('chat');
    params.delete('to');
    params.delete('role');
    setParams(params, { replace: true });
  }, [params, setParams, contacts]);

  const active = activeId || (!mobileThread && shown[0]?.id) || null;
  const messages = useMemo(() => chat.filter((m) => (m.mine ? m.to : m.from) === active), [chat, active]);

  // Reading a conversation marks it read.
  useEffect(() => {
    if (active && messages.some((m) => !m.mine && !m.readAt)) markChatRead(active);
  }, [active, messages, markChatRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [active, messages.length]);

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !active) return;
    setDraft('');
    const ok = await sendChat(active, body.slice(0, MAX));
    if (ok === false) setDraft(body);
    inputRef.current?.focus();
  };

  const open = (id) => {
    setActiveId(id);
    setMobileThread(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pickList = useMemo(() => {
    const n = (picker || '').trim().toLowerCase();
    return contacts.filter((c) => !n || c.name.toLowerCase().includes(n) || t(`roles.${c.role}`).toLowerCase().includes(n));
  }, [contacts, picker, t]);

  const totalUnread = threads.reduce((a, th) => a + th.unread, 0);

  return (
    <div className="page">
      <PageHeader
        title={t('chat.title')}
        description={totalUnread ? t('chat.subUnread', { n: totalUnread }) : t('chat.sub')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setPicker('')}>
            <FiEdit /> {t('chat.new')}
          </button>
        }
      />

      <section className={`panel chat ${mobileThread ? 'is-thread' : ''}`}>
        <aside className="chat-list">
          <div className="chat-list-head">
            <SearchInput value={q} onChange={setQ} placeholder={t('chat.search')} id="chat-search" />
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={FiMessageSquare} title={threads.length ? t('chat.noMatch') : t('chat.none')} text={threads.length ? '' : t('chat.noneText')} />
          ) : (
            <ul>
              {shown.map((th) => (
                <li key={th.id}>
                  <button type="button" className={`chat-item ${active === th.id ? 'is-active' : ''} ${th.unread ? 'is-unread' : ''}`} onClick={() => open(th.id)}>
                    <Avatar name={nameOf(th.id)} size={36} />
                    <span className="chat-item-main">
                      <span className="chat-item-top">
                        <strong>{nameOf(th.id)}</strong>
                        <em>{rel(th.last.date)}</em>
                      </span>
                      <span className="chat-item-sub">
                        <span className="chat-preview">
                          {th.last.mine && `${t('chat.you')}: `}
                          {tr(th.last.body)}
                        </span>
                        {th.unread > 0 && <span className="chat-badge num">{th.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="chat-thread">
          {!active ? (
            <EmptyState icon={FiMessageSquare} title={t('chat.pick')} text={t('chat.pickText')} />
          ) : (
            <>
              <header className="chat-thread-head">
                <button type="button" className="btn btn-ghost btn-icon btn-sm chat-back" onClick={() => setMobileThread(false)} aria-label={t('chat.back')}>
                  <FiArrowLeft />
                </button>
                <Avatar name={nameOf(active)} size={34} />
                <div>
                  <strong>{nameOf(active)}</strong>
                  <span>{roleOf(active) ? t(`roles.${roleOf(active)}`) : ''}</span>
                </div>
              </header>
              <div className="chat-messages" aria-live="polite">
                {messages.length === 0 && <p className="chat-empty">{t('chat.firstMessage', { name: nameOf(active) })}</p>}
                {messages.map((m, i) => {
                  const newDay = i === 0 || dayKey(messages[i - 1].date) !== dayKey(m.date);
                  return (
                    <div key={m.id} className="chat-row-wrap">
                      {newDay && <div className="chat-day num">{fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long', cap: true })}</div>}
                      <div className={`chat-row ${m.mine ? 'is-mine' : ''}`}>
                        <div className="chat-bubble">
                          <p>{tr(m.body)}</p>
                          <span className="chat-meta num">
                            {hhmm(m.date)}
                            {m.mine && m.readAt && <FiCheck aria-label={t('chat.read')} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form className="chat-compose" onSubmit={send}>
                <textarea
                  ref={inputRef}
                  className="input textarea"
                  rows={1}
                  value={draft}
                  maxLength={MAX}
                  placeholder={t('chat.placeholder')}
                  aria-label={t('chat.placeholder')}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={!draft.trim()} aria-label={t('chat.send')}>
                  <FiSend />
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <Modal open={picker !== null} onClose={() => setPicker(null)} title={t('chat.new')} description={t('chat.newDesc')}>
        {picker !== null && (
          <>
            <SearchInput value={picker} onChange={setPicker} placeholder={t('chat.searchPeople')} id="chat-picker" />
            <ul className="contact-list">
              {pickList.length === 0 && <li className="hint">{contacts.length ? t('chat.noMatch') : t('chat.noContacts')}</li>}
              {pickList.slice(0, 50).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicker(null);
                      open(c.id);
                      if (!threads.some((th) => th.id === c.id)) toast(t('chat.started', { name: c.name }));
                    }}
                  >
                    <Avatar name={c.name} size={30} />
                    <span>
                      <strong>{c.name}</strong>
                      <em>{t(`roles.${c.role}`)}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}
