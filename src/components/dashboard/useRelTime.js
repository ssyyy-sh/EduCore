import { useI18n } from '../../i18n/I18nContext.jsx';

/** "12 min ago", "3 h ago", "Yesterday", weekday or date — for feeds and inboxes. */
export function useRelTime() {
  const { t, fmtDate } = useI18n();
  return (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return t('common.now');
    if (mins < 60) return t('time.minAgo', { n: mins });
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    if (d >= startToday) return mins < 60 * 6 ? t('time.hAgo', { n: Math.round(mins / 60) }) : fmtDate(d, { hour: '2-digit', minute: '2-digit' });
    const startYesterday = new Date(startToday.getTime() - 86400000);
    if (d >= startYesterday) return t('time.yesterday');
    if (Date.now() - d.getTime() < 6 * 86400000) return fmtDate(d, { weekday: 'long', cap: true });
    return fmtDate(d, { day: 'numeric', month: 'short' });
  };
}

/** Is the date within the current calendar day? */
export const isToday = (date) => {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  return date >= s;
};
