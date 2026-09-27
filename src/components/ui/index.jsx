import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiImage,
  FiInbox,
  FiAlertTriangle,
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { initialsOf, toneOf } from '../../data/mock.js';

/* ---------- click outside (supports several refs, e.g. trigger + portal menu) ---------- */
export function useClickOutside(refs, onOutside, active = true) {
  const cb = useRef(onOutside);
  cb.current = onOutside;
  useEffect(() => {
    if (!active) return;
    const list = Array.isArray(refs) ? refs : [refs];
    const handler = (e) => {
      if (list.every((r) => !r.current || !r.current.contains(e.target))) cb.current();
    };
    const key = (e) => e.key === 'Escape' && cb.current();
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Positions a floating element (rendered in a portal) next to its anchor,
 * flips above when there is no room below and stays inside the viewport.
 * Portals avoid clipping by scroll containers, tables and modals.
 */
export function useFloating(open, anchorRef, floatRef, align = 'left') {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const f = floatRef.current;
      if (!a || !f) return;
      const fw = f.offsetWidth;
      const fh = f.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      let left = align === 'right' ? a.right - fw : a.left;
      left = Math.max(8, Math.min(left, vw - fw - 8));
      let top = a.bottom + 6;
      if (top + fh > vh - 8 && a.top - fh - 6 > 8) top = a.top - fh - 6;
      setPos({ top, left, minWidth: Math.min(a.width, vw - 16) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, anchorRef, floatRef]);
  return pos;
}

function Floating({ open, anchorRef, floatRef, align, className = '', children, role = 'menu', id, label, style }) {
  const pos = useFloating(open, anchorRef, floatRef, align);
  if (!open) return null;
  return createPortal(
    <div
      ref={floatRef}
      id={id}
      role={role}
      aria-label={label}
      className={`dropdown-menu is-floating ${className}`}
      style={{ ...style, top: pos?.top ?? 0, left: pos?.left ?? 0, minWidth: Math.max(pos?.minWidth ?? 0, style?.minWidth ?? 0) || undefined, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ---------- Select dropdown ---------- */
/**
 * options: array of values or { value, label }.
 * allLabel: when set, an extra "all" option with value '' is added first.
 */
export function Select({ label, value, options, onChange, align, allLabel, icon: Icon, id: idProp, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(-1);
  const trigger = useRef(null);
  const menu = useRef(null);
  const autoId = useId();
  const id = idProp || autoId;
  useClickOutside([trigger, menu], () => setOpen(false), open);

  const norm = options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));
  const opts = allLabel != null ? [{ value: '', label: allLabel }, ...norm] : norm;
  const current = opts.find((o) => String(o.value) === String(value ?? '')) ?? opts[0];
  const isSet = allLabel != null && value !== '' && value != null;

  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKey = (e) => {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      setFocus(Math.max(0, opts.indexOf(current)));
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocus((f) => Math.min(opts.length - 1, f + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocus((f) => Math.max(0, f - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (opts[focus]) choose(opts[focus]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="dropdown">
      <button
        ref={trigger}
        type="button"
        className={`dropdown-trigger ${isSet ? 'is-set' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={ariaLabel || (label ? `${label}: ${current?.label}` : undefined)}
        onClick={() => {
          setOpen((o) => !o);
          setFocus(Math.max(0, opts.indexOf(current)));
        }}
        onKeyDown={onKey}
      >
        {Icon && <Icon />}
        {label && <span className="dd-label">{label}</span>}
        <span className="dd-value">{current?.label}</span>
        <FiChevronDown />
      </button>
      <Floating open={open} anchorRef={trigger} floatRef={menu} align={align} role="listbox" id={`${id}-list`}>
        {opts.map((o, i) => {
          const selected = String(o.value) === String(value ?? '');
          return (
            <button
              type="button"
              key={String(o.value)}
              role="option"
              aria-selected={selected}
              className={`dropdown-item ${selected ? 'is-selected' : ''} ${focus === i ? 'is-focused' : ''}`}
              onMouseEnter={() => setFocus(i)}
              onClick={() => choose(o)}
            >
              {o.label}
              {selected && <FiCheck className="check" />}
            </button>
          );
        })}
      </Floating>
    </div>
  );
}

/* ---------- Menu (actions) ---------- */
export function Menu({ trigger, items, align = 'right', label }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const menu = useRef(null);
  useClickOutside([btn, menu], () => setOpen(false), open);
  return (
    <div className="dropdown">
      <button ref={btn} type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={label || t('common.openMenu')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      <Floating open={open} anchorRef={btn} floatRef={menu} align={align}>
        {items.map((it, i) =>
          it === 'sep' ? (
            <div className="dropdown-sep" key={`sep-${i}`} />
          ) : (
            <button
              type="button"
              role="menuitem"
              key={it.label}
              className={`dropdown-item ${it.danger ? 'is-danger' : ''}`}
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
            >
              {it.icon && <it.icon />}
              {it.label}
            </button>
          )
        )}
      </Floating>
    </div>
  );
}

/** Generic popover anchored to a custom trigger (header menus). */
export function Popover({ renderTrigger, children, align = 'right', className, label, role = 'dialog', style }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const pop = useRef(null);
  useClickOutside([btn, pop], () => setOpen(false), open);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="dropdown">
      {renderTrigger({ ref: btn, open, toggle: () => setOpen((o) => !o) })}
      <Floating open={open} anchorRef={btn} floatRef={pop} align={align} className={className} role={role} label={label} style={style}>
        {typeof children === 'function' ? children(close) : children}
      </Floating>
    </div>
  );
}

/* ---------- Search ---------- */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export function SearchInput({ value, onChange, placeholder, shortcut, id, style }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const ph = placeholder || t('common.search');
  useEffect(() => {
    if (!shortcut) return undefined;
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [shortcut]);
  return (
    <label className="search" style={style}>
      <FiSearch aria-hidden="true" />
      <span className="sr-only">{ph}</span>
      <input ref={ref} id={id} className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} autoComplete="off" />
      {value ? (
        <button type="button" className="search-clear" aria-label={t('common.clearSearch')} onClick={() => onChange('')}>
          <FiX size={14} />
        </button>
      ) : (
        shortcut && <kbd aria-hidden="true">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
      )}
    </label>
  );
}

/* ---------- Status ---------- */
const STATUS_MAP = {
  Completed: { tone: 'success', icon: FiCheckCircle },
  Pending: { tone: 'warning', icon: FiClock },
  Overdue: { tone: 'danger', icon: FiAlertCircle },
  Active: { tone: 'success' },
  'At risk': { tone: 'danger' },
  'On leave': { tone: 'info' },
  Inactive: { tone: 'neutral' },
};
export function Status({ value }) {
  const { tStatus } = useI18n();
  const cfg = STATUS_MAP[value] ?? { tone: 'neutral' };
  const Icon = cfg.icon;
  return (
    <span className={`status status-${cfg.tone}`}>
      {Icon ? <Icon aria-hidden="true" /> : <span className="dot" aria-hidden="true" />}
      {tStatus(value)}
    </span>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name = '', size = 28 }) {
  return (
    <span className={`avatar ${toneOf(name)}`} style={{ '--size': `${size}px` }} aria-hidden="true">
      {initialsOf(name) || '·'}
    </span>
  );
}

/* ---------- Progress bar ---------- */
export function Bar({ value, tone, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const auto = v < 60 ? 'danger' : v < 75 ? 'warning' : '';
  const t = tone === undefined ? auto : tone;
  return (
    <div className={`bar ${t ? `tone-${t}` : ''}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
export function BarInline({ value, tone }) {
  return (
    <div className="bar-inline">
      <Bar value={value} tone={tone} />
      <span className="num">{value}%</span>
    </div>
  );
}

/* ---------- Segmented ---------- */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => {
        const opt = typeof o === 'object' ? o : { value: o, label: o };
        return (
          <button key={opt.value} type="button" role="tab" aria-selected={value === opt.value} onClick={() => onChange(opt.value)}>
            {opt.icon && <opt.icon aria-hidden="true" />}
            {opt.label}
            {opt.count != null && <span className="count num">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Pagination ---------- */
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((p) => set.add(p));
  const arr = [...set].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const out = [];
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}
export function Pagination({ page, pageSize, total, onPage, onPageSize, noun }) {
  const { t, fmtNum } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pagination">
      <div className="num">{t('common.showing', { from: fmtNum(from), to: fmtNum(to), total: fmtNum(total), noun: noun || t('common.results') })}</div>
      <div className="pagination-right">
        {onPageSize && (
          <div className="page-size">
            <span>{t('common.rows')}</span>
            <Select value={pageSize} options={[10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }))} onChange={(v) => onPageSize(Number(v))} align="right" ariaLabel={t('common.rows')} />
          </div>
        )}
        <nav className="pager" aria-label={t('common.pagination')}>
          <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label={t('common.previousPage')}>
            <FiChevronLeft />
          </button>
          {pageList(page, pages).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="ellipsis">
                …
              </span>
            ) : (
              <button type="button" key={p} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label={t('common.nextPage')}>
            <FiChevronRight />
          </button>
        </nav>
      </div>
    </div>
  );
}

/* ---------- Empty / Error ---------- */
export function EmptyState({ icon: Icon = FiInbox, title, text, action, error }) {
  return (
    <div className={`empty ${error ? 'is-error' : ''}`} role={error ? 'alert' : undefined}>
      <div className="empty-icon">{error ? <FiAlertTriangle /> : <Icon />}</div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ w = '100%', h = 12, style }) {
  return <span className="skeleton" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

/** Brief skeleton state so data changes feel deliberate. */
export function useFakeLoading(ms = 450, deps = []) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return loading;
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, width }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  // Runs only when `open` changes — never on re-render, so typing keeps focus.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusT = setTimeout(() => {
      const el = ref.current?.querySelector('.modal-body input, .modal-body textarea, .modal-body select') || ref.current?.querySelector('.modal-foot button, .modal-head button');
      el?.focus();
    }, 20);
    return () => {
      clearTimeout(focusT);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} style={width ? { maxWidth: width } : undefined}>
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => closeRef.current()} aria-label={t('common.close')}>
            <FiX />
          </button>
        </div>
        {children && <div className="modal-body">{children}</div>}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Switch ---------- */
export function Switch({ checked, onChange, label, disabled, id }) {
  return <button type="button" id={id} role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />;
}

/* ---------- Toasts ---------- */
export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <FiCheckCircle aria-hidden="true" />
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ---------- Photo with graceful fallback ---------- */
export function Photo({ src, alt, className = '', style, eager }) {
  const [state, setState] = useState('loading');
  useEffect(() => setState('loading'), [src]);
  return (
    <div className={`photo ${state === 'loading' ? 'is-loading' : ''} ${className}`} style={style}>
      {state === 'error' ? (
        <div className="photo-fallback" role="img" aria-label={alt}>
          <FiImage />
        </div>
      ) : (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setState('loaded')} onError={() => setState('error')} />
      )}
    </div>
  );
}

/* ---------- Chart tooltip ---------- */
export function ChartTip({ active, payload, label, unit = '', fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-label">{label}</div>
      {payload.map((p) => (
        <div className="chart-tip-row" key={p.dataKey}>
          <span className="k">
            <span className="sw" style={{ background: p.color || p.stroke || p.fill }} />
            {p.name}
          </span>
          <span>{fmt ? fmt(p.value) : `${p.value}${unit}`}</span>
        </div>
      ))}
    </div>
  );
}
