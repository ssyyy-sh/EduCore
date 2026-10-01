import { useState } from 'react';
import { FiPlus, FiTrash2, FiVolume2 } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { Avatar, Modal, EmptyState, Segmented } from '../components/ui/index.jsx';
import { CLASSES } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const TITLE_MAX = 90;
const BODY_MAX = 1200;

export default function Announcements() {
  const { role, announcements, addAnnouncement, removeAnnouncement, toast, myClasses } = useApp();
  const { user } = useAuth();
  const { t, tr, fmtDate } = useI18n();
  const canPost = role === 'school' || (role === 'teacher' && myClasses.length > 0);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('all');

  const audienceLabel = (a) => (a.startsWith('class:') ? t('announcements.aud.class', { cls: a.slice(6) }) : t(`announcements.aud.${a}`));
  const mine = (a) => a.author === user?.name && String(a.id).startsWith('u-');
  const canDelete = (a) => String(a.id).startsWith('u-') && (role === 'school' || mine(a));

  const audienceOptions =
    role === 'school'
      ? [
          { value: 'all', label: t('announcements.aud.all') },
          { value: 'students', label: t('announcements.aud.students') },
          { value: 'parents', label: t('announcements.aud.parents') },
          { value: 'teachers', label: t('announcements.aud.teachers') },
          ...CLASSES.map((c) => ({ value: `class:${c.name}`, label: t('announcements.aud.class', { cls: c.name }) })),
        ]
      : myClasses.map((c) => ({ value: `class:${c}`, label: t('announcements.aud.class', { cls: c }) }));

  const list = filter === 'mine' ? announcements.filter(mine) : announcements;

  const publish = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = t('announcements.errTitle');
    if (!form.body.trim()) errors.body = t('announcements.errBody');
    if (Object.keys(errors).length) return setForm({ ...form, errors });
    addAnnouncement({ title: form.title.trim(), body: form.body.trim(), audience: form.audience });
    toast(t('announcements.published', { aud: audienceLabel(form.audience) }));
    setForm(null);
  };

  return (
    <div className="page">
      <PageHeader
        title={t('announcements.title')}
        description={canPost ? t('announcements.subStaff') : t('announcements.sub')}
        actions={
          canPost && (
            <button type="button" className="btn btn-primary" onClick={() => setForm({ title: '', body: '', audience: audienceOptions[0].value, errors: {} })}>
              <FiPlus /> {t('announcements.new')}
            </button>
          )
        }
      />

      {canPost && (
        <div className="tabs-row">
          <Segmented
            label={t('announcements.title')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('common.all'), count: announcements.length },
              { value: 'mine', label: t('announcements.mine'), count: announcements.filter(mine).length },
            ]}
          />
        </div>
      )}

      {list.length === 0 ? (
        <section className="panel">
          <EmptyState icon={FiVolume2} title={t('announcements.none')} text={canPost ? t('announcements.noneStaff') : t('announcements.noneText')} />
        </section>
      ) : (
        <div className="ann-list">
          {list.map((a) => (
            <article key={a.id} className="panel ann-card">
              <header className="ann-head">
                <Avatar name={a.author} size={32} />
                <div className="ann-meta">
                  <strong>{a.author}</strong>
                  <span className="num">{fmtDate(a.at, { day: 'numeric', month: 'long' })}</span>
                </div>
                <span className="badge">{audienceLabel(a.audience)}</span>
                {canDelete(a) && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('announcements.delete')} onClick={() => setConfirm(a)}>
                    <FiTrash2 />
                  </button>
                )}
              </header>
              <h3 className="ann-title">{tr(a.title)}</h3>
              <p className="ann-body">{tr(a.body)}</p>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={t('announcements.new')}
        description={t('announcements.newDesc')}
        width={560}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={publish}>
              {t('announcements.publish')}
            </button>
          </>
        }
      >
        {form && (
          <>
            <div className="field">
              <label className="label" htmlFor="an-aud">
                {t('announcements.audience')}
              </label>
              <select id="an-aud" className="input select-native" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {audienceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="an-title">
                {t('announcements.fTitle')}
              </label>
              <input id="an-title" className="input" maxLength={TITLE_MAX} value={form.title} aria-invalid={!!form.errors.title} onChange={(e) => setForm({ ...form, title: e.target.value, errors: { ...form.errors, title: '' } })} />
              {form.errors.title && <span className="field-error">{form.errors.title}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="an-body">
                {t('announcements.fBody')}
              </label>
              <textarea id="an-body" className="input textarea" rows={6} maxLength={BODY_MAX} value={form.body} aria-invalid={!!form.errors.body} onChange={(e) => setForm({ ...form, body: e.target.value, errors: { ...form.errors, body: '' } })} />
              <span className="hint num">
                {form.body.length}/{BODY_MAX}
              </span>
              {form.errors.body && <span className="field-error">{form.errors.body}</span>}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('announcements.deleteTitle')}
        description={confirm ? t('announcements.deleteText', { title: tr(confirm.title) }) : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeAnnouncement(confirm.id);
                setConfirm(null);
                toast(t('announcements.deleted'));
              }}
            >
              {t('announcements.delete')}
            </button>
          </>
        }
      />
    </div>
  );
}
