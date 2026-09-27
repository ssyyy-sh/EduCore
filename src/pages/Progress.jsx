import { FiTarget, FiCheckCircle, FiClock } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import SubjectProgress from '../components/dashboard/Progress.jsx';
import { ProgressRing, Bars } from '../components/dashboard/Analytics.jsx';
import { Bar } from '../components/ui/index.jsx';
import { SUBJECT_PROGRESS, WEEKLY_ACTIVITY, GOAL_PROGRESS, STUDENT_STATS } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Progress() {
  const { assignments } = useApp();
  const { t, fmtDate, fmtDec } = useI18n();
  const done = SUBJECT_PROGRESS.reduce((a, s) => a + s.done, 0);
  const total = SUBJECT_PROGRESS.reduce((a, s) => a + s.total, 0);
  const completed = assignments.filter((a) => a.status === 'Completed').length;
  const goals = t('progress.goalItems').map((g, i) => ({ ...g, progress: GOAL_PROGRESS[i] }));
  const achieved = goals.filter((g) => g.progress >= 100).length;
  const week = WEEKLY_ACTIVITY.map((w) => ({ ...w, label: fmtDate(w.week, { day: 'numeric', month: 'short' }) }));
  const last = WEEKLY_ACTIVITY.at(-1).hours;
  const prev = WEEKLY_ACTIVITY.at(-2).hours;

  return (
    <div className="page">
      <PageHeader title={t('progress.title')} description={t('progress.sub')} />

      <div className="grid-1-2">
        <section className="panel">
          <div className="panel-head">
            <h3>{t('progress.term')}</h3>
          </div>
          <div className="panel-body ring-body">
            <ProgressRing value={STUDENT_STATS.progress} label={t('progress.ofObjectives')} size={168} />
            <dl className="ring-legend">
              <div>
                <dt>{t('progress.completedTasks')}</dt>
                <dd className="num">
                  {done} / {total}
                </dd>
              </div>
              <div>
                <dt>{t('progress.expected')}</dt>
                <dd className="num">76%</dd>
              </div>
              <div>
                <dt>{t('progress.status')}</dt>
                <dd className="t-success">{t('progress.ahead')}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('progress.bySubject')}</h3>
              <p>{t('progress.bySubjectSub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <SubjectProgress items={SUBJECT_PROGRESS} />
          </div>
        </section>
      </div>

      <div className="stats-grid stats-grid-3">
        <StatsCard icon={FiClock} label={t('progress.studyTime')} value={fmtDec(last)} suffix={t('progress.hUnit')} delta={last - prev} deltaLabel={`+${fmtDec(last - prev)} ${t('progress.hUnit')}`} hint={t('progress.vsLastWeek')} />
        <StatsCard icon={FiCheckCircle} label={t('progress.tasks')} value={completed} hint={t('progress.thisTerm')} />
        <StatsCard icon={FiTarget} label={t('progress.goalsOnTrack')} value={`${goals.length} / ${goals.length}`} hint={t('progress.achievedN', { n: achieved })} />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('progress.weekly')}</h3>
              <p>{t('progress.weeklySub')}</p>
            </div>
          </div>
          <div className="panel-body">
            <Bars data={week} x="label" y="hours" fmt={(v) => `${fmtDec(v)} ${t('progress.hUnit')}`} names={{ hours: t('progress.hours') }} highlightLast height={200} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>{t('progress.goals')}</h3>
          </div>
          <div className="panel-body">
            <ul className="goals">
              {goals.map((g) => (
                <li key={g.title}>
                  <div className="goal-top">
                    {g.progress >= 100 ? <FiCheckCircle className="t-success" aria-hidden="true" /> : <FiTarget className="t-muted" aria-hidden="true" />}
                    <strong>{g.title}</strong>
                    <span className="num">{g.progress}%</span>
                  </div>
                  <Bar value={g.progress} tone="" label={g.title} />
                  <em>{g.due}</em>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
