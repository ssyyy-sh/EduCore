import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import { TrendLine, TrendArea, Bars, ProgressRing, Legend, useMonthData } from '../components/dashboard/Analytics.jsx';
import { Segmented, useFakeLoading, Skeleton } from '../components/ui/index.jsx';
import { PERFORMANCE_TREND, ATTENDANCE_BY_GRADE, ASSIGNMENTS_COMPLETED, ACTIVE_STUDENTS_TREND, SUBJECT_PERFORMANCE, KPIS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { downloadCSV } from '../lib/download.js';
import { inRange } from './SchoolDashboard.jsx';

function ChartPanel({ title, sub, legend, loading, children, height = 240 }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {legend}
      </div>
      <div className="panel-body">{loading ? <Skeleton h={height} /> : children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('year');
  const loading = useFakeLoading(400, [range]);
  const { toast, students } = useApp();
  const { t, tm, ts, fmtNum, fmtDec, fmtPct, fmtDate } = useI18n();

  const perf = useMonthData(PERFORMANCE_TREND.filter(inRange(range)));
  const active = useMonthData(ACTIVE_STUDENTS_TREND.filter(inRange(range)));
  const weeks = ASSIGNMENTS_COMPLETED.map((w) => ({ ...w, label: fmtDate(w.week, { day: 'numeric', month: 'short' }) }));
  const bySubject = SUBJECT_PERFORMANCE.map((s) => ({ ...s, label: ts(s.subject) }));
  const attByYear = ATTENDANCE_BY_GRADE.map((d) => ({ ...d, label: t('common.yearShort', { n: d.grade }) }));
  const last = ASSIGNMENTS_COMPLETED.at(-1);
  const rate = Math.round((last.completed / last.assigned) * 100);
  const activeCount = students.filter((s) => s.status === 'Active').length;

  const exportCSV = () => {
    const rows = [
      [t('analytics.colMonth'), `${t('dash.school.perfSeries')} %`, `${t('dash.school.target')} %`, `${t('analytics.attTitle')} %`, t('dash.school.active')],
      ...PERFORMANCE_TREND.map((p) => [tm(p.month), p.performance, p.target, p.attendance, ACTIVE_STUDENTS_TREND.find((a) => a.month === p.month)?.active ?? '']),
    ];
    if (downloadCSV('edufy-analytics.csv', rows)) toast(t('analytics.exported'));
  };

  return (
    <div className="page">
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.sub')}
        actions={
          <button type="button" className="btn btn-secondary" onClick={exportCSV}>
            <FiDownload /> {t('analytics.export')}
          </button>
        }
      />

      <div className="filters-row">
        <Segmented
          label={t('dash.school.range')}
          value={range}
          onChange={setRange}
          options={[
            { value: 'autumn', label: t('dash.school.autumn') },
            { value: 'spring', label: t('dash.school.spring') },
            { value: 'year', label: t('dash.school.year') },
          ]}
        />
      </div>

      <div className="stats-grid">
        <StatsCard label={t('dash.school.performance')} value={fmtPct(KPIS.performance)} delta={1.2} deltaLabel={`+${fmtDec(1.2)}%`} hint={t('analytics.vs2024')} />
        <StatsCard label={t('dash.stats.attendance')} value={fmtPct(KPIS.attendance)} delta={-0.3} deltaLabel={`−${fmtDec(0.3)}%`} hint={t('dash.school.target95')} />
        <StatsCard label={t('analytics.completion')} value={`${rate}%`} hint={t('analytics.weekLabel', { d: fmtDate(last.week, { day: 'numeric', month: 'long' }) })} />
        <StatsCard label={t('analytics.weeklyActive')} value={fmtNum(activeCount)} hint={t('dash.school.ofEnrolled', { pct: fmtPct((activeCount / students.length) * 100) })} />
      </div>

      <div className="grid-2">
        <ChartPanel
          title={t('dash.school.perfTitle')}
          sub={t('analytics.perfSub')}
          loading={loading}
          legend={
            <Legend
              items={[
                { label: t('dash.school.perfSeries'), color: 'var(--chart-1)' },
                { label: t('dash.school.target'), dashed: true },
              ]}
            />
          }
        >
          <TrendLine data={perf} x="month" y="performance" compare="target" yDomain={[83, 88]} unit="%" names={{ performance: t('dash.school.perfSeries'), target: t('dash.school.target') }} />
        </ChartPanel>
        <ChartPanel title={t('analytics.attTitle')} sub={t('analytics.attSub')} loading={loading}>
          <TrendArea data={perf} x="month" y="attendance" yDomain={[91, 97]} unit="%" name={t('analytics.attTitle')} target={95} targetLabel={t('analytics.targetLabel', { v: '95%' })} height={240} />
        </ChartPanel>
      </div>

      <div className="grid-2">
        <ChartPanel
          title={t('analytics.completedTitle')}
          sub={t('analytics.completedSub')}
          loading={loading}
          legend={
            <Legend
              items={[
                { label: t('analytics.completed'), color: 'var(--chart-1)' },
                { label: t('analytics.assigned'), color: 'var(--chart-3)' },
              ]}
            />
          }
        >
          <Bars data={weeks} x="label" y="completed" second="assigned" names={{ completed: t('analytics.completed'), assigned: t('analytics.assigned') }} fmt={(v) => fmtNum(v)} height={240} />
        </ChartPanel>
        <ChartPanel title={t('dash.school.activeTitle')} sub={t('dash.school.activeSub')} loading={loading}>
          <TrendArea data={active} x="month" y="active" yDomain={[4200, 4600]} name={t('dash.school.active')} fmt={(v) => fmtNum(v)} height={240} />
        </ChartPanel>
      </div>

      <div className="grid-1-2">
        <ChartPanel title={t('analytics.completion')} sub={t('analytics.weekLabel', { d: fmtDate(last.week, { day: 'numeric', month: 'long' }) })} loading={loading} height={180}>
          <div className="ring-body">
            <ProgressRing value={rate} label={t('analytics.completed').toLowerCase()} size={160} />
            <dl className="ring-legend">
              <div>
                <dt>{t('analytics.completed')}</dt>
                <dd className="num">{fmtNum(last.completed)}</dd>
              </div>
              <div>
                <dt>{t('analytics.assigned')}</dt>
                <dd className="num">{fmtNum(last.assigned)}</dd>
              </div>
              <div>
                <dt>{t('analytics.outstanding')}</dt>
                <dd className="num">{fmtNum(last.assigned - last.completed)}</dd>
              </div>
            </dl>
          </div>
        </ChartPanel>
        <ChartPanel title={t('analytics.bySubject')} sub={t('analytics.bySubjectSub')} loading={loading}>
          <Bars data={bySubject} x="label" y="score" yDomain={[80, 92]} unit="%" names={{ score: t('analytics.score') }} layout="vertical" height={240} />
        </ChartPanel>
      </div>

      <ChartPanel title={t('dash.school.attTitle')} sub={t('dash.school.attSub')} loading={loading}>
        <Bars data={attByYear} x="label" y="attendance" yDomain={[88, 100]} unit="%" names={{ attendance: t('dash.school.attSeries') }} height={220} />
      </ChartPanel>
    </div>
  );
}
