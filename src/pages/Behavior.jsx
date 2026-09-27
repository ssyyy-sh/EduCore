import { useMemo, useState } from 'react';
import { FiThumbsUp, FiAlertCircle, FiTrash2, FiStar } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { Avatar, Modal, EmptyState, Segmented, SearchInput, Select } from '../components/ui/index.jsx';
import { TEACHER_CLASSES, CHILDREN, CLASSES, GRADE_LEVELS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export const CATEGORIES = {
  praise: ['participation', 'help', 'achievement', 'effort'],
  remark: ['homework', 'late', 'disruption', 'unprepared'],
};

function Entry({ b, canDelete, onDelete, showStudent, studentName }) {
  const { t, tr, fmtDate } = useI18n();
  const Icon = b.kind === 'praise' ? FiThumbsUp : FiAlertCircle;
  return (
    <li className={`beh-entry is-${b.kind}`}>
      <span className="beh-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="beh-main">
        <strong>
          {t(`behavior.kind.${b.kind}`)} · {t(`behavior.cat.${b.category}`)}
          {showStudent && <span className="t-muted"> — {studentName}</span>}
        </strong>
        {b.note && <p>{tr(b.note)}</p>}
        <span className="num">
          {b.author} · {fmtDate(b.date, { day: 'numeric', month: 'long' })}
        </span>
      </div>
      {canDelete && (
        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={t('behavior.delete')} onClick={() => onDelete(b)}>
          <FiTrash2 />
        </button>
      )}
    </li>
  );
}

/* ---------- Teacher / admin ---------- */
function StaffBehavior() {
  const { role, students, behavior, addBehavior, removeBehavior, toast } = useApp();
  const { user } = useAuth();
  const { t } = useI18n();
  const isTeacher = role === 'teacher';
  const [cls, setCls] = useState(isTeacher ? TEACHER_CLASSES[0].name : '9-A');
  const [year, setYear] = useState('9');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null); // { student, kind, category, note }

  const roster = useMemo(() => students.filter((s) => s.className === cls && s.status !== 'Inactive').sort((a, b) => a.name.localeCompare(b.name)), [students, cls]);
  const rows = roster.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const entries = behavior.filter((b) => b.cls === cls);
  const nameOf = (id) => students.find((s) => s.id === id)?.name || id;
  const monthAgo = Date.now() - 30 * 86400000;
  const recent = entries.filter((b) => b.date.getTime() >= monthAgo);
  const countFor = (sid, kind) => entries.filter((b) => b.studentId === sid && b.kind === kind).length;

  const save = async () => {
    const ok = await addBehavior({ studentId: form.student.id, cls, kind: form.kind, category: form.category, note: form.note.trim() });
    if (ok !== false) toast(t(form.kind === 'praise' ? 'behavior.savedPraise' : 'behavior.savedRemark', { name: form.student.name }));
    setForm(null);
  };

  return (
    <div className="page">
      <PageHeader title={t('behavior.title')} description={isTeacher ? t('behavior.subTeacher') : t('behavior.subAdmin')} />
      <div className="filters-row">
        {isTeacher ? (
          <Segmented label={t('table.class')} value={cls} onChange={setCls} options={TEACHER_CLASSES.map((c) => ({ value: c.name, label: c.name }))} />
        ) : (
          <div className="filters-row-right">
            <Select
              label={t('table.fGrade')}
              value={year}
              options={GRADE_LEVELS.map((g) => ({ value: String(g), label: t('common.yearGroup', { n: g }) }))}
              onChange={(v) => {
                setYear(v);
                setCls(`${v}-A`);
              }}
            />
            <Select label={t('table.class')} value={cls} options={CLASSES.filter((c) => String(c.grade) === year).map((c) => ({ value: c.name, label: c.name }))} onChange={setCls} />
          </div>
        )}
        <SearchInput value={q} onChange={setQ} placeholder={t('dash.teacher.searchClass')} id="beh-search" style={{ width: 240 }} />
      </div>
      <div className="stats-grid stats-grid-3">
        <StatsCard icon={FiThumbsUp} label={t('behavior.praise30')} value={recent.filter((b) => b.kind === 'praise').length} />
        <StatsCard icon={FiAlertCircle} label={t('behavior.remark30')} value={recent.filter((b) => b.kind === 'remark').length} />
        <StatsCard icon={FiStar} label={t('behavior.students')} value={new Set(recent.map((b) => b.studentId)).size} hint={t('behavior.ofN', { n: roster.length })} />
      </div>
      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('gradebook.classTitle', { cls })}</h3>
              <p>{isTeacher ? t('behavior.rosterHint') : t('behavior.readOnly')}</p>
            </div>
          </div>
          <div className="panel-body flush">
            {rows.length === 0 ? (
              <EmptyState title={t('dash.teacher.noStudents')} />
            ) : (
              <div className="table-wrap table-scroll-y">
                <table className="table att-table">
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="person">
                            <Avatar name={s.name} />
                            <span className="person-text">
                              <span className="person-name">{s.name}</span>
                              <span className="person-sub num">
                                <span className="t-success">+{countFor(s.id, 'praise')}</span> · <span className="t-danger">−{countFor(s.id, 'remark')}</span>
                              </span>
                            </span>
                          </div>
                        </td>
                        {isTeacher && (
                          <td className="right">
                            <div className="beh-actions">
                              <button type="button" className="btn btn-secondary btn-sm beh-praise" onClick={() => setForm({ student: s, kind: 'praise', category: 'participation', note: '' })}>
                                <FiThumbsUp /> <span>{t('behavior.kind.praise')}</span>
                              </button>
                              <button type="button" className="btn btn-secondary btn-sm beh-remark" onClick={() => setForm({ student: s, kind: 'remark', category: 'homework', note: '' })}>
                                <FiAlertCircle /> <span>{t('behavior.kind.remark')}</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('behavior.recent')}</h3>
          </div>
          <div className="panel-body">
            {entries.length === 0 ? (
              <p className="muted-note">{t('behavior.noneClass')}</p>
            ) : (
              <ul className="beh-list">
                {entries.slice(0, 30).map((b) => (
                  <Entry key={b.id} b={b} showStudent studentName={nameOf(b.studentId)} canDelete={b.authorId === user.id || role === 'school'} onDelete={(x) => removeBehavior(x.id).then(() => toast(t('behavior.deleted')))} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form ? `${t(`behavior.kind.${form.kind}`)}: ${form.student.name}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              {t('common.save')}
            </button>
          </>
        }
      >
        {form && (
          <>
            <Segmented
              label={t('behavior.kindLabel')}
              value={form.kind}
              onChange={(k) => setForm({ ...form, kind: k, category: CATEGORIES[k][0] })}
              options={[
                { value: 'praise', label: t('behavior.kind.praise') },
                { value: 'remark', label: t('behavior.kind.remark') },
              ]}
            />
            <div className="field">
              <span className="label">{t('behavior.category')}</span>
              <div className="cat-pick" role="radiogroup" aria-label={t('behavior.category')}>
                {CATEGORIES[form.kind].map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={form.category === c} className={form.category === c ? 'is-active' : ''} onClick={() => setForm({ ...form, category: c })}>
                    {t(`behavior.cat.${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="beh-note">
                {t('behavior.note')}
              </label>
              <textarea id="beh-note" className="input textarea" rows={3} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('behavior.notePh')} />
              <span className="hint">{t('behavior.visible')}</span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ---------- Student / parent ---------- */
function FamilyBehavior() {
  const { role, behavior } = useApp();
  const { t } = useI18n();
  const [childId, setChildId] = useState('alex');
  const child = CHILDREN.find((c) => c.id === (role === 'student' ? 'alex' : childId));
  const [filter, setFilter] = useState('all');
  const list = behavior.filter((b) => b.studentId === child.studentId);
  const shown = list.filter((b) => filter === 'all' || b.kind === filter);
  return (
    <div className="page">
      <PageHeader title={t('behavior.title')} description={t('behavior.subFamily', { name: child.full, cls: child.className })} />
      {role === 'parent' && <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={CHILDREN.map((c) => ({ value: c.id, label: `${c.name} · ${c.className}` }))} />}
      <div className="stats-grid stats-grid-3">
        <StatsCard icon={FiThumbsUp} label={t('behavior.praiseTerm')} value={list.filter((b) => b.kind === 'praise').length} />
        <StatsCard icon={FiAlertCircle} label={t('behavior.remarkTerm')} value={list.filter((b) => b.kind === 'remark').length} />
        <StatsCard icon={FiStar} label={t('behavior.last')} value={list[0] ? t(`behavior.kind.${list[0].kind}`) : '—'} />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h3>{t('behavior.history')}</h3>
          <Segmented
            label={t('behavior.kindLabel')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('common.all'), count: list.length },
              { value: 'praise', label: t('behavior.kind.praise') },
              { value: 'remark', label: t('behavior.kind.remark') },
            ]}
          />
        </div>
        <div className="panel-body">
          {shown.length === 0 ? (
            <EmptyState icon={FiStar} title={t('behavior.none')} text={t('behavior.noneText')} />
          ) : (
            <ul className="beh-list">
              {shown.map((b) => (
                <Entry key={b.id} b={b} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Behavior() {
  const { role } = useApp();
  return role === 'teacher' || role === 'school' ? <StaffBehavior /> : <FamilyBehavior />;
}
