import { FiArrowUpRight, FiArrowDownRight, FiMinus } from 'react-icons/fi';
import { Skeleton } from '../ui/index.jsx';

/**
 * KPI tile. `delta` is a number (positive = up); `deltaGood` flips semantics
 * for metrics where lower is better.
 */
export default function StatsCard({ icon: Icon, label, value, suffix, delta, deltaLabel, deltaGood = true, hint, loading, children }) {
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const good = dir === 'flat' ? null : (dir === 'up') === deltaGood;
  const DIcon = dir === 'up' ? FiArrowUpRight : dir === 'down' ? FiArrowDownRight : FiMinus;
  return (
    <div className="stat">
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        {Icon && <Icon className="stat-icon" aria-hidden="true" />}
      </div>
      {loading ? (
        <Skeleton w="60%" h={28} style={{ margin: '6px 0 4px' }} />
      ) : (
        <div className="stat-value num">
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </div>
      )}
      <div className="stat-foot">
        {delta !== undefined && (
          <span className={`stat-delta ${good === null ? '' : good ? 'is-good' : 'is-bad'}`}>
            <DIcon aria-hidden="true" />
            <span className="num">{deltaLabel ?? `${delta > 0 ? '+' : ''}${delta}`}</span>
          </span>
        )}
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
