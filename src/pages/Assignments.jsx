import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheckSquare, FiChevronUp, FiChevronDown, FiUpload, FiCalendar, FiUser, FiBook, FiUsers, FiPaperclip, FiX, FiFile } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { SearchInput, Select, Status, Segmented, EmptyState, Modal, Avatar } from '../components/ui/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { GradeChip } from '../components/dashboard/Grades.jsx';
import { saveFile, openFile, formatSize, MAX_FILE_MB } from '../lib/files.js';

const ACCEPT = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.heic';
const MAX_FILES = 5;
const isMine = (a) => a.teacher === 'Mr. Hayes' || a.created;

function FileList({ files, onRemove }) {
  const { t } = useI18n();
  if (!files?.length) return null;
  return (
    <ul className="file-list">
      {files.map((f, i) => (
        <li key={f.id || i}>
          <FiFile aria-hidden="true" />
          {f.id ? (
            <button type="button" className="file-name link-btn" onClick={() => openFile(f)}>
              {f.name}
            </button>
          ) : (
            <span className="file-name">{f.name}</span>
          )}
          <span className="file-size num">{formatSize(f.size)}</span>
          {onRemove && (
            <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('submit.removeFile', { name: f.name })} onClick={() => onRemove(i)}>
              <FiX />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Assignments() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [subject, setSubject] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [openId, setOpenId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [fileErr, setFileErr] = useState('');
  const [grade, setGrade] = useState(null);
  const [feedback, setFeedback] = useState('');
  const { toast, role, assignments, submitWork, gradeSubmission } = useApp();
  const { t, tr, ts, fmtDate, relativeDue } = useI18n();
  const isTeacher = role === 'teacher';

  // Header search navigates here with ?q= — keep the field in sync.
  useEffect(() => setQ(params.get('q') ?? ''), [params]);

  const subjects = useMemo(() => [...new Set(assignments.map((a) => a.subject))].sort((a, b) => ts(a).localeCompare(ts(b))), [assignments, ts]);
  const counts = useMemo(
    () => ({
      all: assignments.length,
      Pending: assignments.filter((a) => a.status === 'Pending').length,
      Overdue: assignments.filter((a) => a.status === 'Overdue').length,
      Completed: assignments.filter((a) => a.status === 'Completed').length,
      review: assignments.filter((a) => isMine(a) && a.submission && !a.submission.grade).length,
    }),
    [assignments]
  );

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return assignments
      .filter((a) => (tab === 'all' || (tab === 'review' ? isMine(a) && a.submission && !a.submission.grade : a.status === tab)) && (!subject || a.subject === subject) && (!n || tr(a.title).toLowerCase().includes(n) || a.teacher.toLowerCase().includes(n) || ts(a.subject).toLowerCase().includes(n)))
      .sort((a, b) => (a.due - b.due) * (sortDir === 'asc' ? 1 : -1));
  }, [assignments, tab, subject, q, sortDir, tr, ts]);

  const open = assignments.find((a) => a.id === openId) || null;
  const sub = open?.submission || null;
  const canSubmit = role === 'student' && open && open.status !== 'Completed';
  const canGrade = isTeacher && open && sub && isMine(open);

  useEffect(() => {
    setFiles([]);
    setComment('');
    setFileErr('');
    setGrade(sub?.grade ?? null);
    setFeedback(sub?.feedback ?? '');
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFiles = (list) => {
    setFileErr('');
    const next = [...files];
    for (const f of Array.from(list || [])) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setFileErr(t('submit.tooBig', { name: f.name, mb: MAX_FILE_MB }));
        continue;
      }
      if (next.length >= MAX_FILES) {
        setFileErr(t('submit.tooMany', { n: MAX_FILES }));
        break;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const submit = async () => {
    if (!files.length && !comment.trim()) {
      setFileErr(t('submit.empty'));
      return;
    }
    setSubmitting(true);
    try {
      const saved = [];
      for (const f of files) saved.push(await saveFile(f));
      submitWork(open.id, { files: saved, comment: comment.trim() });
      toast(t('assignments.submitted', { title: tr(open.title) }));
      setOpenId(null);
    } catch {
      setFileErr(t('submit.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const saveGrade = () => {
    if (!grade) return;
    gradeSubmission(open, { grade, feedback: feedback.trim() });
    toast(t('submit.graded', { grade, title: tr(open.title) }));
    setOpenId(null);
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
            ...(isTeacher ? [{ value: 'review', label: t('submit.toReview'), count: counts.review }] : []),
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
                      <span className="status-stack">
                        <Status value={a.status} />
                        {a.submission?.grade ? <GradeChip value={a.submission.grade} /> : a.submission && <span className="person-sub">{t('submit.awaiting')}</span>}
                      </span>
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
                <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <FiUpload />}
                  {submitting ? t('assignments.submitting') : t('assignments.submit')}
                </button>
              )}
              {canGrade && (
                <button type="button" className="btn btn-primary" onClick={saveGrade} disabled={!grade}>
                  {sub.grade ? t('submit.updateGrade') : t('submit.saveGrade')}
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

            {sub && (
              <div className="submission-box">
                <div className="submission-head">
                  <strong>{isTeacher ? t('submit.fromStudent', { name: 'Alex Morgan', cls: '9-A' }) : t('submit.yourWork')}</strong>
                  <span className="person-sub num">
                    {t('submit.sentAt', { date: fmtDate(new Date(sub.at), { day: 'numeric', month: 'long' }), time: new Date(sub.at).toTimeString().slice(0, 5) })}
                  </span>
                </div>
                <FileList files={sub.files} />
                {sub.comment && <p className="submission-comment">{sub.comment}</p>}
                {!canGrade &&
                  (sub.grade ? (
                    <div className="submission-grade">
                      <span>{t('submit.grade')}</span> <GradeChip value={sub.grade} />
                      {sub.feedback && <p className="submission-comment">{sub.feedback}</p>}
                    </div>
                  ) : (
                    <p className="hint">{t('submit.awaitingText')}</p>
                  ))}
              </div>
            )}
            {open.status === 'Completed' && !sub && <p className="hint">{t('submit.doneOffline')}</p>}

            {canSubmit && (
              <div className="submit-form">
                <label className={`dropzone ${submitting ? 'is-disabled' : ''}`}>
                  <FiPaperclip aria-hidden="true" />
                  <span>
                    <strong>{t('submit.attach')}</strong>
                    <em>{t('submit.attachHint', { mb: MAX_FILE_MB, n: MAX_FILES })}</em>
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <FileList files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
                <div className="field">
                  <label className="label" htmlFor="sub-comment">
                    {t('submit.comment')}
                  </label>
                  <textarea id="sub-comment" className="input textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('submit.commentPh')} />
                </div>
                {fileErr && <span className="field-error">{fileErr}</span>}
              </div>
            )}

            {canGrade && (
              <div className="submit-form">
                <span className="label">{t('submit.grade')}</span>
                <div className="gb-marks gb-marks-lg" role="radiogroup" aria-label={t('submit.grade')}>
                  {[5, 4, 3, 2].map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={grade === m} className={`gb-mark grade-${m >= 5 ? 'high' : m >= 4 ? 'mid' : 'low'} ${grade === m ? 'is-selected' : ''}`} onClick={() => setGrade(m)}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label className="label" htmlFor="sub-feedback">
                    {t('submit.feedback')}
                  </label>
                  <textarea id="sub-feedback" className="input textarea" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('submit.feedbackPh')} />
                </div>
                <p className="hint">{t('submit.toGradebook', { cls: open.cls || '9-A' })}</p>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
