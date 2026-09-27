import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUserPlus, FiMoreHorizontal, FiEdit2, FiArchive, FiRotateCcw, FiCopy, FiX, FiUsers, FiDownload } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { Avatar, SearchInput, Select, Segmented, Pagination, Status, Modal, Menu, EmptyState } from '../components/ui/index.jsx';
import { CLASSES, GRADE_LEVELS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

const SUBJECTS = ['Mathematics', 'English Literature', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science', 'Economics', 'Art & Design', 'Music', 'Physical Education', 'French', 'Reading'];

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  const arr = new Uint32Array(10);
  (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(arr) : arr.forEach((_, i) => (arr[i] = Math.random() * 1e9));
  arr.forEach((n) => (p += chars[n % chars.length]));
  return `${p}!`;
}

/** Class picker: chips + add select. */
function ClassChips({ value, onChange }) {
  const { t } = useI18n();
  const [year, setYear] = useState('9');
  return (
    <div className="field">
      <span className="label">{t('staff.classes')}</span>
      <div className="chips">
        {value.length === 0 && <span className="hint">{t('staff.noClasses')}</span>}
        {value.map((c) => (
          <span key={c} className="chip">
            {c}
            <button type="button" aria-label={t('staff.removeClass', { cls: c })} onClick={() => onChange(value.filter((x) => x !== c))}>
              <FiX />
            </button>
          </span>
        ))}
      </div>
      <div className="chips-add">
        <Select value={year} ariaLabel={t('table.fGrade')} options={GRADE_LEVELS.map((g) => ({ value: String(g), label: t('common.yearGroup', { n: g }) }))} onChange={setYear} />
        <Select
          value=""
          allLabel={t('staff.addClass')}
          ariaLabel={t('staff.addClass')}
          options={CLASSES.filter((c) => String(c.grade) === year && !value.includes(c.name)).map((c) => ({ value: c.name, label: c.name }))}
          onChange={(v) => v && onChange([...value, v])}
        />
      </div>
    </div>
  );
}

export default function Staff() {
  const { teachers, tutors, students, addTeacher, editTeacher, setTutor, toast } = useApp();
  const { createAccount, remote } = useAuth();
  const { t, ts, tStatus, fmtNum } = useI18n();
  const [tab, setTab] = useState('teachers');
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('Active');
  const [page, setPage] = useState(1);
  const [year, setYear] = useState('');
  const [addForm, setAddForm] = useState(null);
  const [created, setCreated] = useState(null);
  const [edit, setEdit] = useState(null);
  const [tutorFor, setTutorFor] = useState(null);

  const byId = useMemo(() => Object.fromEntries(teachers.map((x) => [x.id, x])), [teachers]);
  const classSize = useMemo(() => students.reduce((acc, s) => ((acc[s.className] = (acc[s.className] || 0) + (s.status === 'Inactive' ? 0 : 1)), acc), {}), [students]);
  const teachersPerClass = useMemo(() => {
    const acc = {};
    teachers.filter((x) => x.status === 'Active').forEach((x) => x.classes.forEach((c) => (acc[c] = (acc[c] || 0) + 1)));
    return acc;
  }, [teachers]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return teachers.filter((x) => (!status || x.status === status) && (!subject || x.subject === subject) && (!n || x.name.toLowerCase().includes(n) || x.email.includes(n) || x.classes.some((c) => c.toLowerCase() === n)));
  }, [teachers, q, subject, status]);
  const pageRows = filtered.slice((page - 1) * 25, page * 25);
  const activeCount = teachers.filter((x) => x.status === 'Active').length;

  const classes = CLASSES.filter((c) => !year || String(c.grade) === year);

  const submitAdd = async () => {
    const errs = {};
    if (!addForm.name.trim()) errs.name = t('auth.register.errName');
    if (!/^\S+@\S+\.\S+$/.test(addForm.email.trim())) errs.email = t('auth.register.errEmail');
    if (Object.keys(errs).length) return setAddForm({ ...addForm, errors: errs });
    const password = randomPassword();
    setAddForm({ ...addForm, busy: true, errors: {} });
    const res = await createAccount({ name: addForm.name, email: addForm.email, password, role: 'teacher' });
    if (!res.ok) return setAddForm({ ...addForm, busy: false, errors: { email: res.error === 'exists' ? t('auth.register.errExists') : t('auth.login.errNetwork') } });
    addTeacher({ name: addForm.name.trim(), email: addForm.email.trim().toLowerCase(), subject: addForm.subject, classes: addForm.classes });
    setAddForm(null);
    setCreated({ name: addForm.name.trim(), email: addForm.email.trim().toLowerCase(), password: res.invite ? null : password });
  };

  const signUpUrl = __HASH_ROUTER__ ? `${window.location.origin}${window.location.pathname}#/register` : `${window.location.origin}/register`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('staff.copied'));
    } catch {
      /* clipboard blocked — the text stays selectable */
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('staff.title')}
        description={t('staff.sub', { teachers: fmtNum(activeCount), classes: fmtNum(CLASSES.length) })}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const ok = downloadCSV('educore-teachers.csv', [[t('table.name'), t('table.email'), t('staff.subject'), t('staff.classes'), t('table.status')], ...filtered.map((x) => [x.name, x.email, ts(x.subject), x.classes.join(' '), tStatus(x.status)])]);
                if (ok) toast(t('table.exportedRows', { n: filtered.length }));
              }}
            >
              <FiDownload /> {t('common.exportCsv')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setAddForm({ name: '', email: '', subject: 'Mathematics', classes: [], errors: {} })}>
              <FiUserPlus /> {t('staff.add')}
            </button>
          </>
        }
      />

      <div className="tabs-row">
        <Segmented
          label={t('staff.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'teachers', label: t('staff.teachers'), count: fmtNum(activeCount) },
            { value: 'classes', label: t('staff.classesTab'), count: CLASSES.length },
          ]}
        />
      </div>

      {tab === 'teachers' ? (
        <section className="panel">
          <div className="toolbar">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('staff.search')} id="staff-search" style={{ flex: '1 1 240px', maxWidth: 320 }} />
            <div className="toolbar-filters">
              <Select label={t('staff.subject')} value={subject} allLabel={t('common.all')} options={SUBJECTS.map((s) => ({ value: s, label: ts(s) }))} onChange={(v) => { setSubject(v); setPage(1); }} />
              <Select label={t('table.fStatus')} value={status} allLabel={t('common.all')} options={['Active', 'Inactive'].map((s) => ({ value: s, label: tStatus(s) }))} onChange={(v) => { setStatus(v); setPage(1); }} align="right" />
            </div>
          </div>
          {pageRows.length === 0 ? (
            <EmptyState icon={FiUsers} title={t('staff.none')} text={t('table.emptyText')} />
          ) : (
            <div className="table-wrap">
              <table className="table table-cards">
                <thead>
                  <tr>
                    <th>{t('table.name')}</th>
                    <th>{t('staff.subject')}</th>
                    <th>{t('staff.classes')}</th>
                    <th>{t('table.status')}</th>
                    <th>
                      <span className="sr-only">{t('table.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((x) => (
                    <tr key={x.id}>
                      <td data-label={t('table.name')}>
                        <div className="person">
                          <Avatar name={x.name} />
                          <span className="person-text">
                            <span className="person-name">
                              {x.name}
                              {x.isNew && <span className="badge badge-accent badge-inline">{t('common.new')}</span>}
                            </span>
                            <span className="person-sub">{x.email}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('staff.subject')}>{ts(x.subject)}</td>
                      <td data-label={t('staff.classes')}>
                        <div className="chips chips-sm">
                          {x.classes.slice(0, 4).map((c) => (
                            <span key={c} className="class-tag mono">
                              {c}
                            </span>
                          ))}
                          {x.classes.length > 4 && <span className="t-muted">+{x.classes.length - 4}</span>}
                          {x.classes.length === 0 && <span className="t-muted">—</span>}
                        </div>
                      </td>
                      <td data-label={t('table.status')}>
                        <Status value={x.status} />
                      </td>
                      <td className="right">
                        <Menu
                          trigger={<FiMoreHorizontal />}
                          label={t('table.actionsFor', { name: x.name })}
                          items={[
                            { label: t('staff.edit'), icon: FiEdit2, onClick: () => setEdit({ id: x.id, name: x.name, subject: x.subject, classes: [...x.classes] }) },
                            'sep',
                            x.status === 'Active'
                              ? { label: t('staff.archive'), icon: FiArchive, danger: true, onClick: () => { editTeacher(x.id, { status: 'Inactive' }); toast(t('staff.archived', { name: x.name })); } }
                              : { label: t('staff.restore'), icon: FiRotateCcw, onClick: () => { editTeacher(x.id, { status: 'Active' }); toast(t('staff.restored', { name: x.name })); } },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={25} total={filtered.length} onPage={setPage} noun={t('staff.noun')} />
        </section>
      ) : (
        <section className="panel">
          <div className="toolbar">
            <div className="toolbar-filters">
              <Select label={t('table.fGrade')} value={year} allLabel={t('common.all')} options={GRADE_LEVELS.map((g) => ({ value: String(g), label: t('common.yearGroup', { n: g }) }))} onChange={setYear} />
            </div>
            <span className="hint num">{t('staff.classesCount', { n: classes.length })}</span>
          </div>
          <div className="table-wrap table-scroll-y" style={{ maxHeight: 620 }}>
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t('table.class')}</th>
                  <th>{t('staff.studentsCol')}</th>
                  <th>{t('staff.tutor')}</th>
                  <th>{t('staff.teachersCol')}</th>
                  <th>
                    <span className="sr-only">{t('table.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const tutor = byId[tutors[c.name]];
                  return (
                    <tr key={c.name}>
                      <td data-label={t('table.class')}>
                        <span className="class-tag mono">{c.name}</span>
                      </td>
                      <td data-label={t('staff.studentsCol')} className="num">
                        <Link to={`/app/students?class=${encodeURIComponent(c.name)}`} className="link-more">
                          {classSize[c.name] || 0}
                        </Link>
                      </td>
                      <td data-label={t('staff.tutor')}>{tutor ? tutor.name : <span className="t-muted">—</span>}</td>
                      <td data-label={t('staff.teachersCol')} className="num">
                        {teachersPerClass[c.name] || 0}
                      </td>
                      <td className="right">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTutorFor({ cls: c.name, teacherId: tutors[c.name] || '' })}>
                          {t('staff.changeTutor')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add teacher */}
      <Modal
        open={!!addForm}
        onClose={() => setAddForm(null)}
        title={t('staff.add')}
        description={remote ? t('staff.inviteDesc') : t('staff.addDesc')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setAddForm(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={submitAdd} disabled={addForm?.busy}>
              {remote ? t('staff.inviteBtn') : t('staff.addBtn')}
            </button>
          </>
        }
      >
        {addForm && (
          <>
            <div className="form-row">
              <div className="field">
                <label className="label" htmlFor="st-name">
                  {t('auth.register.name')}
                </label>
                <input id="st-name" className="input" value={addForm.name} aria-invalid={!!addForm.errors.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                {addForm.errors.name && <span className="field-error">{addForm.errors.name}</span>}
              </div>
              <div className="field">
                <label className="label" htmlFor="st-email">
                  {t('auth.email')}
                </label>
                <input id="st-email" className="input" type="email" value={addForm.email} aria-invalid={!!addForm.errors.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                {addForm.errors.email && <span className="field-error">{addForm.errors.email}</span>}
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="st-subject">
                {t('staff.subject')}
              </label>
              <select id="st-subject" className="input select-native" value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {ts(s)}
                  </option>
                ))}
              </select>
            </div>
            <ClassChips value={addForm.classes} onChange={(classesV) => setAddForm({ ...addForm, classes: classesV })} />
          </>
        )}
      </Modal>

      {/* Created: show the login once */}
      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title={created?.password ? t('staff.createdTitle') : t('staff.inviteTitle')}
        description={created?.password ? t('staff.createdText') : t('staff.inviteText')}
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setCreated(null)}>
            {t('staff.done')}
          </button>
        }
      >
        {created && (
          <dl className="detail-dl login-box">
            <div>
              <dt>{t('table.name')}</dt>
              <dd>{created.name}</dd>
            </div>
            <div>
              <dt>{t('auth.email')}</dt>
              <dd className="mono">{created.email}</dd>
            </div>
            {created.password ? (
            <div>
              <dt>{t('auth.password')}</dt>
              <dd className="mono">
                {created.password}
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('staff.copy')} onClick={() => copy(`${created.email}\n${created.password}`)}>
                  <FiCopy />
                </button>
              </dd>
            </div>
            ) : (
              <div>
                <dt>{t('staff.signUpAt')}</dt>
                <dd className="mono">
                  {signUpUrl}
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('staff.copy')} onClick={() => copy(`${signUpUrl}\n${created.email}`)}>
                    <FiCopy />
                  </button>
                </dd>
              </div>
            )}
          </dl>
        )}
      </Modal>

      {/* Edit teacher */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? edit.name : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                editTeacher(edit.id, { subject: edit.subject, classes: edit.classes });
                setEdit(null);
                toast(t('staff.saved'));
              }}
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        {edit && (
          <>
            <div className="field">
              <label className="label" htmlFor="ed-subject">
                {t('staff.subject')}
              </label>
              <select id="ed-subject" className="input select-native" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })}>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {ts(s)}
                  </option>
                ))}
              </select>
            </div>
            <ClassChips value={edit.classes} onChange={(classesV) => setEdit({ ...edit, classes: classesV })} />
          </>
        )}
      </Modal>

      {/* Form tutor */}
      <Modal
        open={!!tutorFor}
        onClose={() => setTutorFor(null)}
        title={tutorFor ? t('staff.tutorFor', { cls: tutorFor.cls }) : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTutorFor(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!tutorFor?.teacherId}
              onClick={() => {
                setTutor(tutorFor.cls, tutorFor.teacherId);
                toast(t('staff.tutorSaved', { cls: tutorFor.cls, name: byId[tutorFor.teacherId]?.name }));
                setTutorFor(null);
              }}
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        {tutorFor && (
          <div className="field">
            <label className="label" htmlFor="tutor-select">
              {t('staff.tutor')}
            </label>
            <select id="tutor-select" className="input select-native" value={tutorFor.teacherId} onChange={(e) => setTutorFor({ ...tutorFor, teacherId: e.target.value })}>
              <option value="">—</option>
              {[...teachers]
                .filter((x) => x.status === 'Active')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {ts(x.subject)}
                  </option>
                ))}
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}
