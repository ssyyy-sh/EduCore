import { FiGlobe, FiCheck, FiChevronDown } from 'react-icons/fi';
import { useI18n, LANGS } from '../i18n/I18nContext.jsx';
import { Popover } from './ui/index.jsx';

/** Language picker: EN / RU / UZ. `compact` shows only the code. */
export default function LangSwitch({ compact, align = 'right' }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGS.find((l) => l.code === lang);
  return (
    <Popover
      align={align}
      role="menu"
      label={t('common.language')}
      style={{ minWidth: 170 }}
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="lang-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={`${t('common.language')}: ${current.label}`} onClick={toggle}>
          <FiGlobe aria-hidden="true" />
          <span>{compact ? current.short : current.label}</span>
          <FiChevronDown aria-hidden="true" className="lang-chev" />
        </button>
      )}
    >
      {(close) =>
        LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitemradio"
            aria-checked={l.code === lang}
            lang={l.code}
            className={`dropdown-item ${l.code === lang ? 'is-selected' : ''}`}
            onClick={() => {
              setLang(l.code);
              close();
            }}
          >
            <span className="lang-code mono">{l.short}</span>
            {l.label}
            {l.code === lang && <FiCheck className="check" />}
          </button>
        ))
      }
    </Popover>
  );
}
