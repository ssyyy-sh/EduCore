import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiUser, FiUsers, FiBriefcase, FiKey, FiArrowRight, FiMoreHorizontal, FiTrash2, FiRefreshCw, FiDownload, FiCopy, FiAlertTriangle, FiLock, FiUnlock, FiMail, FiClock } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Avatar, SearchInput, Select, Menu, Modal, EmptyState, SelectField } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { clearFiles } from '../lib/files.js';
import { MIN_PASSWORD } from '../config.js';

const ROLES = ['student', 'parent', 'teacher', 'school'];
const ICONS = { student: FiBookOpen, parent: FiUser, teacher: FiUsers, school: FiBriefcase, owner: FiKey };

function newPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(Math.max(10, MIN_PASSWORD));
  window.crypto.getRandomValues(arr);
  return `${Array.from(arr, (n) => chars[n % chars.length]).join('')}!`;
}

export default function Owner() {
  const { setViewAs, resetData, backupData, toast } = useApp();
  const { user, remote, allAccounts, setAccountRole, resetPassword, deleteAccount, blockAccount } = useAuth();
  const { t, fmtDate } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [shown, setShown] = useState(null); // { name, email, password }
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'reset', account? }
  const [typed, setTyped] = useState('');
  // With the server, erasing affects the real school: the owner types a word to confirm.
  const eraseWord = t('owner.eraseWord');
  const needWord = remote && confirm?.type === 'reset';
  const wordOk = !needWord || typed.trim().toUpperCase() === eraseWord.toUpperCase();

  const counts = useMemo(() => Object.fromEntries([...ROLES, 'pending'].map((r) => [r, allAccounts.filter((a) => a.role === r).length])), [allAccounts]);
  const roleOptions = remote ? [...ROLES, 'pending'] : ROLES;
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return allAccounts
      .filter((a) => (!roleFilter || a.role === roleFilter) && (!n || a.name.toLowerCase().includes(n) || a.email.includes(n)))
      .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name)));
  }, [allAccounts, q, roleFilter]);

  const openAs = (r) => {
    setViewAs(r);
    navigate(`/app/${r}`);
  };

  const doResetPassword = async (a) => {
    if (remote) {
      const res = await resetPassword(a.id);
      toast(res.ok ? t('owner.resetEmailSent', { email: a.email }) : t('sync.error'));
      return;
    }
    const password = newPassword();
    resetPassword(a.id, password);
    setShown({ name: a.name, email: a.email, password });
  };

  const exportBackup = async () => {
    let out = {};
    if (remote) {
      try {
        out = await backupData();
      } catch {
        toast(t('sync.error'));
        return;
      }
    } else {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith('educore.') && k !== 'educore.accounts.v1' && k !== 'educore.auth') out[k] = JSON.parse(localStorage.getItem(k));
        }
      } catch {
        /* storage unavailable */
      }
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: out }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edufy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast(t('owner.backupDone'));
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('staff.copied'));
    } catch {
      /* clipboard blocked — text stays selectable */
    }
  };

  return (
    <div className="page">
      <PageHeader title={t('owner.title')} description={t('owner.sub')} />

      <section>
        <div className="section-title">
          <h2>{t('owner.viewAs')}</h2>
        </div>
        <div className="owner-roles">
          {ROLES.map((r) => {
            const I = ICONS[r];
            return (
              <button key={r} type="button" className="owner-role" onClick={() => openAs(r)}>
                <span className="owner-role-icon">
                  <I aria-hidden="true" />
                </span>
                <span className="owner-role-text">
                  <strong>{t(`roles.${r}`)}</strong>
                  <span>{t(`owner.roleHint.${r}`)}</span>
                </span>
                <FiArrowRight aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {remote && counts.pending > 0 && (
        <button type="button" className="pending-banner" onClick={() => setRoleFilter('pending')}>
          <FiClock aria-hidden="true" /> {t('owner.pendingBanner', { n: counts.pending })}
        </button>
      )}

      <div className="stats-grid">
        {ROLES.map((r) => (
          <StatsCard key={r} icon={ICONS[r]} label={t(`owner.accounts.${r}`)} value={counts[r]} />
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('owner.accountsTitle')}</h3>
            <p>{remote ? t('owner.accountsSubRemote') : t('owner.accountsSub')}</p>
          </div>
        </div>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder={t('owner.search')} id="owner-search" style={{ flex: '1 1 240px', maxWidth: 320 }} />
          <div className="toolbar-filters">
            <Select label={t('owner.role')} value={roleFilter} allLabel={t('common.all')} options={roleOptions.map((r) => ({ value: r, label: t(`roles.${r}`) }))} onChange={setRoleFilter} align="right" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={t('owner.none')} />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t('table.name')}</th>
                  <th>{t('owner.role')}</th>
                  <th>{t('owner.created')}</th>
                  <th>
                    <span className="sr-only">{t('table.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const locked = a.role === 'owner' || a.demo || a.id === user.id;
                  return (
                    <tr key={a.id}>
                      <td data-label={t('table.name')}>
                        <div className="person">
                          <Avatar name={a.name} />
                          <span className="person-text">
                            <span className="person-name">
                              {a.name}
                              {a.id === user.id && <span className="badge badge-accent badge-inline">{t('owner.you')}</span>}
                              {a.demo && <span className="badge badge-inline">{t('owner.demo')}</span>}
                              {a.disabled && <span className="badge badge-danger badge-inline">{t('owner.blocked')}</span>}
                              {a.role === 'pending' && a.requested_role && <span className="badge badge-warning badge-inline">{t('owner.wants', { role: t(`roles.${a.requested_role}`) })}</span>}
                            </span>
                            <span className="person-sub">{a.email}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('owner.role')}>
                        {locked ? (
                          <span className="owner-role-tag">{t(`roles.${a.role}`)}</span>
                        ) : (
                          <SelectField
                            size="sm"
                            className="owner-role-select"
                            ariaLabel={t('owner.changeRole', { name: a.name })}
                            value={a.role}
                            options={roleOptions.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
                            onChange={async (r) => {
                              if (r === a.role) return;
                              const ok = await setAccountRole(a.id, r);
                              toast(ok ? t('owner.roleChanged', { name: a.name, role: t(`roles.${r}`) }) : t('sync.error'));
                            }}
                          />
                        )}
                      </td>
                      <td data-label={t('owner.created')} className="num">
                        {a.createdAt ? fmtDate(new Date(a.createdAt), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="right">
                        {a.role !== 'owner' && a.id !== user.id && (
                          <Menu
                            trigger={<FiMoreHorizontal />}
                            label={t('table.actionsFor', { name: a.name })}
                            items={
                              remote
                                ? [
                                    { label: t('owner.sendReset'), icon: FiMail, onClick: () => doResetPassword(a) },
                                    'sep',
                                    a.disabled
                                      ? { label: t('owner.unblock'), icon: FiUnlock, onClick: async () => toast((await blockAccount(a.id, false)) ? t('owner.unblocked', { name: a.name }) : t('sync.error')) }
                                      : { label: t('owner.block'), icon: FiLock, danger: true, onClick: () => setConfirm({ type: 'block', account: a }) },
                                  ]
                                : [
                                    { label: t('owner.resetPassword'), icon: FiRefreshCw, onClick: () => doResetPassword(a) },
                                    ...(a.demo ? [] : ['sep', { label: t('owner.delete'), icon: FiTrash2, danger: true, onClick: () => setConfirm({ type: 'delete', account: a }) }]),
                                  ]
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('owner.dataTitle')}</h3>
            <p>{remote ? t('owner.dataSubRemote') : t('owner.dataSub')}</p>
          </div>
        </div>
        <div className="panel-body">
          <ul className="setting-list">
            <li>
              <div>
                <strong>
                  <FiDownload aria-hidden="true" /> {t('owner.backup')}
                </strong>
                <span>{t('owner.backupText')}</span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={exportBackup}>
                {t('owner.backupBtn')}
              </button>
            </li>
            <li>
              <div>
                <strong>
                  <FiAlertTriangle aria-hidden="true" /> {remote ? t('owner.resetRemote') : t('owner.reset')}
                </strong>
                <span>{remote ? t('owner.resetTextRemote') : t('owner.resetText')}</span>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setTyped('');
                  setConfirm({ type: 'reset' });
                }}
              >
                {remote ? t('owner.eraseBtn') : t('owner.resetBtn')}
              </button>
            </li>
          </ul>
          <p className="hint hint-box">
            <FiKey aria-hidden="true" /> {remote ? t('owner.remoteHint') : t('owner.passwordHint')}
          </p>
        </div>
      </section>

      <Modal
        open={!!shown}
        onClose={() => setShown(null)}
        title={t('owner.newPasswordTitle')}
        description={t('owner.newPasswordText')}
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setShown(null)}>
            {t('staff.done')}
          </button>
        }
      >
        {shown && (
          <dl className="detail-dl login-box">
            <div>
              <dt>{t('table.name')}</dt>
              <dd>{shown.name}</dd>
            </div>
            <div>
              <dt>{t('auth.email')}</dt>
              <dd className="mono">{shown.email}</dd>
            </div>
            <div>
              <dt>{t('auth.password')}</dt>
              <dd className="mono">
                {shown.password}
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('staff.copy')} onClick={() => copy(`${shown.email}\n${shown.password}`)}>
                  <FiCopy />
                </button>
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'reset' ? (remote ? `${t('owner.resetRemote')}?` : t('owner.resetTitle')) : confirm?.type === 'block' ? t('owner.blockTitle') : t('owner.deleteTitle')}
        description={
          confirm?.type === 'reset' ? (remote ? t('owner.resetConfirmRemote') : t('owner.resetConfirm')) : confirm?.type === 'block' ? t('owner.blockText', { name: confirm.account.name }) : confirm ? t('owner.deleteText', { name: confirm.account.name }) : ''
        }
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!wordOk}
              onClick={async () => {
                if (!wordOk) return;
                if (confirm.type === 'reset') {
                  const ok = await resetData();
                  await clearFiles();
                  if (ok) toast(remote ? t('owner.eraseDone') : t('owner.resetDone'));
                } else if (confirm.type === 'block') {
                  const ok = await blockAccount(confirm.account.id, true);
                  toast(ok ? t('owner.blockedToast', { name: confirm.account.name }) : t('sync.error'));
                } else {
                  deleteAccount(confirm.account.id);
                  toast(t('owner.deleted', { name: confirm.account.name }));
                }
                setConfirm(null);
              }}
            >
              {confirm?.type === 'reset' ? (remote ? t('owner.eraseBtn') : t('owner.resetBtn')) : confirm?.type === 'block' ? t('owner.block') : t('owner.delete')}
            </button>
          </>
        }
      >
        {needWord && (
          <div className="field">
            <button type="button" className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }} onClick={exportBackup}>
              <FiDownload /> {t('owner.backupFirst')}
            </button>
            <label className="label" htmlFor="erase-word" style={{ marginTop: 12 }}>
              {t('owner.eraseType', { word: eraseWord })}
            </label>
            <input id="erase-word" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} placeholder={eraseWord} />
          </div>
        )}
      </Modal>
    </div>
  );
}
