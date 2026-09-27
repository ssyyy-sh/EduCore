import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiClock, FiBell, FiTrendingUp, FiCalendar, FiBookOpen, FiFilter, FiDownload, FiUsers, FiLayers } from 'react-icons/fi';
import DashboardPreview from './DashboardPreview.jsx';
import { Photo } from '../ui/index.jsx';
import { IMAGES } from '../../data/images.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

function Points({ items, icons }) {
  return (
    <ul className="sc-points">
      {items.map(({ title, text }, i) => {
        const I = icons[i];
        return (
          <li key={title}>
            <I aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Showcase() {
  const { t, fmtDec } = useI18n();
  const card = t('landing.showcase.parents.card');
  const editorial = t('landing.showcase.editorial');
  return (
    <>
      <section className="section sc" id="students">
        <div className="container sc-grid">
          <div className="sc-copy">
            <p className="eyebrow">{t('landing.showcase.students.eyebrow')}</p>
            <h2>{t('landing.showcase.students.title')}</h2>
            <p className="lead">{t('landing.showcase.students.lead')}</p>
            <Points items={t('landing.showcase.students.points')} icons={[FiCalendar, FiBookOpen, FiTrendingUp]} />
            <Link to="/login" className="link-more sc-link">
              {t('landing.showcase.students.link')} <FiArrowRight />
            </Link>
          </div>
          <div className="sc-visual">
            <DashboardPreview variant="student" />
          </div>
        </div>
      </section>

      <section className="section sc sc-parents" id="parents">
        <div className="container sc-grid sc-grid-rev">
          <div className="sc-photo-wrap">
            <Photo src={IMAGES.studyHome} alt={t('landing.showcase.parents.photoAlt')} className="sc-photo" />
            <div className="parent-card" aria-hidden="true">
              <div className="parent-card-head">
                <div className="pc-tabs">
                  <span className="on">Alex</span>
                  <span>Emma</span>
                  <span>Daniel</span>
                </div>
                <span className="pc-class">9-A</span>
              </div>
              <div className="pc-stats">
                <div>
                  <span>{card.avg}</span>
                  <strong className="num">{fmtDec(4.8)}</strong>
                </div>
                <div>
                  <span>{card.attendance}</span>
                  <strong className="num">94%</strong>
                </div>
                <div>
                  <span>{card.progress}</span>
                  <strong className="num">82%</strong>
                </div>
              </div>
              <div className="pc-row">
                <FiCheckCircle className="ok" />
                <span>{card.row1}</span>
                <b>5</b>
              </div>
              <div className="pc-row">
                <FiClock className="warn" />
                <span>{card.row2}</span>
              </div>
              <div className="pc-row">
                <FiBell />
                <span>{card.row3}</span>
              </div>
            </div>
          </div>
          <div className="sc-copy">
            <p className="eyebrow">{t('landing.showcase.parents.eyebrow')}</p>
            <h2>{t('landing.showcase.parents.title')}</h2>
            <p className="lead">{t('landing.showcase.parents.lead')}</p>
            <Points items={t('landing.showcase.parents.points')} icons={[FiTrendingUp, FiBell, FiUsers]} />
            <Link to="/login" className="link-more sc-link">
              {t('landing.showcase.parents.link')} <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="editorial" aria-label={editorial.label}>
        <div className="container">
          <div className="editorial-grid">
            <Photo src={IMAGES.classroom} alt={editorial.alt1} className="editorial-photo editorial-photo-lg" />
            <div className="editorial-side">
              <Photo src={IMAGES.library} alt={editorial.alt2} className="editorial-photo" />
              <div className="editorial-quote">
                <FiLayers aria-hidden="true" className="editorial-icon" />
                <h3>{editorial.title}</h3>
                <p>{editorial.text}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section sc sc-schools" id="schools">
        <div className="container">
          <div className="section-head section-head-split">
            <div>
              <p className="eyebrow">{t('landing.showcase.schools.eyebrow')}</p>
              <h2>{t('landing.showcase.schools.title')}</h2>
            </div>
            <div>
              <p className="lead">{t('landing.showcase.schools.lead')}</p>
              <div className="sc-inline-actions">
                <Link to="/login" className="btn btn-primary">
                  {t('landing.showcase.schools.open')} <FiArrowRight />
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  {t('landing.showcase.schools.browse')}
                </Link>
              </div>
            </div>
          </div>
          <div className="sc-wide">
            <DashboardPreview variant="school" />
            <div className="sc-callouts">
              {t('landing.showcase.schools.callouts').map((c, i) => {
                const I = [FiFilter, FiTrendingUp, FiDownload][i];
                return (
                  <div key={c.title}>
                    <I aria-hidden="true" />
                    <strong>{c.title}</strong>
                    <span>{c.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
