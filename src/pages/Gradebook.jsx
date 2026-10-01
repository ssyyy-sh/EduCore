import { useMemo, useState } from 'react';
import { FiPlus, FiDownload, FiTrash2, FiLock, FiCheckCircle } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import { GradeChip } from '../components/dashboard/Grades.jsx';
import { Avatar, SearchInput, Select, Segmented, Modal, EmptyState, Popover } from '../components/ui/index.jsx';
import { CLASSES, GRADE_LEVELS, TODAY, isoDay, WEEKDAYS } from '../data/mock.js';
import { lessonsForClass } from '../lib/timetable.js';
import { useApp, GRADE_SUBJECT } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

const MARKS = [5, 4, 3, 2];
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Proposed term grade: the average rounded half up (4.5 → 5, 3.49 → 3). */
export const proposeGrade = (a) => (a == null ? null : Math.max(2, Math.min(5, Math.floor(a + 0.5 + 1e-9))));

function FinalCell({ final, proposed, readOnly, label, onSet }) {
  const { t } = useI18n();
  const shown = final?.grade ?? proposed;
  const inner = final ? (
    <span className="final-set">
      <GradeChip value={final.grade} />
      <FiCheckCircle aria-hidden="true" />
    </span>
  ) : proposed ? (
    <span className="final-proposed" title={t('gradebook.proposed')}>
      {proposed}
    </span>
  ) : (
    <span className="t-muted">—</span>
  );
  if (readOnly) return <span className="gb-cell is-readonly">{inner}</span>;
  return (
    <Popover
      align="right"
      role="menu"
      label={label}
      className="gb-pop"
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className={`gb-cell gb-final ${open ? 'is-open' : ''}`} onClick={toggle} aria-label={`${label}: ${shown ?? '—'}${final ? '' : ` (${t('gradebook.proposed')})`}`}>
          {inner}
        </button>
      )}
    >
      {(close) => (
        <div className="gb-marks">
          {MARKS.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={final?.grade === m}
              className={`gb-mark grade-${m >= 5 ? 'high' : m >= 4 ? 'mid' : 'low'} ${final?.grade === m ? 'is-selected' : ''} ${!final && proposed === m ? 'is-proposed' : ''}`}
              onClick={() => {
                onSet(m);
                close();
              }}
            >
              {m}
            </button>
          ))}
          {final && (
            <button
              type="button"
              className="gb-mark gb-clear"
              onClick={() => {
                onSet(null);
                close();
              }}
              aria-label={t('gradebook.clearFinal')}
            >
              —
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

function MarkCell({ value, onSet, readOnly, label }) {
  const { t } = useI18n();
  if (readOnly) return <span className="gb-cell is-readonly">{value ? <GradeChip value={value} /> : <span className="t-muted">—</span>}</span>;
  return (
    <Popover
      align="left"
      role="menu"
      label={label}
      className="gb-pop"
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className={`gb-cell ${open ? 'is-open' : ''}`} onClick={toggle} aria-label={`${label}: ${value ?? '—'}`}>
          {value ? <GradeChip value={value} /> : <span className="gb-empty">+</span>}
        </button>
      )}
    >
      {(close) => (
        <div className="gb-marks">
          {MARKS.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={value === m}
              className={`gb-mark grade-${m >= 5 ? 'high' : m >= 4 ? 'mid' : 'low'} ${value === m ? 'is-selected' : ''}`}
              onClick={() => {
                onSet(m);
                close();
              }}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            className="gb-mark gb-clear"
            onClick={() => {
              onSet(null);
              close();
            }}
            aria-label={t('gradebook.clear')}
          >
            —
          </button>
        </div>
      )}
    </Popover>
  );
}

export default function Gradebook() {
  const { role, students, gradebookColumns, getMark, setMark, addColumn, removeColumn, getFinal, setFinals, toast, myTeacherClasses, timetable } = useApp();
  const [confirmFinals, setConfirmFinals] = useState(false);
  const { t, tr, ts, fmtDate, fmtDec } = useI18n();
  const isTeacher = role === 'teacher';
  const [pick, setCls] = useState(null);
  const cls = isTeacher ? (myTeacherClasses.some((c) => c.name === pick) ? pick : myTeacherClasses[0]?.name || '') : pick || '9-A';
  const [subjPick, setSubject] = useState('Mathematics');
  const [year, setYear] = useState('9');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // { title, date, type }
  const [confirm, setConfirm] = useState(null);

  const clsInfo = myTeacherClasses.find((c) => c.name === cls);
  // Subjects of this class (from the timetable) for the admin's read-only view.
  const classSubjects = useMemo(() => {
    const set = new Set(['Mathematics']);
    for (const d of WEEKDAYS) for (const l of lessonsForClass(timetable, cls, d)) set.add(GRADE_SUBJECT[l.subject] || l.subject);
    return [...set].sort();
  }, [timetable, cls]);
  const subject = isTeacher ? GRADE_SUBJECT[clsInfo?.subject] || clsInfo?.subject || 'Mathematics' : classSubjects.includes(subjPick) ? subjPick : classSubjects[0];
  const readOnly = !isTeacher;
  const columns = gradebookColumns(cls, subject);
  const roster = useMemo(() => students.filter((s) => s.className === cls && s.status !== 'Inactive').sort((a, b) => a.name.localeCompare(b.name)), [students, cls]);
  const rows = roster.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const colTitle = (c) => (c.titleL ? tr(c.titleL) : tr(c.title));

  const studentAvg = (s) => avg(columns.map((c) => getMark(cls, s, c.id)).filter(Boolean));
  const colAvg = (c) => avg(roster.map((s) => getMark(cls, s, c.id)).filter(Boolean));
  const classAvg = avg(roster.map(studentAvg).filter((x) => x != null));
  const finalOf = (st) => getFinal(cls, st.id, subject);
  const pendingFinals = roster.filter((st) => !finalOf(st) && proposeGrade(studentAvg(st)));
  const confirmedCount = roster.filter((st) => finalOf(st)).length;

  const exportCSV = () => {
    const ok = downloadCSV(`edufy-gradebook-${cls}.csv`, [
      [t('table.name'), 'ID', ...columns.map((c) => `${colTitle(c)} (${fmtDate(c.date)})`), t('gradebook.average'), t('gradebook.final')],
      ...roster.map((s) => [s.name, s.id, ...columns.map((c) => getMark(cls, s, c.id) ?? ''), studentAvg(s) != null ? fmtDec(studentAvg(s)) : '', finalOf(s)?.grade ?? '']),
    ]);
    if (ok) toast(t('gradebook.exported'));
  };

  const classOptions = isTeacher
    ? myTeacherClasses.map((c) => ({ value: c.name, label: `${c.name} · ${ts(c.subject)}` }))
    : CLASSES.filter((c) => String(c.grade) === String(year)).map((c) => ({ value: c.name, label: c.name }));

  return (
    <div className="page">
      <PageHeader
        title={t('gradebook.title')}
        description={isTeacher ? t('gradebook.subTeacher', { subject: ts(subject) }) : t('gradebook.subAdmin')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCSV}>
              <FiDownload /> {t('common.exportCsv')}
            </button>
            {isTeacher && (
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmFinals(true)} disabled={pendingFinals.length === 0}>
                <FiCheckCircle /> {t('gradebook.confirmFinals')}
              </button>
            )}
            {isTeacher && (
              <button type="button" className="btn btn-primary" onClick={() => setModal({ title: '', date: isoDay(TODAY), type: 'Quiz', error: '' })}>
                <FiPlus /> {t('gradebook.addColumn')}
              </button>
            )}
          </>
        }
      />

      <div className="filters-row">
        {isTeacher ? (
          <Segmented label={t('table.class')} value={cls} onChange={setCls} options={classOptions} />
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
            <Select label={t('table.class')} value={cls} options={classOptions} onChange={setCls} />
            <Select label={t('grades.colSubject')} value={subject} options={classSubjects.map((x) => ({ value: x, label: ts(x) }))} onChange={setSubject} />
          </div>
        )}
        <SearchInput value={q} onChange={setQ} placeholder={t('dash.teacher.searchClass')} id="gb-search" style={{ width: 240 }} />
      </div>

      {readOnly && (
        <p className="hint hint-box">
          <FiLock aria-hidden="true" /> {t('gradebook.readOnly')}
        </p>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('gradebook.classTitle', { cls })}</h3>
            <p>{t('gradebook.classSub', { n: roster.length, avg: classAvg != null ? fmtDec(classAvg) : '—', cols: columns.length })}</p>
          </div>
        </div>
        <div className="panel-body flush">
          {rows.length === 0 ? (
            <EmptyState title={t('dash.teacher.noStudents')} text={t('dash.teacher.noStudentsText', { cls, q })} />
          ) : (
            <div className="table-wrap gb-wrap">
              <table className="table gb-table">
                <thead>
                  <tr>
                    <th className="gb-sticky">{t('table.name')}</th>
                    {columns.map((c) => (
                      <th key={c.id} className="gb-col">
                        <span className="gb-col-title" title={colTitle(c)}>
                          {colTitle(c)}
                        </span>
                        <span className="gb-col-meta num">
                          {fmtDate(c.date)} · {t(`types.${c.type}`)}
                          {isTeacher && (
                            <button type="button" className="gb-col-del" aria-label={t('gradebook.removeColumn')} onClick={() => setConfirm(c)}>
                              <FiTrash2 />
                            </button>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="right">{t('gradebook.average')}</th>
                    <th className="center gb-final-th" title={t('gradebook.finalHint')}>
                      {t('gradebook.final')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const a = studentAvg(s);
                    return (
                      <tr key={s.id}>
                        <td className="gb-sticky">
                          <div className="person">
                            <Avatar name={s.name} />
                            <span className="person-text">
                              <span className="person-name">{s.name}</span>
                              <span className="person-sub mono">{s.id}</span>
                            </span>
                          </div>
                        </td>
                        {columns.map((c) => (
                          <td key={c.id} className="gb-td">
                            <MarkCell
                              value={getMark(cls, s, c.id)}
                              readOnly={readOnly}
                              label={`${s.name} · ${colTitle(c)}`}
                              onSet={(m) => {
                                setMark(cls, s, c, m, subject);
                                if (m) toast(t('gradebook.saved', { name: s.name, grade: m }));
                              }}
                            />
                          </td>
                        ))}
                        <td className="right num cell-strong">{a != null ? fmtDec(a) : '—'}</td>
                        <td className="gb-td">
                          <FinalCell
                            final={finalOf(s)}
                            proposed={proposeGrade(a)}
                            readOnly={readOnly}
                            label={`${s.name} · ${t('gradebook.final')}`}
                            onSet={(g) => {
                              setFinals(cls, subject, [{ studentId: s.id, grade: g }]);
                              toast(g ? t('gradebook.finalSaved', { name: s.name, grade: g }) : t('gradebook.finalCleared'));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="gb-sticky">{t('gradebook.classAverage')}</td>
                    {columns.map((c) => (
                      <td key={c.id} className="gb-td num">
                        {colAvg(c) != null ? fmtDec(colAvg(c)) : '—'}
                      </td>
                    ))}
                    <td className="right num cell-strong">{classAvg != null ? fmtDec(classAvg) : '—'}</td>
                    <td className="gb-td num">
                      {confirmedCount}/{roster.length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={t('gradebook.addColumn')}
        description={t('gradebook.addColumnDesc', { cls })}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!modal.title.trim()) return setModal({ ...modal, error: t('dash.teacher.errTitle') });
                addColumn(cls, { title: modal.title.trim(), date: new Date(`${modal.date}T12:00:00`), type: modal.type, subject });
                setModal(null);
                toast(t('gradebook.columnAdded'));
              }}
            >
              {t('gradebook.add')}
            </button>
          </>
        }
      >
        {modal && (
          <>
            <div className="field">
              <label className="label" htmlFor="gb-title">
                {t('dash.teacher.fTitle')}
              </label>
              <input id="gb-title" className="input" value={modal.title} aria-invalid={!!modal.error} onChange={(e) => setModal({ ...modal, title: e.target.value, error: '' })} placeholder={t('gradebook.titlePh')} />
              {modal.error && <span className="field-error">{modal.error}</span>}
            </div>
            <div className="form-row">
              <div className="field">
                <label className="label" htmlFor="gb-date">
                  {t('gradebook.date')}
                </label>
                <input id="gb-date" className="input" type="date" value={modal.date} max={isoDay(TODAY)} onChange={(e) => setModal({ ...modal, date: e.target.value || isoDay(TODAY) })} />
              </div>
              <div className="field">
                <label className="label" htmlFor="gb-type">
                  {t('gradebook.type')}
                </label>
                <select id="gb-type" className="input select-native" value={modal.type} onChange={(e) => setModal({ ...modal, type: e.target.value })}>
                  {['Quiz', 'Homework', 'Project', 'Essay', 'Lab report'].map((ty) => (
                    <option key={ty} value={ty}>
                      {t(`types.${ty}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={confirmFinals}
        onClose={() => setConfirmFinals(false)}
        title={t('gradebook.confirmFinals')}
        description={t('gradebook.confirmFinalsText', { n: pendingFinals.length, cls })}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmFinals(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFinals(cls, subject, pendingFinals.map((st) => ({ studentId: st.id, grade: proposeGrade(studentAvg(st)) })));
                setConfirmFinals(false);
                toast(t('gradebook.finalsConfirmed', { n: pendingFinals.length }));
              }}
            >
              {t('gradebook.confirmFinalsBtn', { n: pendingFinals.length })}
            </button>
          </>
        }
      >
        <p className="hint">{t('gradebook.finalHint')}</p>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('gradebook.removeTitle')}
        description={confirm ? t('gradebook.removeText', { title: colTitle(confirm) }) : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeColumn(cls, confirm.id);
                setConfirm(null);
                toast(t('gradebook.columnRemoved'));
              }}
            >
              {t('gradebook.removeColumn')}
            </button>
          </>
        }
      />
    </div>
  );
}
