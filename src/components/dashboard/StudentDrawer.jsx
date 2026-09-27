import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiX, FiMail, FiHash, FiUsers } from 'react-icons/fi';
import { Avatar, Status, Bar } from '../ui/index.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function StudentDrawer({ student, onClose }) {
  const { t, fmtDec } = useI18n();
  const navigate = useNavigate();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panel = useRef(null);

  useEffect(() => {
    if (!student) return undefined;
    const prev = document.activeElement;
    const h = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', h);
    const f = setTimeout(() => panel.current?.querySelector('button')?.focus(), 20);
    return () => {
      clearTimeout(f);
      document.removeEventListener('keydown', h);
      prev?.focus?.();
    };
  }, [student]);

  if (!student) return null;
  const s = student;
  const hasGuardian = s.guardian && s.guardian !== '—';
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('table.profile', { name: s.name })} ref={panel}>
        <div className="drawer-head">
          <div className="person">
            <Avatar name={s.name} size={44} />
            <div>
              <h2>{s.name}</h2>
              <span className="person-sub">{t('table.yearClass', { cls: s.className, year: s.grade })}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label={t('common.close')}>
            <FiX />
          </button>
        </div>
        <div className="drawer-body">
          <Status value={s.status} />
          <div className="drawer-stats">
            <div>
              <span>{t('table.grade')}</span>
              <strong className="num">{s.isNew ? '—' : `${fmtDec(s.score)}%`}</strong>
            </div>
            <div>
              <span>{t('table.attendance')}</span>
              <strong className="num">{fmtDec(s.attendance)}%</strong>
            </div>
            <div>
              <span>{t('table.progress')}</span>
              <strong className="num">{s.isNew ? '—' : `${s.progress}%`}</strong>
            </div>
          </div>
          <div className="drawer-block">
            <h3>{t('table.termProgress')}</h3>
            <Bar value={s.progress} />
          </div>
          <dl className="drawer-dl">
            <div>
              <dt>
                <FiHash aria-hidden="true" /> {t('table.id')}
              </dt>
              <dd className="mono">{s.id}</dd>
            </div>
            <div>
              <dt>
                <FiMail aria-hidden="true" /> {t('table.email')}
              </dt>
              <dd>{s.email || '—'}</dd>
            </div>
            <div>
              <dt>
                <FiUsers aria-hidden="true" /> {t('table.guardian')}
              </dt>
              <dd>
                {s.guardian}
                {s.guardianEmail ? <span className="person-sub">{s.guardianEmail}</span> : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="drawer-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasGuardian}
            onClick={() => {
              onClose();
              navigate(`/app/messages?to=${encodeURIComponent(s.guardian)}&role=Parent`);
            }}
          >
            <FiMail /> {t('table.msgGuardian')}
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
