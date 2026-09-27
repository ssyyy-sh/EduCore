import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import ru from './ru.js';
import uz from './uz.js';

export const DICTS = { en, ru, uz };
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'ru', label: 'Русский', short: 'RU', locale: 'ru-RU' },
  { code: 'uz', label: 'O‘zbekcha', short: 'UZ', locale: 'uz-Latn-UZ' },
];

const I18nContext = createContext(null);

/*
 * Uzbek (Latin) date formatting is done by hand: several browsers ship
 * incomplete ICU data for "uz" and print things like "M09 27".
 */
const UZ = {
  monthsLong: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  monthsShort: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  weekLong: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  weekShort: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
};
function formatUz(d, o = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const time = o.hour || o.minute ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  const wd = o.weekday ? (o.weekday === 'long' ? UZ.weekLong : UZ.weekShort)[d.getDay()] : '';
  let date = '';
  if (o.day || o.month) {
    const m = o.month === 'long' ? UZ.monthsLong[d.getMonth()] : UZ.monthsShort[d.getMonth()];
    date = o.day ? `${d.getDate()}-${m}` : m;
    if (o.year) date += ` ${d.getFullYear()}`;
  }
  return [wd, date, time].filter(Boolean).join(', ');
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function detectLang() {
  try {
    const stored = window.localStorage.getItem('educore.lang');
    if (stored && DICTS[stored]) return stored;
  } catch {
    /* storage unavailable */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);
  const locale = LANGS.find((l) => l.code === lang).locale;

  const setLang = useCallback((code) => {
    if (!DICTS[code]) return;
    setLangState(code);
    try {
      window.localStorage.setItem('educore.lang', code);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    // Uzbek uses the same separators as Russian ("4 862,5"), which every browser formats correctly.
    const numLocale = lang === 'uz' ? 'ru-RU' : locale;
    const plural = new Intl.PluralRules(lang === 'uz' ? 'en' : locale);
    const numFmt = new Intl.NumberFormat(numLocale);

    /** Translate a key. Supports {var} interpolation and plural objects {one, few, many, other} via vars.count. */
    const t = (key, vars) => {
      let v = getPath(DICTS[lang], key);
      if (v === undefined) v = getPath(en, key);
      if (v === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      if (v && typeof v === 'object' && !Array.isArray(v) && vars && vars.count != null && ('other' in v || 'one' in v)) {
        v = v[plural.select(vars.count)] ?? v.other ?? v.one;
      }
      if (typeof v === 'string' && vars) {
        v = v.replace(/\{(\w+)\}/g, (_, k) => {
          if (vars[k] == null) return `{${k}}`;
          return typeof vars[k] === 'number' ? numFmt.format(vars[k]) : vars[k];
        });
      }
      return v;
    };

    /** Pick the current language from a {en, ru, uz} object (or return a plain string). */
    const tr = (obj) => (obj == null ? '' : typeof obj === 'string' ? obj : obj[lang] ?? obj.en);

    const fmtNum = (n, opts) => new Intl.NumberFormat(numLocale, opts).format(n);
    const fmtDec = (n, digits = 1) => new Intl.NumberFormat(numLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
    const fmtPct = (n, digits = 1) => `${fmtDec(n, digits)}%`;
    /** Locale-aware date. Pass { cap: true } to capitalise (for the start of a sentence). */
    const fmtDate = (d, opts = { day: 'numeric', month: 'short' }) => {
      const { cap: capitalise, ...o } = opts;
      const out = lang === 'uz' ? formatUz(d, o) : new Intl.DateTimeFormat(locale, o).format(d);
      return capitalise ? cap(out) : out;
    };

    const relativeDue = (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((date - today) / 86400000);
      if (diff === 0) return t('time.today');
      if (diff === 1) return t('time.tomorrow');
      if (diff === -1) return t('time.yesterday');
      if (diff < 0) return t('time.daysAgo', { count: Math.abs(diff) });
      if (diff < 7) return t('time.inDays', { count: diff });
      return fmtDate(date);
    };

    return {
      lang,
      setLang,
      locale,
      t,
      tr,
      fmtNum,
      fmtDec,
      fmtPct,
      fmtDate,
      relativeDue,
      ts: (subject) => t(`subjects.${subject}`),
      tm: (month) => t(`months.${month}`),
      tw: (day) => t(`weekdays.${day}`),
      tStatus: (s) => t(`status.${s}`),
    };
  }, [lang, locale, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
