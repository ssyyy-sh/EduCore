import { Link, useNavigate } from 'react-router-dom';
import { FiAward, FiUserCheck, FiTrendingUp, FiCheckSquare, FiArrowRight, FiMessageSquare, FiAlertCircle, FiClock, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import PageHeader from '../components/dashboard/PageHeader.jsx';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import RecentGrades from '../components/dashboard/Grades.jsx';
import NotificationsList from '../components/dashboard/Notifications.jsx';
import { Sparkline } from '../components/dashboard/Analytics.jsx';
import { Avatar, Segmented, useFakeLoading, Bar } from '../components/ui/index.jsx';
import { useChild } from '../components/dashboard/useChild.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { greetingKey } from '../components/dashboard/greeting.js';

export default function ParentDashboard() {
  const { child: base, childId, setChildId, options, many } = useChild();
  const loading = useFakeLoading(300, [childId]);
  const { notifications, assignments, markNotificationRead, recentGrades, students, attendanceSummary } = useApp();
  const { user } = useAuth();
  const { t, tr, fmtDec, relativeDue } = useI18n();
  const navigate = useNavigate();
  // Numbers come from the live assignment list of this child's class (the demo's younger children keep their sample numbers).
  const mine = assignments.filter((a) => a.child?.studentId === base.studentId);
  const sample = base.demo && base.id !== 'alex' && base.assignments;
  const c = {
    ...base,
    assignments: sample || {
      done: mine.filter((a) => a.status === 'Completed').length,
      pending: mine.filter((a) => a.status === 'Pending').length,
      overdue: mine.filter((a) => a.status === 'Overdue').length,
    },
  };
  const att = attendanceSummary(students.find((s) => s.id === c.studentId) || { id: c.studentId, className: c.className, isNew: true });
  const totalA = c.assignments.done + c.assignments.pending + c.assignments.overdue;
  const upcoming = mine
    .filter((a) => a.status !== 'Completed')
    .sort((a, b) => a.due - b.due)
    .slice(0, 4);

  return (
    <div className="page">
      <PageHeader
        title={`${t(greetingKey())}, ${user.firstName}.`}
        description={t('dash.parent.sub')}
        actions={
          <>
            <Link to={`/app/report-card?child=${c.id}`} className="btn btn-secondary">
              <FiPrinter /> {t('reportCard.open')}
            </Link>
            <Link to={c.tutor && c.tutor !== '—' ? `/app/messages?to=${encodeURIComponent(c.tutor)}` : '/app/messages'} className="btn btn-primary">
              <FiMessageSquare /> {t('dash.parent.message')}
            </Link>
          </>
        }
      />

      <div className="child-switch">
        {many && <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={options} />}
        <div className="child-meta">
          <Avatar name={c.full} size={24} />
          <span>{t('dash.parent.childMeta', { name: c.full, cls: c.className, tutor: c.tutor })}</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard icon={FiAward} label={t('dash.stats.avgGrade')} value={fmtDec(c.avgGrade)} suffix={t('common.of5')} loading={loading} hint={t('dash.parent.trend')}>
          <Sparkline data={c.trend} height={30} />
        </StatsCard>
        <StatsCard icon={FiUserCheck} label={t('dash.stats.attendance')} value={`${Math.round(att.rate)}%`} loading={loading} hint={t('attendance.lateAbsent', { late: att.late, absent: att.absent })} />
        <StatsCard icon={FiTrendingUp} label={t('dash.stats.progress')} value={`${c.progress}%`} loading={loading} hint={t('dash.parent.ofObjectives')}>
          <Bar value={c.progress} />
        </StatsCard>
        <StatsCard icon={FiCheckSquare} label={t('dash.stats.assignments')} value={`${c.assignments.done}/${totalA}`} loading={loading} hint={t('dash.parent.assignHint', { overdue: c.assignments.overdue, pending: c.assignments.pending })} />
      </div>

      <div className="grid-3">
        <section className="panel">
          <div className="panel-head">
            <h3>{t('dash.stats.assignments')}</h3>
            <Link to="/app/assignments" className="link-more">
              {t('common.viewAll')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body">
            <div className="assign-summary">
              <div>
                <FiCheckCircle className="t-success" aria-hidden="true" />
                <strong className="num">{c.assignments.done}</strong>
                <span>{t('status.Completed')}</span>
              </div>
              <div>
                <FiClock className="t-warning" aria-hidden="true" />
                <strong className="num">{c.assignments.pending}</strong>
                <span>{t('status.Pending')}</span>
              </div>
              <div>
                <FiAlertCircle className="t-danger" aria-hidden="true" />
                <strong className="num">{c.assignments.overdue}</strong>
                <span>{t('status.Overdue')}</span>
              </div>
            </div>
            {upcoming.length > 0 ? (
              <ul className="mini-list">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <span>{tr(a.title)}</span>
                    <em className={a.status === 'Overdue' ? 't-danger' : ''}>{relativeDue(a.due)}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-note">{t('dash.parent.noOpen')}</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>{t('dash.student.recentGrades')}</h3>
            <Link to={`/app/grades?child=${c.id}`} className="link-more">
              {t('common.grades')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body">
            <RecentGrades items={recentGrades(c.studentId, c.recent, 4)} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>{t('nav.notifications')}</h3>
            <Link to="/app/notifications" className="link-more">
              {t('common.viewAll')} <FiArrowRight />
            </Link>
          </div>
          <div className="panel-body flush">
            <NotificationsList
              items={notifications.slice(0, 4)}
              onItem={(n) => {
                markNotificationRead(n.id);
                navigate('/app/notifications');
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
