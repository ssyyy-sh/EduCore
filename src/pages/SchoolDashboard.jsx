import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiBriefcase, FiGrid, FiAward, FiUserCheck, FiActivity, FiDownload, FiArrowRight, FiUserPlus } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import StudentTable, { exportStudentsCSV } from '../components/dashboard/StudentTable.jsx';
import StudentDrawer from '../components/dashboard/StudentDrawer.jsx';
import { TrendLine, Bars, TrendArea, Legend, useMonthData } from '../components/dashboard/Analytics.jsx';
import { Segmented, useFakeLoading, Avatar } from '../components/ui/index.jsx';
import { KPIS, PERFORMANCE_TREND, ATTENDANCE_BY_GRADE, ACTIVE_STUDENTS_TREND, ACTIVITY_LOG, ORG, AUTUMN_MONTHS, SPRING_MONTHS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useRelTime } from '../components/dashboard/useRelTime.js';

export const RANGE_MONTHS = { autumn: AUTUMN_MONTHS, spring: SPRING_MONTHS, year: null };
export const inRange = (range) => (d) => !RANGE_MONTHS[range] || RANGE_MONTHS[range].includes(d.month);

export default function SchoolDashboard() {
  const [range, setRange] = useState('year');
  const [drawer, setDrawer] = useState(null);
  const loading = useFakeLoading(400, [range]);
  const { toast, students } = useApp();
  const { user } = useAuth();
  const { t, tr, fmtNum, fmtDec, fmtPct } = useI18n();
  const rel = useRelTime();

  const perf = useMonthData(PERFORMANCE_TREND.filter(inRange(range)));
  const active = useMonthData(ACTIVE_STUDENTS_TREND.filter(inRange(range)));
  const attByYear = ATTENDANCE_BY_GRADE.map((d) => ({ ...d, grade: t('common.yearShort', { n: d.grade }) }));
  const total = students.length;
  const activeCount = useMemo(() => students.filter((s) => s.status === 'Active').length, [students]);
  const atRisk = useMemo(() => students.filter((s) => s.status === 'At risk'), [students]);

  return (
    <div className="page">
      <PageHeader
        title={t('dash.school.title')}
        description={`${user.org || ORG.name} · ${tr(ORG.term)}`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (exportStudentsCSV(atRisk, t, tStatusFrom(t), 'edufy-students-at-risk.csv')) toast(t('table.exportedRows', { n: atRisk.length }));
              }}
            >
              <FiDownload /> {t('dash.school.exportAtRisk')}
            </button>
            <Link to="/app/students?add=1" className="btn btn-primary">
              <FiUserPlus /> {t('dash.school.addStudent')}
            </Link>
          </>
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

      <div className="stats-grid stats-grid-6">
        <StatsCard icon={FiUsers} label={t('dash.school.total')} value={fmtNum(total)} hint={t('dash.school.capacityOf', { n: fmtNum(ORG.capacity) })} />
        <StatsCard icon={FiBriefcase} label={t('dash.school.teachers')} value={fmtNum(KPIS.teachers)} />
        <StatsCard icon={FiGrid} label={t('dash.school.classes')} value={fmtNum(KPIS.classes)} hint={t('dash.school.yearGroups')} />
        <StatsCard icon={FiAward} label={t('dash.school.performance')} value={fmtPct(KPIS.performance)} delta={1.2} deltaLabel={`+${fmtDec(1.2)}%`} hint={t('dash.school.vsLastYear')} />
        <StatsCard icon={FiUserCheck} label={t('dash.stats.attendance')} value={fmtPct(KPIS.attendance)} delta={-0.3} deltaLabel={`−${fmtDec(0.3)}%`} hint={t('dash.school.target95')} />
        <StatsCard icon={FiActivity} label={t('dash.school.active')} value={fmtNum(activeCount)} hint={t('dash.school.ofEnrolled', { pct: fmtPct((activeCount / total) * 100) })} />
      </div>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('dash.school.perfTitle')}</h3>
              <p>{t('dash.school.perfSub')}</p>
            </div>
            <Legend
              items={[
                { label: t('dash.school.perfSeries'), color: 'var(--chart-1)' },
                { label: t('dash.school.target'), dashed: true },
              ]}
            />
          </div>
          <div className="panel-body">
            {loading ? <div className="skeleton" style={{ height: 260 }} /> : <TrendLine data={perf} x="month" y="performance" compare="target" yDomain={[83, 88]} unit="%" names={{ performance: t('dash.school.perfSeries'), target: t('dash.school.target') }} height={260} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('dash.school.attTitle')}</h3>
              <p>{t('dash.school.attSub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <Bars data={attByYear} x="grade" y="attendance" yDomain={[88, 100]} unit="%" names={{ attendance: t('dash.school.attSeries') }} height={260} />
          </div>
        </section>
      </div>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('dash.school.activeTitle')}</h3>
              <p>{t('dash.school.activeSub')}</p>
            </div>
            <Link to="/app/analytics" className="link-more">
              {t('common.analytics')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body">
            {loading ? <div className="skeleton" style={{ height: 200 }} /> : <TrendArea data={active} x="month" y="active" yDomain={[4200, 4600]} name={t('dash.school.active')} fmt={(v) => fmtNum(v)} height={200} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('dash.school.recent')}</h3>
          </div>
          <div className="panel-body">
            <ul className="activity">
              {ACTIVITY_LOG.map((a) => (
                <li key={a.id}>
                  <Avatar name={a.who} size={24} />
                  <p>
                    <strong>{a.who}</strong> {tr(a.text)}
                    <span>{rel(a.at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <StudentTable title={t('dash.school.attention')} initialStatus="At risk" pageSize={10} compact onOpen={setDrawer} />
      <StudentDrawer student={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

const tStatusFrom = (t) => (s) => t(`status.${s}`);
