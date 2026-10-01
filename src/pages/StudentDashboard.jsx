import { Link, useNavigate } from 'react-router-dom';
import { FiAward, FiUserCheck, FiTrendingUp, FiCheckSquare, FiArrowRight, FiCalendar } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import AssignmentCard from '../components/dashboard/AssignmentCard.jsx';
import { DaySchedule } from '../components/dashboard/Schedule.jsx';
import RecentGrades from '../components/dashboard/Grades.jsx';
import SubjectProgress from '../components/dashboard/Progress.jsx';
import { TrendLine, Legend, ProgressRing, useMonthData } from '../components/dashboard/Analytics.jsx';
import { useFakeLoading } from '../components/ui/index.jsx';
import { RECENT_GRADES, todayKey, TODAY } from '../data/mock.js';
import { useApp } from '../context/AppContext.jsx';
import { lessonsForClass } from '../lib/timetable.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { greetingKey } from '../components/dashboard/greeting.js';

export default function StudentDashboard() {
  const { day, isToday } = todayKey();
  const loading = useFakeLoading(400);
  const navigate = useNavigate();
  const { assignments, recentGrades, students, attendanceSummary, timetable, selfChild: me } = useApp();
  const att = attendanceSummary(students.find((s) => s.id === me.studentId) || { id: me.studentId, className: me.className, isNew: true });
  const { user } = useAuth();
  const { t, tw, fmtDate, fmtDec } = useI18n();
  const history = useMonthData(me.history);
  const isAlex = me.demo && me.id === 'alex';
  const low = Math.floor(Math.min(...me.history.flatMap((d) => [d.you, d.cls])));
  const lessons = lessonsForClass(timetable, me.className, day);

  const open = assignments.filter((a) => a.status !== 'Completed').sort((a, b) => a.due - b.due);
  const upcoming = open.slice(0, 5);
  const dueSoon = open.filter((a) => a.status === 'Pending' && (a.due - TODAY) / 86400000 <= 1).length;
  const overdue = open.filter((a) => a.status === 'Overdue').length;
  const completed = assignments.filter((a) => a.status === 'Completed').length;

  return (
    <div className="page">
      <PageHeader
        title={`${t(greetingKey())}, ${user.firstName}.`}
        description={t('dash.student.summary', { date: fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', cap: true }), due: dueSoon, overdue })}
        actions={
          <Link to="/app/assignments" className="btn btn-secondary">
            <FiCheckSquare /> {t('dash.student.allAssignments')}
          </Link>
        }
      />

      <div className="stats-grid">
        <StatsCard icon={FiAward} label={t('dash.stats.avgGrade')} value={fmtDec(me.avgGrade)} suffix={t('common.of5')} {...(isAlex ? { delta: 0.1, deltaLabel: `+${fmtDec(0.1)}`, hint: t('dash.stats.vsLastTerm') } : {})} loading={loading} />
        <StatsCard icon={FiUserCheck} label={t('dash.stats.attendance')} value={`${Math.round(att.rate)}%`} hint={t('attendance.lateAbsent', { late: att.late, absent: att.absent })} loading={loading} />
        <StatsCard icon={FiTrendingUp} label={t('dash.stats.progress')} value={`${me.progress}%`} {...(isAlex ? { delta: 4, deltaLabel: '+4%', hint: t('dash.stats.thisMonth') } : {})} loading={loading} />
        <StatsCard icon={FiCheckSquare} label={t('dash.stats.completed')} value={completed} hint={t('dash.stats.thisTermCount')} loading={loading} />
      </div>

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('dash.student.upcoming')}</h3>
              <p>{t('dash.student.upcomingSub', { n: open.length })}</p>
            </div>
            <Link to="/app/assignments" className="link-more">
              {t('common.viewAll')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body flush">
            {upcoming.length === 0 && <p className="muted-note" style={{ padding: 16 }}>{t('dash.parent.noOpen')}</p>}
            {upcoming.map((a) => (
              <AssignmentCard key={a.id} a={a} onClick={() => navigate('/app/assignments')} />
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>{isToday ? t('dash.student.todaySchedule') : t('dash.student.daySchedule', { day: tw(day) })}</h3>
              <p>{isToday ? t('common.lesson', { count: lessons.length }) : t('dash.student.nextDay')}</p>
            </div>
            <Link to="/app/schedule" className="link-more">
              <FiCalendar /> {t('common.week')}
            </Link>
          </div>
          <div className="panel-body">
            <DaySchedule lessons={lessons} isToday={isToday} />
          </div>
        </section>
      </div>

      <div className="grid-3">
        <section className="panel">
          <div className="panel-head">
            <h3>{t('dash.student.recentGrades')}</h3>
            <Link to="/app/grades" className="link-more">
              {t('common.grades')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body">
            <RecentGrades items={recentGrades(me.studentId, isAlex ? RECENT_GRADES : me.recent)} />
          </div>
        </section>

        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h3>{t('dash.student.learning')}</h3>
              <p>{t('dash.student.learningSub')}</p>
            </div>
            <Legend
              items={[
                { label: t('dash.student.you'), color: 'var(--chart-1)' },
                { label: t('dash.student.classAvg'), dashed: true },
              ]}
            />
          </div>
          <div className="panel-body progress-split">
            <TrendLine data={history} x="month" y="you" compare="cls" yDomain={[Math.min(4, low), 5]} names={{ you: t('dash.student.you'), cls: t('dash.student.classAvg') }} height={220} />
            <div className="progress-side">
              <ProgressRing value={me.progress} label={t('dash.student.termProgress')} size={132} />
              <SubjectProgress items={me.subjectProgress.slice(0, 4)} compact />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
