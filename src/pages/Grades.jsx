import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import RecentGrades, { GradeChip, Change } from '../components/dashboard/Grades.jsx';
import { TrendLine, Legend, useMonthData } from '../components/dashboard/Analytics.jsx';
import { Avatar, Segmented } from '../components/ui/index.jsx';
import { RECENT_GRADES, AUTUMN_MONTHS } from '../data/mock.js';
import { useChild } from '../components/dashboard/useChild.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

export default function Grades() {
  const [term, setTerm] = useState('year');
  const { toast, recentGrades, role } = useApp();
  const { t, ts, fmtDec } = useI18n();
  const { child, childId, setChildId, options, many } = useChild({ fromParams: true });
  const isAlex = child.demo && child.id === 'alex';
  const SUBJECTS = child.subjects;
  const fullHistory = child.history;
  const history = useMonthData(term === 'autumn' ? fullHistory.filter((d) => AUTUMN_MONTHS.includes(d.month)) : fullHistory);
  const low = Math.floor(Math.min(...fullHistory.flatMap((d) => [d.you, d.cls])) * 2) / 2;
  const baseRecent = isAlex ? RECENT_GRADES : child.recent;
  const avg = SUBJECTS.reduce((a, s) => a + s.average, 0) / SUBJECTS.length;
  const best = [...SUBJECTS].sort((a, b) => b.average - a.average)[0];
  const improved = [...SUBJECTS].sort((a, b) => b.change - a.change)[0];

  const exportCSV = () => {
    const ok = downloadCSV(`edufy-grades-${childId}.csv`, [
      [t('grades.colSubject'), t('grades.colTeacher'), t('grades.colGrade'), t('grades.colAverage'), t('grades.colChange')],
      ...SUBJECTS.map((s) => [ts(s.subject), s.teacher, s.grade, s.average, s.change]),
    ]);
    if (ok) toast(t('grades.downloaded'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('grades.title')}
        description={role === 'parent' ? t('grades.subChild', { name: child.full, cls: child.className }) : t('grades.sub')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCSV}>
              <FiDownload /> {t('common.exportCsv')}
            </button>
            <Link to={`/app/report-card${role === 'parent' ? `?child=${childId}` : ''}`} className="btn btn-primary">
              <FiPrinter /> {t('reportCard.open')}
            </Link>
          </>
        }
      />
      {role === 'parent' && many && <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={options} />}

      <div className="stats-grid stats-grid-3">
        <StatsCard label={t('grades.overall')} value={fmtDec(avg, 2)} suffix={t('common.of5')} {...(isAlex ? { delta: 0.1, deltaLabel: `+${fmtDec(0.1)}`, hint: t('dash.stats.vsLastTerm') } : {})} />
        <StatsCard label={t('grades.strongest')} value={ts(best.subject)} hint={t('grades.average', { v: fmtDec(best.average) })} />
        <StatsCard label={t('grades.improved')} value={ts(improved.subject)} delta={improved.change} deltaLabel={`${improved.change >= 0 ? '+' : '−'}${fmtDec(Math.abs(improved.change))}`} hint={t('grades.thisTerm')} />
      </div>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('grades.trend')}</h3>
              <p>{t('grades.trendSub')}</p>
            </div>
            <Segmented
              label={t('grades.term')}
              value={term}
              onChange={setTerm}
              options={[
                { value: 'autumn', label: t('grades.autumn') },
                { value: 'year', label: t('grades.fullYear') },
              ]}
            />
          </div>
          <div className="panel-body">
            <Legend
              items={[
                { label: t('dash.student.you'), color: 'var(--chart-1)' },
                { label: t('grades.classAverage'), dashed: true },
              ]}
            />
            <TrendLine data={history} x="month" y="you" compare="cls" yDomain={[Math.min(isAlex ? 4 : 3.5, low), 5]} names={{ you: t("dash.student.you"), cls: t("grades.classAverage") }} height={250} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('grades.latest')}</h3>
          </div>
          <div className="panel-body">
            <RecentGrades items={recentGrades(child.studentId, baseRecent)} />
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{t('grades.bySubject')}</h3>
            <p>{t('grades.bySubjectSub')}</p>
          </div>
        </div>
        <div className="panel-body flush">
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t('grades.colSubject')}</th>
                  <th>{t('grades.colTeacher')}</th>
                  <th>{t('grades.colGrade')}</th>
                  <th>{t('grades.colAverage')}</th>
                  <th>{t('grades.colChange')}</th>
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map((s) => (
                  <tr key={s.subject}>
                    <td data-label={t('grades.colSubject')} className="cell-strong">
                      {ts(s.subject)}
                    </td>
                    <td data-label={t('grades.colTeacher')}>
                      <div className="person">
                        <Avatar name={s.teacher} size={22} />
                        {s.teacher}
                      </div>
                    </td>
                    <td data-label={t('grades.colGrade')}>
                      <GradeChip value={s.grade} />
                    </td>
                    <td data-label={t('grades.colAverage')} className="num cell-strong">
                      {fmtDec(s.average)}
                    </td>
                    <td data-label={t('grades.colChange')}>
                      <Change value={s.change} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
