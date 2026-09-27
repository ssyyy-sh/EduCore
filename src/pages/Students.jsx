import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiDownload, FiUserPlus, FiFileText } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StudentTable, { exportStudentsCSV } from '../components/dashboard/StudentTable.jsx';
import StudentDrawer from '../components/dashboard/StudentDrawer.jsx';
import { Modal, Segmented } from '../components/ui/index.jsx';
import { CLASSES, ORG } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

const EMPTY_FORM = { first: '', last: '', cls: '9-A', guardian: '', email: '' };

export default function Students() {
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(null);
  const [modal, setModal] = useState(params.get('add') === '1');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const { toast, students, addStudent, role } = useApp();
  const { t, tStatus, fmtNum } = useI18n();

  useEffect(() => {
    if (params.get('add') === '1') {
      setModal(true);
      params.delete('add');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const counts = useMemo(() => students.reduce((acc, s) => ((acc[s.status] = (acc[s.status] || 0) + 1), acc), {}), [students]);
  const remaining = ORG.capacity - students.length;
  const canEdit = role === 'school';

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.first.trim()) errs.first = t('students.errFirst');
    if (!form.last.trim()) errs.last = t('students.errLast');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t('students.errEmail');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = addStudent({ name: `${form.first.trim()} ${form.last.trim()}`, className: form.cls, email: form.email.trim(), guardian: form.guardian.trim() });
    if (!res.ok) {
      setErrors({ form: t('students.full') });
      return;
    }
    setModal(false);
    toast(t('students.added', { name: res.student.name, cls: form.cls }));
    setForm(EMPTY_FORM);
    setDrawer(res.student);
  };

  const template = () => {
    if (downloadCSV('educore-import-template.csv', [[t('students.first'), t('students.last'), t('students.class'), t('students.guardianName'), t('students.gEmail')], ['Alex', 'Morgan', '9-A', 'Sarah Morgan', 'sarah@example.com']])) toast(t('students.importDone'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('students.title')}
        description={t('students.sub', { enrolled: fmtNum(students.length), active: fmtNum(counts.Active || 0), capacity: fmtNum(ORG.capacity) })}
        actions={
          <>
            {canEdit && (
              <button type="button" className="btn btn-secondary" onClick={template}>
                <FiFileText /> {t('students.template')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (exportStudentsCSV(students, t, tStatus)) toast(t('students.exported', { n: fmtNum(students.length) }));
              }}
            >
              <FiDownload /> {t('students.exportAll')}
            </button>
            {canEdit && (
              <button type="button" className="btn btn-primary" onClick={() => { setErrors({}); setModal(true); }}>
                <FiUserPlus /> {t('students.add')}
              </button>
            )}
          </>
        }
      />

      <Segmented
        label={t('students.statusFilter')}
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: t('common.all'), count: fmtNum(students.length) },
          ...['Active', 'At risk', 'On leave', 'Inactive'].map((s) => ({ value: s, label: tStatus(s), count: fmtNum(counts[s] || 0) })),
        ]}
      />

      <StudentTable initialQuery={params.get('q') ?? ''} initialClass={params.get('class') ?? ''} initialStatus={status} onOpen={setDrawer} />
      <StudentDrawer student={drawer ? students.find((x) => x.id === drawer.id) || drawer : null} onClose={() => setDrawer(null)} />

      <Modal
        open={modal && canEdit}
        onClose={() => setModal(false)}
        title={t('students.add')}
        description={t('students.modalDesc')}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" form="add-student" className="btn btn-primary" disabled={remaining <= 0}>
              {t('students.add')}
            </button>
          </>
        }
      >
        <form id="add-student" onSubmit={submit} noValidate className="modal-form">
          {errors.form && (
            <div className="alert alert-error" role="alert">
              {errors.form}
            </div>
          )}
          <div className="form-row">
            <div className="field">
              <label className="label" htmlFor="as-first">
                {t('students.first')}
              </label>
              <input id="as-first" className="input" value={form.first} aria-invalid={!!errors.first} onChange={(e) => setForm({ ...form, first: e.target.value })} />
              {errors.first && <span className="field-error">{errors.first}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="as-last">
                {t('students.last')}
              </label>
              <input id="as-last" className="input" value={form.last} aria-invalid={!!errors.last} onChange={(e) => setForm({ ...form, last: e.target.value })} />
              {errors.last && <span className="field-error">{errors.last}</span>}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="as-class">
              {t('students.class')}
            </label>
            <select id="as-class" className="input select-native" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
              {CLASSES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field">
              <label className="label" htmlFor="as-guardian">
                {t('students.guardianName')} <span className="hint">{t('students.optional')}</span>
              </label>
              <input id="as-guardian" className="input" value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="as-email">
                {t('students.gEmail')} <span className="hint">{t('students.optional')}</span>
              </label>
              <input id="as-email" className="input" type="email" placeholder="name@example.com" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          </div>
          <p className="hint num">{t('students.seats', { used: fmtNum(students.length), total: fmtNum(ORG.capacity), left: fmtNum(Math.max(0, remaining)) })}</p>
        </form>
      </Modal>
    </div>
  );
}
