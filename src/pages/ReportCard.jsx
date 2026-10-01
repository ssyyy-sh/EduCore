import { Link } from 'react-router-dom';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import Logo from '../components/Logo.jsx';
import { Segmented } from '../components/ui/index.jsx';
import { GradeChip } from '../components/dashboard/Grades.jsx';
import { ORG, TODAY, schoolDays, isoDay } from '../data/mock.js';
import { useChild } from '../components/dashboard/useChild.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const DAYS = schoolDays(120);

export default function ReportCard() {
  const { role, students, getAttendance, finalsForStudent } = useApp();
  const { t, tr, ts, fmtDec, fmtPct, fmtDate } = useI18n();
  const { child, childId, setChildId, children, many } = useChild({ fromParams: true });
  const student = students.find((s) => s.id === child.studentId);
  const subjects = child.subjects;
  const overall = subjects.reduce((a, s) => a + s.average, 0) / subjects.length;
  const finals = Object.fromEntries(finalsForStudent(child.studentId).map((f) => [f.subject, f.grade]));

  const records = student ? DAYS.map((d) => getAttendance(student, isoDay(d))) : [];
  const count = (st) => records.filter((r) => r === st).length;
  const rate = records.length ? ((records.length - count('absent')) / records.length) * 100 : 100;

  return (
    <div className="page">
      <div className="rc-toolbar no-print">
        <Link to={role === 'parent' ? `/app/grades?child=${childId}` : '/app/grades'} className="btn btn-ghost">
          <FiArrowLeft /> {t('reportCard.back')}
        </Link>
        <div className="rc-toolbar-right">
          {role === 'parent' && many && <Segmented label={t('dash.parent.selectChild')} value={childId} onChange={setChildId} options={children.map((c) => ({ value: c.id, label: c.name }))} />}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <FiPrinter /> {t('reportCard.print')}
          </button>
        </div>
      </div>
      <p className="hint no-print">{t('reportCard.pdfHint')}</p>

      <article className="report-card panel" aria-label={t('reportCard.title')}>
        <header className="rc-head">
          <div>
            <Logo />
            <p className="rc-school">{ORG.name}</p>
          </div>
          <div className="rc-head-right">
            <h1>{t('reportCard.title')}</h1>
            <p>{tr(ORG.term)}</p>
          </div>
        </header>

        <dl className="rc-info">
          <div>
            <dt>{t('reportCard.student')}</dt>
            <dd>{child.full}</dd>
          </div>
          <div>
            <dt>{t('table.class')}</dt>
            <dd>{child.className}</dd>
          </div>
          <div>
            <dt>{t('reportCard.id')}</dt>
            <dd className="mono">{child.studentId}</dd>
          </div>
          <div>
            <dt>{t('reportCard.issued')}</dt>
            <dd className="num">{fmtDate(TODAY, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          </div>
        </dl>

        <table className="rc-table">
          <thead>
            <tr>
              <th>{t('grades.colSubject')}</th>
              <th>{t('grades.colTeacher')}</th>
              <th className="center">{t('reportCard.current')}</th>
              <th className="right">{t('grades.colAverage')}</th>
              <th className="center">{t('reportCard.final')}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.subject}>
                <td className="cell-strong">{ts(s.subject)}</td>
                <td>{s.teacher}</td>
                <td className="center">
                  <GradeChip value={s.grade} />
                </td>
                <td className="right num">{fmtDec(s.average)}</td>
                <td className="center">{finals[s.subject] ? <GradeChip value={finals[s.subject]} /> : <span className="t-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{t('reportCard.overall')}</td>
              <td className="right num">{fmtDec(overall, 2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>

        <section className="rc-att">
          <h2>{t('attendance.title')}</h2>
          <div className="rc-att-grid">
            <div>
              <span>{t('attendance.rate')}</span>
              <strong className="num">{fmtPct(rate)}</strong>
            </div>
            <div>
              <span>{t('reportCard.schoolDays')}</span>
              <strong className="num">{records.length}</strong>
            </div>
            <div>
              <span>{t('attendance.late')}</span>
              <strong className="num">{count('late')}</strong>
            </div>
            <div>
              <span>{t('attendance.absent')}</span>
              <strong className="num">{count('absent')}</strong>
            </div>
          </div>
        </section>

        <p className="rc-scale">
          {t('reportCard.scale')} {t('reportCard.finalNote')}
        </p>

        <footer className="rc-sign">
          <div>
            <span className="rc-line" />
            <span>
              {t('reportCard.tutor')} · {child.tutor}
            </span>
          </div>
          <div>
            <span className="rc-line" />
            <span>{t('reportCard.parent')}</span>
          </div>
        </footer>
      </article>
    </div>
  );
}
