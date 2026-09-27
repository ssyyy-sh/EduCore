import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiUser, FiUsers, FiBriefcase, FiKey, FiArrowRight, FiMoreHorizontal, FiTrash2, FiRefreshCw, FiDownload, FiCopy, FiAlertTriangle } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Avatar, SearchInput, Select, Menu, Modal, EmptyState } from '../components/ui/index.jsx';
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
  const { setViewAs, resetData, toast } = useApp();
  const { user, allAccounts, setAccountRole, resetPassword, deleteAccount } = useAuth();
  const { t, fmtDate } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [shown, setShown] = useState(null); // { name, email, password }
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'reset', account? }

  const counts = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, allAccounts.filter((a) => a.role === r).length])), [allAccounts]);
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

  const doResetPassword = (a) => {
    const password = newPassword();
    resetPassword(a.id, password);
    setShown({ name: a.name, email: a.email, password });
  };

  const exportBackup = () => {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith('educore.') && k !== 'educore.accounts.v1') out[k] = JSON.parse(localStorage.getItem(k));
      }
    } catch {
      /* storage unavailable */
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: out }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `educore-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

      <div className="stats-grid">
        {ROLES.map((r) => (
          <StatsCard key={r} icon={ICONS[r]} label={t(`owner.accounts.${r}`)} value={counts[r]} />
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('owner.accountsTitle')}</h3>
            <p>{t('owner.accountsSub')}</p>
          </div>
        </div>
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder={t('owner.search')} id="owner-search" style={{ flex: '1 1 240px', maxWidth: 320 }} />
          <div className="toolbar-filters">
            <Select label={t('owner.role')} value={roleFilter} allLabel={t('common.all')} options={ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} onChange={setRoleFilter} align="right" />
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
                  const locked = a.role === 'owner' || a.demo;
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
                            </span>
                            <span className="person-sub">{a.email}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('owner.role')}>
                        {locked ? (
                          <span className="owner-role-tag">{t(`roles.${a.role}`)}</span>
                        ) : (
                          <select
                            className="input select-native select-sm"
                            aria-label={t('owner.changeRole', { name: a.name })}
                            value={a.role}
                            onChange={(e) => {
                              setAccountRole(a.id, e.target.value);
                              toast(t('owner.roleChanged', { name: a.name, role: t(`roles.${e.target.value}`) }));
                            }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`roles.${r}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td data-label={t('owner.created')} className="num">
                        {a.createdAt ? fmtDate(new Date(a.createdAt), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="right">
                        {a.role !== 'owner' && (
                          <Menu
                            trigger={<FiMoreHorizontal />}
                            label={t('table.actionsFor', { name: a.name })}
                            items={[
                              { label: t('owner.resetPassword'), icon: FiRefreshCw, onClick: () => doResetPassword(a) },
                              ...(a.demo ? [] : ['sep', { label: t('owner.delete'), icon: FiTrash2, danger: true, onClick: () => setConfirm({ type: 'delete', account: a }) }]),
                            ]}
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
            <p>{t('owner.dataSub')}</p>
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
                  <FiAlertTriangle aria-hidden="true" /> {t('owner.reset')}
                </strong>
                <span>{t('owner.resetText')}</span>
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm({ type: 'reset' })}>
                {t('owner.resetBtn')}
              </button>
            </li>
          </ul>
          <p className="hint hint-box">
            <FiKey aria-hidden="true" /> {t('owner.passwordHint')}
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
        title={confirm?.type === 'reset' ? t('owner.resetTitle') : t('owner.deleteTitle')}
        description={confirm?.type === 'reset' ? t('owner.resetConfirm') : confirm ? t('owner.deleteText', { name: confirm.account.name }) : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (confirm.type === 'reset') {
                  resetData();
                  await clearFiles();
                  toast(t('owner.resetDone'));
                } else {
                  deleteAccount(confirm.account.id);
                  toast(t('owner.deleted', { name: confirm.account.name }));
                }
                setConfirm(null);
              }}
            >
              {confirm?.type === 'reset' ? t('owner.resetBtn') : t('owner.delete')}
            </button>
          </>
        }
      />
    </div>
  );
}
