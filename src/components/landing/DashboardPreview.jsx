import { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FiHome, FiUsers, FiBookOpen, FiBarChart2, FiCalendar, FiMessageSquare, FiSettings, FiSearch, FiBell, FiTrendingUp, FiCheckCircle, FiClock, FiAlertCircle, FiMapPin } from 'react-icons/fi';
import { PERFORMANCE_TREND, ATTENDANCE_BY_GRADE } from '../../data/mock.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

/* A static miniature of the real product UI, used on the landing page. */

function Chrome({ children, label }) {
  return (
    <div className="mock" role="img" aria-label={label}>
      <div className="mock-bar">
        <span />
        <span />
        <span />
        <div className="mock-url">app.edufy.io</div>
      </div>
      {children}
    </div>
  );
}

function MiniSidebar({ active = 0 }) {
  const items = [FiHome, FiUsers, FiBookOpen, FiBarChart2, FiCalendar, FiMessageSquare];
  return (
    <div className="mock-side">
      <div className="mock-logo" />
      {items.map((I, i) => (
        <div key={i} className={`mock-side-item ${i === active ? 'on' : ''}`}>
          <I />
        </div>
      ))}
      <div className="mock-side-item" style={{ marginTop: 'auto' }}>
        <FiSettings />
      </div>
    </div>
  );
}

function SchoolView() {
  const { t, tm, fmtNum, fmtPct, fmtDec, tStatus } = useI18n();
  const gid = `mock-${useId().replace(/:/g, '')}`;
  const m = (k) => t(`landing.mock.${k}`);
  const perf = PERFORMANCE_TREND.map((d) => ({ ...d, month: tm(d.month) }));
  const att = ATTENDANCE_BY_GRADE.slice(4).map((d) => ({ ...d, grade: t('common.yearShort', { n: d.grade }) }));
  const kpis = [
    [m('totalStudents'), fmtNum(4862), '+38'],
    [m('attendance'), fmtPct(94.8), `+${fmtDec(0.6)}`],
    [m('performance'), fmtPct(87.4), `+${fmtDec(1.2)}`],
    [m('active'), fmtNum(4521), '93%'],
  ];
  const rows = [
    ['Mia Carter', '9-A', fmtPct(96.4), 94, 'Active'],
    ['Omar Hassan', '10-C', fmtPct(88.1), 81, 'Active'],
    ['Freya Lindqvist', '8-B', fmtPct(91.7), 88, 'Active'],
    ['Ryan Walsh', '11-D', fmtPct(74.2), 58, 'At risk'],
  ];
  return (
    <div className="mock-main">
      <div className="mock-top">
        <div>
          <div className="mock-h">{m('overview')}</div>
          <div className="mock-sub">{m('orgTerm')}</div>
        </div>
        <div className="mock-search">
          <FiSearch /> {m('search')}
        </div>
        <div className="mock-bell">
          <FiBell />
        </div>
      </div>
      <div className="mock-kpis">
        {kpis.map(([k, v, d]) => (
          <div className="mock-kpi" key={k}>
            <div className="mock-kpi-k">{k}</div>
            <div className="mock-kpi-v num">{v}</div>
            <div className="mock-kpi-d">
              <FiTrendingUp /> {d}
            </div>
          </div>
        ))}
      </div>
      <div className="mock-grid">
        <div className="mock-card">
          <div className="mock-card-h">
            {m('perfCard')} <span>2025–26</span>
          </div>
          <div style={{ height: 118 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perf} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[83, 88]} ticks={[83, 85, 87]} tick={{ fontSize: 9, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={24} />
                <Area type="monotone" dataKey="performance" stroke="var(--chart-1)" strokeWidth={1.6} fill={`url(#${gid})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mock-card">
          <div className="mock-card-h">
            {m('attCard')} <span>{m('byYear')}</span>
          </div>
          <div style={{ height: 118 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={att} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 9, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[85, 100]} ticks={[85, 90, 95, 100]} tick={{ fontSize: 9, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={24} />
                <Bar dataKey="attendance" fill="var(--chart-2)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="mock-card mock-table">
        <div className="mock-tr mock-th">
          <span>{m('student')}</span>
          <span>{m('class')}</span>
          <span>{m('grade')}</span>
          <span>{m('progress')}</span>
          <span>{m('status')}</span>
        </div>
        {rows.map((r) => (
          <div className="mock-tr" key={r[0]}>
            <span className="mock-name">
              <i />
              {r[0]}
            </span>
            <span>{r[1]}</span>
            <span className="num">{r[2]}</span>
            <span>
              <b className="mock-prog">
                <em style={{ width: `${r[3]}%` }} className={r[3] < 60 ? 'warn' : ''} />
              </b>
            </span>
            <span>
              <em className={`mock-status ${r[4] === 'Active' ? 'ok' : 'risk'}`}>{tStatus(r[4])}</em>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentView() {
  const { t, ts, tr, fmtDec } = useI18n();
  const m = (k) => t(`landing.mock.${k}`);
  const tasks = m('tasks');
  const due = m('due');
  const subj = ['Mathematics', 'English Literature', 'History', 'Chemistry'];
  const icons = [
    [FiClock, 'pending'],
    [FiClock, 'pending'],
    [FiAlertCircle, 'overdue'],
    [FiCheckCircle, 'completed'],
  ];
  const lessons = [
    ['08:30', 'Mathematics', 'B204'],
    ['09:25', 'English Literature', 'A112'],
    ['10:30', 'Physics', { en: 'Lab 3', ru: 'Лаб. 3', uz: 'Lab. 3' }],
    ['11:25', 'History', 'A108'],
  ];
  return (
    <div className="mock-main">
      <div className="mock-top">
        <div>
          <div className="mock-h">{m('greeting')}</div>
          <div className="mock-sub">{m('greetingSub')}</div>
        </div>
      </div>
      <div className="mock-kpis">
        {[
          [m('avgGrade'), fmtDec(4.8)],
          [m('attendance'), '94%'],
          [m('progress'), '82%'],
          [m('completed'), '9'],
        ].map(([k, v]) => (
          <div className="mock-kpi" key={k}>
            <div className="mock-kpi-k">{k}</div>
            <div className="mock-kpi-v num">{v}</div>
          </div>
        ))}
      </div>
      <div className="mock-grid mock-grid-3">
        <div className="mock-card">
          <div className="mock-card-h">{m('upcoming')}</div>
          {tasks.map((task, i) => {
            const [I, cls] = icons[i];
            return (
              <div className="mock-task" key={task}>
                <I className={`mock-ic ${cls}`} />
                <div>
                  <div className="mock-task-t">{task}</div>
                  <div className="mock-task-s">
                    {ts(subj[i])} · {due[i]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mock-card">
          <div className="mock-card-h">{m('today')}</div>
          {lessons.map(([time, s, r], i) => (
            <div className={`mock-lesson ${i === 1 ? 'now' : ''}`} key={time}>
              <span className="num">{time}</span>
              <div>
                <div className="mock-task-t">{ts(s)}</div>
                <div className="mock-task-s">
                  <FiMapPin /> {tr(r)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreview({ variant = 'school' }) {
  const { t } = useI18n();
  return (
    <Chrome label={variant === 'school' ? t('landing.mock.schoolLabel') : t('landing.mock.studentLabel')}>
      <div className="mock-body">
        <MiniSidebar active={variant === 'school' ? 0 : 2} />
        {variant === 'school' ? <SchoolView /> : <StudentView />}
      </div>
    </Chrome>
  );
}
