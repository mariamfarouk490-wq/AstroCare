import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useHealth, useMetricTrends } from '../../state/store.js';
import BodyScene from '../three/BodyScene.jsx';
import AlertCard from '../features/AlertCard.jsx';
import MindSupport from '../features/MindSupport.jsx';
import { Button, EmptyState, Est, GlassPanel, Icon, Panel, Pill, RefList, Sheet, Sparkline, Stat, StatusBadge } from '../components/index.jsx';
import { activeProfile } from '../../domain/analysis/engine.js';
import { formatNumber, formatRange, formatValue, isEstimate, ROLE_LABEL, SOURCE_LABEL, formatTime } from '../format.js';
import { navigate } from '../shell/useRoute.js';
import { worstStatus } from '../../domain/analysis/metricStatus.js';
import { FIELD_INFO } from '../../domain/analysis/fields.js';

const PART_SHORT = { heart: 'Heart', brain: 'Mind & sleep', skeleton: 'Bones', abdomen: 'Metabolism', aura: 'Radiation' };
const STATUS_WORD = { Normal: 'Normal', Watch: 'Watch', Critical: 'Critical', NoData: 'no data' };

/** Text alternative for the 3D body, built from the same statuses as the chips. */
const bodyLabel = (parts) =>
  `3D body: ${parts.map(({ part, status }) => `${PART_SHORT[part.id] ?? part.label} ${STATUS_WORD[status] ?? status}`).join(', ')}. Use the body-system buttons to open each one.`;
const PART_ICON = { heart: 'heart', brain: 'moon', skeleton: 'bone', abdomen: 'flask', aura: 'atom' };
const STATUS_TONE = { Normal: 'var(--green)', Watch: 'var(--red)', Critical: 'var(--red)', NoData: 'var(--text-3)' };

/** Vitals rows: blood pressure is shown as one "sys/dia" row. */
function vitalRows(metrics) {
  const by = Object.fromEntries(metrics.map((m) => [m.metric.code, m]));
  const rows = [];
  for (const m of metrics) {
    if (m.metric.code === 'BP_DIASTOLIC') continue;
    if (m.metric.code === 'BP_SYSTOLIC') {
      const dia = by.BP_DIASTOLIC;
      rows.push({ key: 'BP', label: 'Blood pressure', unit: m.metric.unit, value: m.value === undefined ? undefined : `${formatValue(m.metric, m.value)}/${formatValue(dia.metric, dia.value)}`, status: worstStatus([m.status, dia.status]), main: m, codes: ['BP_SYSTOLIC'] });
      continue;
    }
    rows.push({ key: m.metric.code, label: m.metric.label, unit: m.metric.unit, value: m.value === undefined ? undefined : formatValue(m.metric, m.value), status: m.status, main: m, codes: [m.metric.code] });
  }
  return rows;
}

function VitalsPanel({ health }) {
  const trends = useMetricTrends(health.metrics.map((m) => m.metric.code));
  const rows = vitalRows(health.metrics);
  return (
    <Panel title="Vitals" aside={<span className="footnote tertiary">Latest · vs your baseline</span>} className="vitals">
      <div className="vitals__list">
        {rows.map((r) => {
          const t = trends[r.codes[0]];
          const base = r.main.baseline;
          return (
            <button key={r.key} type="button" className="vital" onClick={() => navigate('trends', r.codes[0])}>
              <div className="vital__top">
                <span className="vital__label">{r.label}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="vital__bottom">
                <Stat value={r.value} unit={r.unit} size="sm" sub={base ? `Baseline ${formatValue(r.main.metric, base.mean)} ± ${formatValue(r.main.metric, base.sd)}` : r.main.source ? SOURCE_LABEL[r.main.source] : 'No reading yet'} />
                <Sparkline values={t.points.map((p) => p.value)} band={t.range} width={96} height={34} tone={STATUS_TONE[r.status] === 'var(--green)' ? 'var(--text-1)' : STATUS_TONE[r.status]} />
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function CrewCard({ health }) {
  const c = health.checkIn;
  return (
    <GlassPanel className="panel crew-card">
      <div className="crew-card__head">
        <div>
          <div className="eyebrow">{ROLE_LABEL[health.crew.role]}</div>
          <h1 className="title-large">{health.crew.name}</h1>
        </div>
        <StatusBadge status={health.status} />
      </div>
      {c ? (
        <div className="crew-card__checkin">
          <Stat label="Sleep" value={formatNumber(c.sleepHours, 1)} unit="h" size="sm" />
          <Stat label="Mood" value={c.mood} unit="/5" size="sm" />
          <Stat label="Stress" value={c.stress} unit="/5" size="sm" />
          {c.exerciseMin !== undefined && <Stat label="Exercise" value={c.exerciseMin} unit="min" size="sm" />}
        </div>
      ) : (
        <p className="footnote secondary">No check-in for this day yet.</p>
      )}
      {c?.symptoms.length > 0 && (
        <p className="footnote secondary crew-card__symptoms">
          Reported: {c.symptoms.map((s) => s.replace(/_/g, ' ')).join(', ')}
        </p>
      )}
    </GlassPanel>
  );
}

function InsightsPanel({ health, onEmergency }) {
  const open = [...health.alerts].sort((a, b) => (a.acknowledgedAt ? 1 : 0) - (b.acknowledgedAt ? 1 : 0) || b.seedDay - a.seedDay);
  const combos = open.filter((a) => a.kind === 'combo');
  const rest = open.filter((a) => a.kind !== 'combo');
  return (
    <Panel
      title="Insights"
      aside={
        open.length > 0 && (
          <Button size="sm" variant="plain" onClick={() => navigate('alerts')}>
            All {open.length}
          </Button>
        )
      }
      className="insights"
    >
      {open.length === 0 ? (
        <EmptyState title="Nothing to act on">Every reading is inside the generic bands and the personal baseline.</EmptyState>
      ) : (
        <div className="insights__list">
          {combos.map((a) => (
            <AlertCard key={a.code} alert={a} compact onEmergency={onEmergency} />
          ))}
          {rest.slice(0, Math.max(1, 3 - combos.length)).map((a) => (
            <AlertCard key={a.code} alert={a} compact onEmergency={onEmergency} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function Meter({ value, max, limit, tone }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="meter" aria-hidden="true">
      <span className="meter__fill" style={{ width: `${pct}%`, background: tone }} />
      {limit !== undefined && <span className="meter__limit" style={{ left: `${(limit / max) * 100}%` }} />}
    </div>
  );
}

/** Which mission-profile field each derived value is computed from (for the "est." marker). */
const DERIVED_FROM = { cumulativeDoseMSv: 'dailyDoseMSv', careerLimitPct: 'dailyDoseMSv', estimatedBoneLossPct: 'boneLossPctPerMonth' };

function useActiveProfile() {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  return useMemo(() => activeProfile({ ...seed, settings }), [seed, settings]);
}

function EnvironmentPanel({ health }) {
  const limits = useApp((s) => s.seed.environmentLimits);
  const profile = useActiveProfile();
  const cabin = health.cabin;
  const co2Limit = limits.cabinAir.ppCO2MaxMmHg1h;
  const career = limits.radiation.careerLimitMSv;
  const d = health.derived;
  const co2High = cabin && cabin.ppCO2mmHg > co2Limit.value;
  return (
    <Panel title="Cabin & exposure" className="environment">
      <div className="env-block">
        <div className="env-block__row">
          <Stat label="Cabin ppCO2" value={cabin ? formatNumber(cabin.ppCO2mmHg, 1) : undefined} unit="mmHg" size="sm" />
          <StatusBadge status={!cabin ? 'NoData' : co2High ? 'Watch' : 'Normal'}>{!cabin ? 'No data' : co2High ? 'Above limit' : 'Within limit'}</StatusBadge>
        </div>
        {cabin && <Meter value={cabin.ppCO2mmHg} max={co2Limit.value * 1.6} limit={co2Limit.value} tone={co2High ? 'var(--red-action)' : 'var(--green-action)'} />}
        <span className="footnote tertiary">
          NASA limit {co2Limit.value} mmHg · {co2Limit.source}
        </span>
        {cabin && (
          <div className="env-mini num">
            <span>O₂ {cabin.ppO2mmHg} mmHg</span>
            <span>{cabin.temperatureC} °C</span>
            <span>{cabin.relativeHumidityPct}% RH</span>
          </div>
        )}
      </div>
      <hr className="divider" />
      <div className="env-block">
        <div className="env-block__row">
          <Stat label="Cumulative dose" value={formatNumber(d.cumulativeDoseMSv, 1)} unit="mSv" size="sm" est={isEstimate(profile, DERIVED_FROM.cumulativeDoseMSv)} />
          <span className="footnote secondary num">{formatNumber(d.careerLimitPct, 1)}% of career</span>
        </div>
        <Meter value={d.cumulativeDoseMSv} max={career.value} tone="var(--text-1)" />
        <span className="footnote tertiary">
          Career limit {career.value} mSv · {career.source}
        </span>
      </div>
      <div className="env-block">
        <div className="env-block__row">
          <Stat label={FIELD_INFO.estimatedBoneLossPct.label} value={formatNumber(d.estimatedBoneLossPct, 1)} unit="%" size="sm" est={isEstimate(profile, DERIVED_FROM.estimatedBoneLossPct)} />
          <span className="footnote secondary">estimate</span>
        </div>
      </div>
    </Panel>
  );
}

function PartSheet({ entry, health, onClose, onEmergency }) {
  const seed = useApp((s) => s.seed);
  const { part, status, alerts } = entry;
  const metrics = health.metrics.filter((m) => part.metrics.includes(m.metric.code));
  const risks = seed.nasaRisks.filter((r) => part.nasaRisks?.includes(r.code));
  const hazards = seed.hazards.filter((h) => part.hazards?.includes(h.code));
  const c = health.checkIn;
  const d = health.derived;
  const profile = useActiveProfile();
  return (
    <Sheet eyebrow="Body system" title={part.label} onClose={onClose} aside={<div className="sheet__status"><StatusBadge status={status} /></div>}>
      <section className="sheet-section">
        <h3 className="eyebrow">What it does</h3>
        <p>{part.functionText}</p>
      </section>
      <section className="sheet-section">
        <h3 className="eyebrow">In space</h3>
        <p className="secondary">{part.spaceEffectText}</p>
      </section>

      {metrics.length > 0 && (
        <section className="sheet-section">
          <h3 className="eyebrow">Readings</h3>
          <div className="list">
            {metrics.map((m) => (
              <div className="list__row" key={m.metric.code}>
                <div>
                  <div>{m.metric.label}</div>
                  <div className="footnote tertiary num">
                    {m.range ? `Normal ${formatRange(m.metric, m.range)}` : ''}
                    {m.baseline ? ` · You ${formatValue(m.metric, m.baseline.mean)} ± ${formatValue(m.metric, m.baseline.sd)}` : ''}
                  </div>
                </div>
                <div className="list__end">
                  <span className="num list__value">
                    {formatValue(m.metric, m.value)} <span className="tertiary footnote">{m.metric.unit}</span>
                  </span>
                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {part.checkinFields?.length > 0 && (
        <section className="sheet-section">
          <h3 className="eyebrow">Today’s check-in</h3>
          {c ? (
            <div className="list">
              {part.checkinFields.map((f) => (
                <div className="list__row" key={f}>
                  <span>{FIELD_INFO[f].label}</span>
                  <span className="num list__value">
                    {c[f]} <span className="tertiary footnote">{FIELD_INFO[f].unit}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="footnote secondary">No check-in yet today.</p>
          )}
        </section>
      )}

      {part.derived?.length > 0 && (
        <section className="sheet-section">
          <h3 className="eyebrow">Estimated from the mission profile</h3>
          <div className="list">
            {part.derived.map((f) => (
              <div className="list__row" key={f}>
                <span>{FIELD_INFO[f].label}</span>
                <span className="num list__value">
                  {formatNumber(d[f], 1)} <span className="tertiary footnote">{FIELD_INFO[f].unit}</span>
                  <Est show={isEstimate(profile, DERIVED_FROM[f])} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sheet-section">
        <h3 className="eyebrow">Open alerts</h3>
        {alerts.length ? (
          <div className="insights__list">
            {alerts.map((a) => (
              <AlertCard key={a.code} alert={a} compact onEmergency={onEmergency} />
            ))}
          </div>
        ) : (
          <p className="footnote secondary">None. This system is within its bands and your baseline.</p>
        )}
      </section>

      {hazards.length > 0 && (
        <section className="sheet-section">
          <h3 className="eyebrow">NASA RIDGE hazards</h3>
          <div className="tag-row">
            {hazards.map((h) => (
              <Pill key={h.code}>
                <strong>{h.code}</strong>&nbsp;{h.name}
              </Pill>
            ))}
          </div>
        </section>
      )}

      {risks.length > 0 && (
        <section className="sheet-section">
          <h3 className="eyebrow">NASA human system risks</h3>
          <div className="list">
            {risks.map((r) => (
              <div className="list__row" key={r.code}>
                <a href={r.refs[0]?.url} target="_blank" rel="noreferrer" className="risk-link">
                  {r.name}
                </a>
                <span className="footnote tertiary risk-coverage">{r.appCoverage}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {part.id === 'brain' && <MindSupport health={health} force />}

      <section className="sheet-section">
        <h3 className="eyebrow">Sources</h3>
        <RefList refs={part.refs} />
      </section>
    </Sheet>
  );
}

function PartChips({ parts, selectedId }) {
  return (
    <div className="part-chips" role="toolbar" aria-label="Body systems">
      {parts.map(({ part, status }) => (
        <button key={part.id} type="button" className="part-chip" aria-pressed={selectedId === part.id} onClick={() => navigate('body', selectedId === part.id ? undefined : part.id)}>
          <Icon name={PART_ICON[part.id] ?? 'body'} size={16} />
          <span>{PART_SHORT[part.id] ?? part.label}</span>
          <span className={`part-chip__dot part-chip__dot--${status}`} aria-hidden="true" />
          <span className="visually-hidden">: {STATUS_WORD[status] ?? status}</span>
        </button>
      ))}
    </div>
  );
}

const HINT_KEY = 'astrocare:hint-dismissed';
const readDismissed = () => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* private mode: the hint just comes back next visit */
  }
};

/** First-visit hint: how to start. Hidden once dismissed, once the demo runs, or once an organ is opened. */
function FirstHint({ selectedId }) {
  const demoOpen = useApp((s) => s.demo.open);
  const openDemo = useApp((s) => s.openDemo);
  const [dismissed, setDismissed] = useState(readDismissed);
  const dismiss = () => {
    setDismissed(true);
    remember();
  };
  // Starting the demo or opening an organ counts as "got it" (stored only; rendering already hides the hint).
  useEffect(() => {
    if (demoOpen || selectedId) remember();
  }, [demoOpen, selectedId]);
  if (dismissed || demoOpen || selectedId || readDismissed()) return null;
  return (
    <div className="first-hint" role="note">
      <span>Press Play to watch 10 mission days, or click an organ.</span>
      <Button size="sm" variant="primary" icon="play" onClick={() => openDemo(true)}>
        Play
      </Button>
      <Button size="sm" icon="close" aria-label="Dismiss hint" onClick={dismiss} />
    </div>
  );
}

/** Label of the hovered body part. Holds its own state so hovering never re-renders the screen or the 3D scene. */
function StageHover({ parts, connect }) {
  const [hovered, setHovered] = useState(null);
  useEffect(() => connect(setHovered), [connect]);
  const entry = parts.find((p) => p.part.id === hovered);
  if (!entry) return null;
  return (
    <div className="stage__hover">
      <StatusBadge status={entry.status}>{entry.part.label}</StatusBadge>
    </div>
  );
}

export default function BodyMapScreen({ param, onEmergency }) {
  const health = useHealth();
  const selected = useMemo(() => health.parts.find((p) => p.part.id === param), [health, param]);
  const hoverSink = useRef(() => {});
  const connectHover = useCallback((setter) => {
    hoverSink.current = setter;
    return () => {
      hoverSink.current = () => {};
    };
  }, []);
  const onHover = useCallback((id) => hoverSink.current(id), []);
  const onSelect = useCallback((id) => navigate('body', id ?? undefined), []);
  const heartRate = health.metrics.find((m) => m.metric.code === 'HEART_RATE')?.value;
  const lastReading = health.metrics.filter((m) => m.takenAt).map((m) => m.takenAt).sort().at(-1);
  return (
    <div className="body-screen">
      <div className="body-screen__left">
        <CrewCard health={health} />
        <VitalsPanel health={health} />
      </div>
      <div className="body-screen__stage">
        <BodyScene
          parts={health.parts}
          selectedId={param}
          onSelect={onSelect}
          onHover={onHover}
          heartRate={heartRate}
          dosePct={health.derived.careerLimitPct}
          label={bodyLabel(health.parts)}
          fallback={<EmptyState icon="body" title="3D view unavailable">Use the body-system buttons below.</EmptyState>}
        />
        <StageHover parts={health.parts} connect={connectHover} />
        <div className="stage__hint footnote tertiary">
          <Icon name="rotate" size={14} /> Drag to rotate · tap a point to open it
          {lastReading && <span className="num"> · last reading {formatTime(lastReading)}</span>}
        </div>
        <FirstHint selectedId={param} />
        <PartChips parts={health.parts} selectedId={param} />
      </div>
      <div className="body-screen__right">
        <InsightsPanel health={health} onEmergency={onEmergency} />
        <EnvironmentPanel health={health} />
      </div>
      {selected && <PartSheet entry={selected} health={health} onClose={() => navigate('body')} onEmergency={onEmergency} />}
    </div>
  );
}
