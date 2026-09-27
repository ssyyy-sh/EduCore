import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheckSquare, FiChevronUp, FiChevronDown, FiUpload, FiCalendar, FiUser, FiBook, FiUsers } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { SearchInput, Select, Status, Segmented, EmptyState, Modal, Avatar } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Assignments() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [subject, setSubject] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [openId, setOpenId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast, role, assignments, submitAssignment } = useApp();
  const { t, tr, ts, fmtDate, relativeDue } = useI18n();

  // Header search navigates here with ?q= — keep the field in sync.
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  const subjects = useMemo(() => [...new Set(assignments.map((a) => a.subject))].sort((a, b) => ts(a).localeCompare(ts(b))), [assignments, ts]);
  const counts = useMemo(
    () => ({
      all: assignments.length,
      Pending: assignments.filter((a) => a.status === 'Pending').length,
      Overdue: assignments.filter((a) => a.status === 'Overdue').length,
      Completed: assignments.filter((a) => a.status === 'Completed').length,
    }),
    [assignments]
  );

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return assignments
      .filter((a) => (tab === 'all' || a.status === tab) && (!subject || a.subject === subject) && (!n || tr(a.title).toLowerCase().includes(n) || a.teacher.toLowerCase().includes(n) || ts(a.subject).toLowerCase().includes(n)))
      .sort((a, b) => (a.due - b.due) * (sortDir === 'asc' ? 1 : -1));
  }, [assignments, tab, subject, q, sortDir, tr, ts]);

  const open = assignments.find((a) => a.id === openId) || null;
  const canSubmit = role === 'student';

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      submitAssignment(open.id);
      setSubmitting(false);
      toast(t('assignments.submitted', { title: tr(open.title) }));
      setOpenId(null);
    }, 600);
  };

  return (
    <div className="page">
      <PageHeader title={t('assignments.title')} description={t('assignments.sub', { pending: counts.Pending, overdue: counts.Overdue, completed: counts.Completed })} />

      <div className="tabs-row">
        <Segmented
          label={t('assignments.statusLabel')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: t('common.all'), count: counts.all },
            { value: 'Pending', label: t('status.Pending'), count: counts.Pending },
            { value: 'Overdue', label: t('status.Overdue'), count: counts.Overdue },
            { value: 'Completed', label: t('status.Completed'), count: counts.Completed },
          ]}
        />
      </div>

      <section className="panel">
        <div className="toolbar">
          <SearchInput value={q} onChange={setQ} placeholder={t('assignments.search')} id="assign-search" style={{ flex: '1 1 240px', maxWidth: 340 }} />
          <div className="toolbar-filters">
            <Select label={t('assignments.subject')} value={subject} onChange={setSubject} allLabel={t('common.all')} options={subjects.map((s) => ({ value: s, label: ts(s) }))} align="right" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={FiCheckSquare}
            title={tab === 'Overdue' && !q && !subject ? t('assignments.nothingOverdue') : t('assignments.none')}
            text={tab === 'Overdue' && !q && !subject ? t('assignments.nothingOverdueText') : t('assignments.noneText')}
            action={
              (q || subject) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setQ('');
                    setSubject('');
                  }}
                >
                  {t('assignments.clearFilters')}
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t('assignments.colAssignment')}</th>
                  <th>{t('assignments.colSubject')}</th>
                  <th>{t('assignments.colTeacher')}</th>
                  <th className="sortable is-sorted" aria-sort={sortDir === 'asc' ? 'ascending' : 'descending'}>
                    <button type="button" className="th-inner" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                      {t('assignments.colDue')} {sortDir === 'asc' ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                    </button>
                  </th>
                  <th>{t('assignments.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => setOpenId(a.id)} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenId(a.id))}>
                    <td data-label={t('assignments.colAssignment')}>
                      <div className="cell-title">
                        <span className="cell-strong">{tr(a.title)}</span>
                        <span className="person-sub">
                          {t(`types.${a.type}`)} · {t('assignments.weight', { w: a.weight })}
                          {a.cls ? ` · ${a.cls}` : ''}
                        </span>
                      </div>
                    </td>
                    <td data-label={t('assignments.colSubject')}>{ts(a.subject)}</td>
                    <td data-label={t('assignments.colTeacher')}>
                      <div className="person">
                        <Avatar name={a.teacher} size={22} />
                        {a.teacher}
                      </div>
                    </td>
                    <td data-label={t('assignments.colDue')} className="num">
                      <span className="due-cell">
                        <span className={a.status === 'Overdue' ? 't-danger' : ''}>{fmtDate(a.due, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span className="person-sub">{relativeDue(a.due)}</span>
                      </span>
                    </td>
                    <td data-label={t('assignments.colStatus')}>
                      <Status value={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? tr(open.title) : ''}
        description={open ? `${ts(open.subject)} · ${t(`types.${open.type}`)}` : ''}
        width={560}
        footer={
          open && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setOpenId(null)}>
                {t('common.close')}
              </button>
              {canSubmit && (
                <button type="button" className="btn btn-primary" onClick={submit} disabled={open.status === 'Completed' || submitting}>
                  {submitting ? <span className="spinner" /> : <FiUpload />}
                  {open.status === 'Completed' ? t('assignments.submittedBtn') : submitting ? t('assignments.submitting') : t('assignments.submit')}
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <Status value={open.status} />
            <dl className="detail-dl">
              <div>
                <dt>
                  <FiCalendar aria-hidden="true" /> {t('assignments.due')}
                </dt>
                <dd>{fmtDate(open.due, { weekday: 'long', day: 'numeric', month: 'long', cap: true })} · 23:59</dd>
              </div>
              <div>
                <dt>
                  <FiUser aria-hidden="true" /> {t('assignments.teacher')}
                </dt>
                <dd>{open.teacher}</dd>
              </div>
              {open.cls && (
                <div>
                  <dt>
                    <FiUsers aria-hidden="true" /> {t('table.class')}
                  </dt>
                  <dd>{open.cls}</dd>
                </div>
              )}
              <div>
                <dt>
                  <FiBook aria-hidden="true" /> {t('assignments.weightLabel')}
                </dt>
                <dd>{t('assignments.ofTerm', { w: open.weight })}</dd>
              </div>
            </dl>
            <p className="detail-text">{open.instructions || t('assignments.details')}</p>
          </>
        )}
      </Modal>
    </div>
  );
}
