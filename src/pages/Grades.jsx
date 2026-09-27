import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import RecentGrades, { GradeChip, Change } from '../components/dashboard/Grades.jsx';
import { TrendLine, Legend, useMonthData } from '../components/dashboard/Analytics.jsx';
import { Avatar, Segmented } from '../components/ui/index.jsx';
import { SUBJECT_GRADES, GRADE_HISTORY, RECENT_GRADES, AUTUMN_MONTHS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';

export default function Grades() {
  const [term, setTerm] = useState('year');
  const { toast } = useApp();
  const { t, ts, fmtDec } = useI18n();
  const history = useMonthData(term === 'autumn' ? GRADE_HISTORY.filter((d) => AUTUMN_MONTHS.includes(d.month)) : GRADE_HISTORY);
  const avg = SUBJECT_GRADES.reduce((a, s) => a + s.average, 0) / SUBJECT_GRADES.length;
  const best = [...SUBJECT_GRADES].sort((a, b) => b.average - a.average)[0];
  const improved = [...SUBJECT_GRADES].sort((a, b) => b.change - a.change)[0];

  const exportCSV = () => {
    const ok = downloadCSV('educore-grades.csv', [
      [t('grades.colSubject'), t('grades.colTeacher'), t('grades.colGrade'), t('grades.colAverage'), t('grades.colChange')],
      ...SUBJECT_GRADES.map((s) => [ts(s.subject), s.teacher, s.grade, s.average, s.change]),
    ]);
    if (ok) toast(t('grades.downloaded'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('grades.title')}
        description={t('grades.sub')}
        actions={
          <button type="button" className="btn btn-secondary" onClick={exportCSV}>
            <FiDownload /> {t('grades.reportCard')}
          </button>
        }
      />

      <div className="stats-grid stats-grid-3">
        <StatsCard label={t('grades.overall')} value={fmtDec(avg, 2)} suffix={t('common.of5')} delta={0.1} deltaLabel={`+${fmtDec(0.1)}`} hint={t('dash.stats.vsLastTerm')} />
        <StatsCard label={t('grades.strongest')} value={ts(best.subject)} hint={t('grades.average', { v: fmtDec(best.average) })} />
        <StatsCard label={t('grades.improved')} value={ts(improved.subject)} delta={improved.change} deltaLabel={`+${fmtDec(improved.change)}`} hint={t('grades.thisTerm')} />
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
            <TrendLine data={history} x="month" y="you" compare="cls" yDomain={[4, 5]} names={{ you: t('dash.student.you'), cls: t('grades.classAverage') }} height={250} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('grades.latest')}</h3>
          </div>
          <div className="panel-body">
            <RecentGrades items={RECENT_GRADES} />
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
                {SUBJECT_GRADES.map((s) => (
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
