import { useId } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { ChartTip } from '../ui/index.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

/* Shared, minimal chart styling: one axis per chart, recessive grid, thin marks.
   Callers pass data whose x labels are already translated. */
const axis = { fontSize: 11, fill: 'var(--chart-axis)' };
const grid = <CartesianGrid vertical={false} stroke="var(--chart-grid)" />;
const cursorLine = { stroke: 'var(--border-strong)', strokeWidth: 1 };
const cursorBar = { fill: 'var(--bg-subtle)' };

/** Default number formatter for the current language. */
function useFmt(fmt, unit, digits) {
  const { fmtNum } = useI18n();
  if (fmt) return fmt;
  return (v) => `${fmtNum(v, digits != null ? { maximumFractionDigits: digits } : undefined)}${unit}`;
}

export function TrendLine({ data, x, y, compare, yDomain, unit = '', height = 240, names = {}, fmt, digits = 1 }) {
  const f = useFmt(fmt, unit, digits);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          {grid}
          <XAxis dataKey={x} tick={axis} axisLine={false} tickLine={false} dy={6} />
          <YAxis domain={yDomain ?? ['auto', 'auto']} tick={axis} axisLine={false} tickLine={false} width={48} tickFormatter={f} />
          <Tooltip content={<ChartTip fmt={f} />} cursor={cursorLine} />
          {compare && <Line type="monotone" dataKey={compare} name={names[compare] ?? compare} stroke="var(--faint)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={700} />}
          <Line type="monotone" dataKey={y} name={names[y] ?? y} stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--chart-1)' }} animationDuration={900} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendArea({ data, x, y, yDomain, unit = '', height = 220, name, fmt, target, targetLabel, digits = 1 }) {
  const gid = `area-${useId().replace(/:/g, '')}`;
  const f = useFmt(fmt, unit, digits);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey={x} tick={axis} axisLine={false} tickLine={false} dy={6} />
          <YAxis domain={yDomain ?? ['auto', 'auto']} tick={axis} axisLine={false} tickLine={false} width={52} tickFormatter={f} />
          <Tooltip content={<ChartTip fmt={f} />} cursor={cursorLine} />
          {target != null && (
            <ReferenceLine y={target} stroke="var(--faint)" strokeDasharray="4 4" label={{ value: targetLabel, position: 'insideTopRight', fontSize: 11, fill: 'var(--muted)' }} />
          )}
          <Area type="monotone" dataKey={y} name={name ?? y} stroke="var(--chart-1)" strokeWidth={2} fill={`url(#${gid})`} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RoundedBar(props) {
  const { x: bx, y: by, width: w, height: h, fill } = props;
  if (!h || h <= 0) return null;
  const r = Math.min(4, w / 2, h);
  return <path d={`M${bx},${by + h} L${bx},${by + r} Q${bx},${by} ${bx + r},${by} L${bx + w - r},${by} Q${bx + w},${by} ${bx + w},${by + r} L${bx + w},${by + h} Z`} fill={fill} />;
}

/** Bar chart; `second` adds a comparison series. `highlightLast` emphasises the latest bar. */
export function Bars({ data, x, y, second, yDomain, unit = '', height = 220, names = {}, fmt, highlightLast, layout = 'horizontal', digits = 1, interval = 0 }) {
  const f = useFmt(fmt, unit, digits);
  const vertical = layout === 'vertical';
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: vertical ? 8 : 4, bottom: 0 }} barGap={2}>
          {vertical ? <CartesianGrid horizontal={false} stroke="var(--chart-grid)" /> : grid}
          {vertical ? (
            <>
              <XAxis type="number" domain={yDomain ?? [0, 'auto']} tick={axis} axisLine={false} tickLine={false} tickFormatter={f} />
              <YAxis type="category" dataKey={x} tick={axis} axisLine={false} tickLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} tick={axis} axisLine={false} tickLine={false} dy={6} interval={interval} />
              <YAxis domain={yDomain ?? [0, 'auto']} tick={axis} axisLine={false} tickLine={false} width={52} tickFormatter={f} />
            </>
          )}
          <Tooltip content={<ChartTip fmt={f} />} cursor={cursorBar} />
          {second && <Bar dataKey={second} name={names[second] ?? second} fill="var(--chart-3)" radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />}
          <Bar
            dataKey={y}
            name={names[y] ?? y}
            fill="var(--chart-1)"
            radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={22}
            animationDuration={800}
            shape={highlightLast ? (p) => <RoundedBar {...p} fill={p.index === data.length - 1 ? 'var(--chart-1)' : 'var(--chart-2)'} /> : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Radial progress ring with centred value. */
export function ProgressRing({ value, label, size = 148 }) {
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="80%" outerRadius="100%" data={[{ value }]} startAngle={90} endAngle={-270} barSize={10}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} fill="var(--chart-1)" background={{ fill: 'var(--bg-subtle)' }} animationDuration={900} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="ring-center">
        <strong className="num">{value}%</strong>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}

/** Tiny sparkline with an emphasised endpoint. */
export function Sparkline({ data, height = 36 }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height, width: '100%' }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
          <Line
            type="monotone"
            dataKey="v"
            stroke="var(--chart-1)"
            strokeWidth={1.6}
            isAnimationActive={false}
            dot={(p) => (p.index === d.length - 1 ? <circle key="end" cx={p.cx} cy={p.cy} r={3} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={1.5} /> : <g key={p.index} />)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}>
          <i className={it.dashed ? 'dash' : ''} style={it.dashed ? undefined : { background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Replace month keys ("Sep") with translated labels for chart x axes. */
export function useMonthData(data, key = 'month') {
  const { tm } = useI18n();
  return data.map((d) => ({ ...d, [key]: tm(d[key]) }));
}
