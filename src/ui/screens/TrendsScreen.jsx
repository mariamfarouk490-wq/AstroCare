import { useApp, useTrend } from '../../state/store.js';
import TrendChart from '../features/TrendChart.jsx';
import { GlassPanel, Panel, RefList, Tabs, Stat, StatusBadge } from '../components/index.jsx';
import { FIELD_INFO } from '../../domain/analysis/fields.js';
import { formatNumber, formatShortDay, formatValue, shortLabel } from '../format.js';
import { navigate } from '../shell/useRoute.js';

const CHECKIN_FIELDS = ['sleepHours', 'exerciseMin'];

function MetricTrend({ code }) {
  const trend = useTrend({ metric: code });
  const { metric, points, range } = trend;
  const withValue = points.filter((p) => p.value !== undefined);
  const last = withValue.at(-1);
  const first = withValue[0];
  const base = [...points].reverse().find((p) => p.baseline)?.baseline;
  const rules = useApp((s) => s.seed.rules).filter((r) => r.params.metric === code);
  const fmt = (v) => formatValue(metric, v);
  return (
    <div className="trend-layout">
      <GlassPanel className="panel trend-main">
        <header className="panel__head">
          <div>
            <div className="eyebrow">{metric.label}</div>
            <h2 className="title-2">Generic band vs your baseline</h2>
          </div>
          <div className="legend footnote secondary">
            <span className="legend__item">
              <span className="legend__swatch legend__swatch--band" />
              Normal range{range?.source ? ` · ${range.source}` : ''}
            </span>
            <span className="legend__item">
              <span className="legend__swatch legend__swatch--base" />
              Personal baseline (7-day mean ± SD)
            </span>
          </div>
        </header>
        {withValue.length ? (
          <TrendChart points={points} range={range} unit={metric.unit} format={fmt} />
        ) : (
          <p className="secondary">No readings yet.</p>
        )}
        <p className="footnote tertiary">Day 1 is the first logged day. Dots: green inside the normal band, red ring outside it, solid red critical.</p>
      </GlassPanel>
      <div className="trend-side">
        <GlassPanel className="panel">
          <Stat label="Latest" value={last ? fmt(last.value) : undefined} unit={metric.unit} sub={last ? formatShortDay(last.day) : 'No reading'} />
          {last && (
            <div style={{ marginTop: 12 }}>
              <StatusBadge status={last.status} />
            </div>
          )}
        </GlassPanel>
        <GlassPanel className="panel">
          <Stat label="Your baseline" value={base ? fmt(base.mean) : undefined} unit={metric.unit} size="md" sub={base ? `± ${fmt(base.mean - base.low)} over the previous 7 days` : 'Needs 3 days of readings'} />
        </GlassPanel>
        <GlassPanel className="panel">
          <Stat
            label="Change since day 1"
            value={first && last ? `${last.value - first.value >= 0 ? '+' : '−'}${fmt(Math.abs(last.value - first.value))}` : undefined}
            unit={metric.unit}
            size="md"
          />
        </GlassPanel>
        {rules.length > 0 && (
          <Panel title="Rules on this metric">
            <ul className="rule-list">
              {rules.map((r) => (
                <li key={r.code}>
                  <code>{r.code}</code>
                  <StatusBadge status={r.severity} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <RefList refs={metric.refs} />
      </div>
    </div>
  );
}

function CheckInTrend({ field }) {
  const { points } = useTrend({ field });
  const seed = useApp((s) => s.seed);
  const info = FIELD_INFO[field];
  const rule = seed.rules.find((r) => r.kind === 'streak' && r.params.field === field);
  const lines = [];
  if (rule) lines.push({ value: rule.params.value, label: `${rule.code} below ${rule.params.value} ${info.unit}` });
  const needs = seed.environmentLimits.dailyNeeds.exerciseHoursPerDay;
  const range = field === 'exerciseMin' ? { min: needs.value * 60, max: Infinity } : undefined;
  const last = [...points].reverse().find((p) => p.value !== undefined);
  return (
    <div className="trend-layout">
      <GlassPanel className="panel trend-main">
        <header className="panel__head">
          <div>
            <div className="eyebrow">Check-in</div>
            <h2 className="title-2">{info.label}</h2>
          </div>
          {range && <span className="footnote secondary">Green: NASA target ≥ {range.min} min/day · {needs.source}</span>}
        </header>
        <TrendChart points={points} range={range} lines={lines} unit={info.unit} format={(v) => formatNumber(v, field === 'sleepHours' ? 1 : 0)} labels={{ band: 'NASA daily target' }} />
      </GlassPanel>
      <div className="trend-side">
        <GlassPanel className="panel">
          <Stat label="Latest" value={last ? formatNumber(last.value, field === 'sleepHours' ? 1 : 0) : undefined} unit={info.unit} sub={last ? formatShortDay(last.day) : 'No check-in'} />
        </GlassPanel>
        {rule && (
          <Panel title="Rule">
            <p className="footnote secondary">
              <code>{rule.code}</code> fires after {rule.params.days} days below {rule.params.value} {info.unit}.
            </p>
            <div style={{ marginTop: 12 }}>
              <RefList refs={rule.refs} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

export default function TrendsScreen({ param }) {
  const metrics = useApp((s) => s.seed.metrics);
  const options = [...metrics.map((m) => ({ value: m.code, label: shortLabel(m.label) })), ...CHECKIN_FIELDS.map((f) => ({ value: f, label: FIELD_INFO[f].label }))];
  const dayCount = useApp((s) => s.days.length);
  const selected = options.some((o) => o.value === param) ? param : metrics[0].code;
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <div className="eyebrow">Trends</div>
          <h1 className="title-large">Last {dayCount} days</h1>
        </div>
      </header>
      <div className="scroll-x">
        <Tabs label="Series" options={options} value={selected} onChange={(v) => navigate('trends', v)} />
      </div>
      {CHECKIN_FIELDS.includes(selected) ? <CheckInTrend key={selected} field={selected} /> : <MetricTrend key={selected} code={selected} />}
    </div>
  );
}
