import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronUp, FiChevronDown, FiMoreHorizontal, FiUser, FiMail, FiArchive, FiDownload, FiX, FiSliders, FiUsers } from 'react-icons/fi';
import { Avatar, BarInline, Status, SearchInput, Select, Pagination, EmptyState, Menu, Skeleton } from '../ui/index.jsx';
import { CLASSES, GRADE_LEVELS, STATUSES } from '../../data/mock.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { downloadCSV } from '../../lib/download.js';

const ATT = [
  { value: 'lt90', key: 'lt90', test: (v) => v < 90 },
  { value: '90-95', key: 'b90', test: (v) => v >= 90 && v < 95 },
  { value: 'gte95', key: 'gte95', test: (v) => v >= 95 },
];
const PERF = [
  { value: 'lt70', key: 'lt70', test: (v) => v < 70 },
  { value: '70-85', key: 'b70', test: (v) => v >= 70 && v < 85 },
  { value: 'gte85', key: 'gte85', test: (v) => v >= 85 },
];
const COLS = ['name', 'className', 'score', 'attendance', 'progress', 'status'];
const COL_LABEL = { name: 'name', className: 'class', score: 'grade', attendance: 'attendance', progress: 'progress', status: 'status' };

function classSort(a, b) {
  const [ga, sa] = a.split('-');
  const [gb, sb] = b.split('-');
  return Number(ga) - Number(gb) || sa.localeCompare(sb);
}

/** Exports rows as CSV with headers in the current language. */
export function exportStudentsCSV(rows, t, tStatus, filename = 'edufy-students.csv') {
  return downloadCSV(filename, [
    ['ID', t('table.name'), t('table.class'), `${t('table.grade')} %`, `${t('table.attendance')} %`, `${t('table.progress')} %`, t('table.status'), t('table.guardian'), t('table.email')],
    ...rows.map((s) => [s.id, s.name, s.className, s.score, s.attendance, s.progress, tStatus(s.status), s.guardian, s.email]),
  ]);
}

export default function StudentTable({ students: list, initialQuery = '', initialStatus = '', initialClass = '', pageSize: initialSize = 25, onOpen, title, compact }) {
  const { toast, students: all, archiveStudent } = useApp();
  const students = list || all;
  const { t, tStatus, fmtDec } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);
  const [grade, setGrade] = useState(initialClass ? Number(initialClass.split('-')[0]) : '');
  const [cls, setCls] = useState(initialClass);
  const [status, setStatus] = useState(initialStatus);
  const [att, setAtt] = useState('');
  const [perf, setPerf] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  // A new search from the header starts from a clean slate so the result isn't hidden by old filters.
  const firstQuery = useRef(true);
  useEffect(() => {
    setQ(initialQuery);
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    setGrade('');
    setCls('');
    setStatus(initialStatus);
    setAtt('');
    setPerf('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);
  useEffect(() => setStatus(initialStatus), [initialStatus]);
  useEffect(() => {
    if (!initialClass) return;
    setGrade(Number(initialClass.split('-')[0]));
    setCls(initialClass);
  }, [initialClass]);

  // Short skeleton while results "load" after a query change.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(timer);
  }, [q, grade, cls, status, att, perf, sort, page, pageSize]);

  useEffect(() => setPage(1), [q, grade, cls, status, att, perf, pageSize]);

  const classOptions = useMemo(() => CLASSES.filter((c) => !grade || c.grade === Number(grade)).map((c) => c.name), [grade]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const attT = ATT.find((b) => b.value === att)?.test;
    const perfT = PERF.find((b) => b.value === perf)?.test;
    const rows = students.filter(
      (s) =>
        (!needle || s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle)) &&
        (!grade || s.grade === Number(grade)) &&
        (!cls || s.className === cls) &&
        (!status || s.status === status) &&
        (!attT || attT(s.attendance)) &&
        (!perfT || perfT(s.score))
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const k = sort.key;
      if (k === 'className') return classSort(a.className, b.className) * dir;
      if (typeof a[k] === 'number') return (a[k] - b[k]) * dir;
      return String(a[k]).localeCompare(String(b[k])) * dir;
    });
    return rows;
  }, [students, q, grade, cls, status, att, perf, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilters = [grade, cls, status, att, perf].filter(Boolean).length;
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someOnPage = pageRows.some((r) => selected.has(r.id));

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'className' ? 'asc' : 'desc' }));
  const clearAll = () => {
    setGrade('');
    setCls('');
    setStatus('');
    setAtt('');
    setPerf('');
    setQ('');
  };
  const toggleRow = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const togglePage = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) pageRows.forEach((r) => n.delete(r.id));
      else pageRows.forEach((r) => n.add(r.id));
      return n;
    });

  const selectedRows = () => students.filter((s) => selected.has(s.id));
  const messageGuardians = (rows) => {
    const names = rows.map((r) => r.guardian).filter((g) => g && g !== '—');
    navigate(`/app/messages?to=${encodeURIComponent(names.slice(0, 20).join(', '))}&role=Parent`);
  };

  return (
    <section className="panel">
      {title && (
        <div className="panel-head">
          <div>
            <h3>{title}</h3>
            <p className="num">{t('table.match', { count: filtered.length })}</p>
          </div>
        </div>
      )}
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder={t('header.searchStudents')} id={compact ? 'student-search-compact' : 'student-search'} style={{ flex: '1 1 240px', maxWidth: 320 }} />
        <div className="toolbar-filters">
          <Select label={t('table.fGrade')} value={grade} onChange={(v) => { setGrade(v); setCls(''); }} allLabel={t('common.all')} options={GRADE_LEVELS.map((g) => ({ value: g, label: t('common.yearGroup', { n: g }) }))} />
          <Select label={t('table.fClass')} value={cls} onChange={setCls} allLabel={t('common.all')} options={classOptions} />
          <Select label={t('table.fStatus')} value={status} onChange={setStatus} allLabel={t('common.all')} options={STATUSES.map((s) => ({ value: s, label: tStatus(s) }))} />
          {!compact && <Select label={t('table.fAttendance')} value={att} onChange={setAtt} allLabel={t('common.all')} options={ATT.map((b) => ({ value: b.value, label: t(`table.${b.key}`) }))} />}
          {!compact && <Select label={t('table.fPerformance')} value={perf} onChange={setPerf} allLabel={t('common.all')} options={PERF.map((b) => ({ value: b.value, label: t(`table.${b.key}`) }))} align="right" />}
          {(activeFilters > 0 || q) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
              <FiX /> {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bulkbar">
          <span className="num">{t('table.selected', { n: selected.size })}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => messageGuardians(selectedRows())}>
            <FiMail /> {t('table.msgGuardians')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const rows = selectedRows();
              if (exportStudentsCSV(rows, t, tStatus, 'edufy-students-selected.csv')) toast(t('table.exportedRows', { n: rows.length }));
            }}
          >
            <FiDownload /> {t('common.export')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
            {t('table.deselect')}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title={t('table.empty')}
          text={t('table.emptyText')}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>
              <FiSliders /> {t('table.reset')}
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table table-students">
            <thead>
              <tr>
                <th className="w-check">
                  <input type="checkbox" className="checkbox" aria-label={t('table.selectAll')} checked={allOnPage} ref={(el) => el && (el.indeterminate = !allOnPage && someOnPage)} onChange={togglePage} />
                </th>
                {COLS.map((c) => {
                  const isSorted = sort.key === c;
                  return (
                    <th key={c} className={`sortable ${isSorted ? 'is-sorted' : ''}`} aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="th-inner" onClick={() => toggleSort(c)}>
                        {t(`table.${COL_LABEL[c]}`)}
                        {isSorted && sort.dir === 'desc' ? <FiChevronDown aria-hidden="true" /> : <FiChevronUp aria-hidden="true" />}
                      </button>
                    </th>
                  );
                })}
                <th>
                  <span className="sr-only">{t('table.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                    <tr key={i}>
                      <td className="w-check">
                        <Skeleton w={16} h={16} />
                      </td>
                      <td>
                        <div className="person">
                          <Skeleton w={28} h={28} style={{ borderRadius: '50%' }} />
                          <Skeleton w={120} />
                        </div>
                      </td>
                      <td>
                        <Skeleton w={36} />
                      </td>
                      <td>
                        <Skeleton w={44} />
                      </td>
                      <td>
                        <Skeleton w={44} />
                      </td>
                      <td>
                        <Skeleton w={110} />
                      </td>
                      <td>
                        <Skeleton w={60} h={20} />
                      </td>
                      <td />
                    </tr>
                  ))
                : pageRows.map((s) => (
                    <tr key={s.id} className={selected.has(s.id) ? 'is-selected' : ''}>
                      <td className="w-check">
                        <input type="checkbox" className="checkbox" aria-label={t('table.select', { name: s.name })} checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} />
                      </td>
                      <td>
                        <button type="button" className="person person-btn" onClick={() => onOpen?.(s)}>
                          <Avatar name={s.name} />
                          <span className="person-text">
                            <span className="person-name">{s.name}</span>
                            <span className="person-sub mono">{s.id}</span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="class-tag mono">{s.className}</span>
                      </td>
                      <td className="num cell-strong">{s.isNew ? '—' : `${fmtDec(s.score)}%`}</td>
                      <td className={`num ${s.attendance < 90 ? 't-danger' : ''}`}>{fmtDec(s.attendance)}%</td>
                      <td>{s.isNew ? <span className="t-muted">—</span> : <BarInline value={s.progress} />}</td>
                      <td>
                        <Status value={s.status} />
                      </td>
                      <td className="right">
                        <Menu
                          trigger={<FiMoreHorizontal />}
                          label={t('table.actionsFor', { name: s.name })}
                          items={[
                            { label: t('table.viewProfile'), icon: FiUser, onClick: () => onOpen?.(s) },
                            { label: t('table.msgGuardian'), icon: FiMail, onClick: () => messageGuardians([s]), disabled: !s.guardian || s.guardian === '—' },
                            'sep',
                            {
                              label: t('table.archive'),
                              icon: FiArchive,
                              danger: true,
                              disabled: s.status === 'Inactive',
                              onClick: () => {
                                archiveStudent(s.id);
                                toast(t('table.archived', { name: s.name }));
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={compact ? undefined : setPageSize} noun={t('table.noun')} />
    </section>
  );
}
