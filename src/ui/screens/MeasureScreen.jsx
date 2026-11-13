import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useHealth } from '../../state/store.js';
import { statusOf } from '../../domain/analysis/metricStatus.js';
import { Button, GlassPanel, Icon, Modal, Panel, Pill, RefList, Tabs, Stat, StatusBadge } from '../components/index.jsx';
import { formatValue, shortLabel } from '../format.js';
import { navigate } from '../shell/useRoute.js';

const GLUCOSE_CONTEXTS = [
  { value: 'Fasting', label: 'Fasting' },
  { value: 'PostMeal2h', label: '2 h after meal' },
  { value: 'Random', label: 'Random' },
];

/** Which metrics a guide records (blood pressure = systolic + diastolic). */
const guideMetrics = (code) => (code === 'BP_SYSTOLIC' ? ['BP_SYSTOLIC', 'BP_DIASTOLIC'] : [code]);

function useSaveResult() {
  const seed = useApp((s) => s.seed);
  const notify = useApp((s) => s.notify);
  return (result, readings, glucoseContext) => {
    if (!result.ok) return result.error;
    const statuses = readings.map((r) => statusOf(seed.metrics.find((m) => m.code === r.metric), r.value, glucoseContext));
    const worst = statuses.includes('Critical') ? 'Critical' : statuses.includes('Watch') ? 'Watch' : 'Normal';
    notify(`Saved · ${worst === 'Normal' ? 'within the normal band' : worst === 'Watch' ? 'outside the normal band' : 'critical value, see the guide'}`, worst === 'Normal' ? 'ok' : 'alert');
    return null;
  };
}

function GuideCard({ guide }) {
  return (
    <Panel className="guide" title={null}>
      <div className="eyebrow">Guided measurement</div>
      <h2 className="title-2 guide__title">{guide.title}</h2>
      <p className="secondary guide__why">{guide.why}</p>
      <ol className="steps">
        {guide.steps.map((s, i) => (
          <li key={s} className="steps__item">
            <span className="steps__n num">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="guide__if">
        <div className="guide__if-row guide__if-row--watch">
          <StatusBadge status="Watch" />
          <span>{guide.ifWatch}</span>
        </div>
        <div className="guide__if-row guide__if-row--critical">
          <StatusBadge status="Critical" />
          <span>{guide.ifCritical}</span>
        </div>
      </div>
      <RefList refs={guide.sources} />
    </Panel>
  );
}

function ManualEntry({ guide, disabled }) {
  const seed = useApp((s) => s.seed);
  const addMeasurement = useApp((s) => s.addMeasurement);
  const save = useSaveResult();
  const codes = guideMetrics(guide.metric);
  const metrics = codes.map((c) => seed.metrics.find((m) => m.code === c));
  const [values, setValues] = useState({});
  const [context, setContext] = useState('Fasting');
  const [error, setError] = useState(null);
  const invalid = (m) => {
    const v = values[m.code];
    return v !== undefined && v !== '' && (Number(v) < m.validMin || Number(v) > m.validMax);
  };
  const ready = metrics.every((m) => values[m.code] !== undefined && values[m.code] !== '' && !invalid(m));
  const submit = (e) => {
    e.preventDefault();
    const readings = metrics.map((m) => ({ metric: m.code, value: Number(values[m.code]) }));
    const glucoseContext = codes.includes('GLUCOSE') ? context : undefined;
    const err = save(addMeasurement({ readings, source: 'manual', glucoseContext }), readings, glucoseContext);
    setError(err);
    if (!err) setValues({});
  };
  return (
    <form className="entry" onSubmit={submit}>
      <div className={`entry__fields entry__fields--${metrics.length}`}>
        {metrics.map((m) => (
          <label key={m.code} className="field">
            <span className="field__label">{m.label}</span>
            <div className="input-unit">
              <input
                className="input input--big"
                type="number"
                inputMode="decimal"
                step={m.step}
                min={m.validMin}
                max={m.validMax}
                value={values[m.code] ?? ''}
                aria-invalid={invalid(m)}
                onChange={(e) => setValues({ ...values, [m.code]: e.target.value })}
                placeholder="–"
              />
              <span className="input-unit__unit">{m.unit}</span>
            </div>
            <span className={invalid(m) ? 'field__error' : 'field__hint'}>
              Valid {m.validMin}–{m.validMax} {m.unit}
            </span>
          </label>
        ))}
      </div>
      {codes.includes('GLUCOSE') && <Tabs label="Glucose context" options={GLUCOSE_CONTEXTS} value={context} onChange={setContext} block />}
      {error && <p className="field__error">{error}</p>}
      <Button type="submit" variant="primary" block disabled={!ready || disabled}>
        Save reading
      </Button>
    </form>
  );
}

function WatchPanel({ health, disabled }) {
  const settings = useApp((s) => s.user.settings);
  const setSettings = useApp((s) => s.setSettings);
  const streamWatch = useApp((s) => s.streamWatch);
  const ingest = useApp((s) => s.ingestWatchSample);
  const save = useSaveResult();
  const [connected, setConnected] = useState(false);
  const [sample, setSample] = useState(null);
  const [count, setCount] = useState(0);
  const start = useMemo(() => {
    const v = (code) => health.metrics.find((m) => m.metric.code === code)?.value;
    return { HEART_RATE: v('HEART_RATE'), SPO2: v('SPO2') };
  }, [health]);
  useEffect(() => {
    if (!connected) return undefined;
    const stop = streamWatch({ start, intervalSec: settings.watchIntervalSec, scenario: settings.scenario }, (s) => {
      setSample(s);
      setCount((n) => n + 1);
    });
    return stop;
    // restart only when connection or scenario changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, settings.scenario, settings.watchIntervalSec]);
  const hr = sample?.readings.find((r) => r.metric === 'HEART_RATE');
  const spo2 = sample?.readings.find((r) => r.metric === 'SPO2');
  const canStart = start.HEART_RATE !== undefined && start.SPO2 !== undefined;
  return (
    <div className="watch">
      <div className="watch__status">
        <span className={`watch__led${connected ? ' is-on' : ''}`} />
        <span className="footnote secondary">{connected ? `Streaming every ${settings.watchIntervalSec} s · ${count} samples` : 'Simulated watch · not connected'}</span>
        <Pill tone="neutral">Simulated</Pill>
      </div>
      <div className="watch__face">
        <div className="watch__metric">
          <span className={`watch__beat${connected ? ' is-on' : ''}`}>
            <Icon name="heart" size={18} />
          </span>
          <Stat label="Heart rate" value={hr?.value} unit="bpm" />
        </div>
        <div className="watch__metric">
          <span className="watch__beat">
            <Icon name="wind" size={18} />
          </span>
          <Stat label="SpO2" value={spo2?.value} unit="%" />
        </div>
      </div>
      <Tabs
        label="Scenario"
        block
        value={settings.scenario}
        onChange={(scenario) => setSettings({ scenario })}
        options={[
          { value: 'normal', label: 'Steady' },
          { value: 'risingHr', label: 'Rising HR' },
          { value: 'lowSpo2', label: 'Falling SpO2' },
        ]}
      />
      <div className="row-gap">
        <Button block icon="watch" onClick={() => setConnected(!connected)} disabled={!canStart}>
          {connected ? 'Disconnect' : 'Connect watch'}
        </Button>
        <Button
          block
          variant="primary"
          disabled={!sample || disabled}
          onClick={() => save(ingest({ readings: sample.readings, at: sample.at.replace(/\.\d{3}Z$/, 'Z') }), sample.readings)}
        >
          Save sample
        </Button>
      </div>
      {!canStart && <p className="footnote tertiary">The watch starts from the latest reading. Log one manual reading first.</p>}
    </div>
  );
}

function PhotoPanel({ health, disabled }) {
  const seed = useApp((s) => s.seed);
  const readFromImage = useApp((s) => s.readFromImage);
  const sampleDisplayImage = useApp((s) => s.sampleDisplayImage);
  const addMeasurement = useApp((s) => s.addMeasurement);
  const save = useSaveResult();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [simulated, setSimulated] = useState(false);

  const run = async (blob, isSample) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setSimulated(isSample);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    try {
      const r = await readFromImage(blob);
      setResult(r);
      setRows(r.readings.map((x) => ({ ...x, value: String(x.value) })));
      if (!r.readings.length) setError('Digits found, but no reading matched. Add them below.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sample = async () => {
    const v = (code) => health.metrics.find((m) => m.metric.code === code)?.value;
    const lines = [v('BP_SYSTOLIC'), v('BP_DIASTOLIC'), v('HEART_RATE')].filter((x) => x !== undefined);
    run(await sampleDisplayImage(lines), true);
  };

  const submit = () => {
    const readings = rows.map((r) => ({ metric: r.metric, value: Number(r.value) }));
    const corrected = result && rows.some((r, i) => String(result.readings[i]?.value) !== r.value || result.readings[i]?.metric !== r.metric);
    const glucoseContext = readings.some((r) => r.metric === 'GLUCOSE') ? 'Random' : undefined;
    const err = save(addMeasurement({ readings, source: 'ocr', glucoseContext, ocr: { rawText: result?.rawText ?? '', confidence: result?.confidence ?? 0, corrected } }), readings, glucoseContext);
    setError(err);
    if (!err) {
      setRows([]);
      setResult(null);
    }
  };

  return (
    <div className="photo">
      <div className="photo__drop">
        {preview ? <img src={preview} alt="Device display to read" className="photo__img" /> : <Icon name="camera" size={28} />}
        <div className="row-gap">
          <Button icon="camera" onClick={() => fileRef.current?.click()} disabled={busy}>
            Take or choose photo
          </Button>
          <Button onClick={sample} disabled={busy}>
            Sample display
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && run(e.target.files[0], false)} />
        <span className="footnote tertiary">Reads digits on-device, no network. Crop tightly around the numbers.</span>
      </div>
      {busy && <p className="footnote secondary">Reading digits…</p>}
      {result && (
        <div className="photo__result">
          <div className="photo__raw">
            <span className="eyebrow">Read</span>
            <code className="num">{result.rawText.replace(/\n/g, ' · ')}</code>
            <span className="footnote tertiary num">
              match {result.confidence}%{simulated ? ' · simulated photo' : ''}
            </span>
          </div>
          {rows.map((r, i) => {
            const m = seed.metrics.find((x) => x.code === r.metric);
            return (
              <div key={i} className="photo__row">
                <select className="input" value={r.metric} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, metric: e.target.value } : x)))}>
                  {seed.metrics.map((x) => (
                    <option key={x.code} value={x.code}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <div className="input-unit">
                  <input className="input" type="number" value={r.value} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
                  <span className="input-unit__unit">{m?.unit}</span>
                </div>
                <Button icon="close" aria-label="Remove" onClick={() => setRows(rows.filter((_, k) => k !== i))} />
              </div>
            );
          })}
          <Button size="sm" variant="plain" icon="plus" onClick={() => setRows([...rows, { metric: 'HEART_RATE', value: '' }])}>
            Add value
          </Button>
          <Button variant="primary" block disabled={!rows.length || disabled} onClick={submit}>
            Confirm and save
          </Button>
        </div>
      )}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

function Stepper({ label, value, onChange, step, min, max, unit }) {
  return (
    <div className="stepper">
      <span className="field__label">{label}</span>
      <div className="stepper__control">
        <button type="button" className="stepper__btn" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}>
          −
        </button>
        <span className="stepper__value num">
          {value}
          <span className="stat__unit"> {unit}</span>
        </span>
        <button type="button" className="stepper__btn" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}>
          +
        </button>
      </div>
    </div>
  );
}

const SCALE = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

function CheckInPanel({ health, disabled, onEmergency }) {
  const symptoms = useApp((s) => s.seed.symptoms);
  const submitCheckIn = useApp((s) => s.submitCheckIn);
  const notify = useApp((s) => s.notify);
  const prior = health.checkIn;
  const [form, setForm] = useState(() => ({
    sleepHours: prior?.sleepHours ?? 7,
    mood: prior?.mood ?? 3,
    stress: prior?.stress ?? 2,
    exerciseMin: prior?.exerciseMin ?? 0,
    symptoms: prior?.symptoms ?? [],
  }));
  const [redFlags, setRedFlags] = useState(null);
  const [error, setError] = useState(null);
  const set = (patch) => setForm({ ...form, ...patch });
  const toggle = (code) => set({ symptoms: form.symptoms.includes(code) ? form.symptoms.filter((s) => s !== code) : [...form.symptoms, code] });
  const submit = () => {
    const r = submitCheckIn(form);
    if (!r.ok) return setError(r.error);
    setError(null);
    if (r.value.redFlags.length) setRedFlags(r.value.redFlags);
    else notify('Check-in saved', 'ok');
  };
  const sorted = [...symptoms].sort((a, b) => Number(b.redFlag) - Number(a.redFlag));
  return (
    <Panel title="Daily check-in" aside={<span className="footnote tertiary">{prior ? 'Logged today · update' : 'Not logged today'}</span>} id="checkin" className="checkin">
      <div className="checkin__grid">
        <Stepper label="Sleep last night" value={form.sleepHours} onChange={(sleepHours) => set({ sleepHours })} step={0.5} min={0} max={24} unit="h" />
        <Stepper label="Exercise today" value={form.exerciseMin} onChange={(exerciseMin) => set({ exerciseMin })} step={15} min={0} max={600} unit="min" />
        <div className="field">
          <span className="field__label">Mood · 1 low, 5 great</span>
          <Tabs label="Mood" options={SCALE} value={form.mood} onChange={(mood) => set({ mood })} block />
        </div>
        <div className="field">
          <span className="field__label">Stress · 1 calm, 5 overwhelmed</span>
          <Tabs label="Stress" options={SCALE} value={form.stress} onChange={(stress) => set({ stress })} block />
        </div>
      </div>
      <div className="field">
        <span className="field__label">Symptoms today</span>
        <div className="chips">
          {sorted.map((s) => (
            <button key={s.code} type="button" className={`chip${s.redFlag ? ' chip--flag' : ''}`} aria-pressed={form.symptoms.includes(s.code)} onClick={() => toggle(s.code)}>
              {s.redFlag && <span className="chip__flag" aria-label="red flag" />}
              {s.label}
            </button>
          ))}
        </div>
        <span className="field__hint">
          <span className="chip__flag inline-flag" /> red flag: opens Emergency mode
        </span>
      </div>
      {error && <p className="field__error">{error}</p>}
      <Button variant="primary" block onClick={submit} disabled={disabled}>
        Save check-in
      </Button>
      {redFlags && (
        <Modal title="Red-flag symptom" onClose={() => setRedFlags(null)}>
          <p className="secondary modal__text">
            You reported {redFlags.map((r) => r.label.toLowerCase()).join(', ')}. Start Emergency mode now and follow the protocol.
          </p>
          <RefList refs={redFlags.flatMap((r) => r.refs)} />
          <div className="row-gap actions">
            <Button block onClick={() => setRedFlags(null)}>
              Not now
            </Button>
            <Button
              block
              variant="danger"
              icon="emergency"
              onClick={() => {
                setRedFlags(null);
                onEmergency(redFlags.some((r) => r.code === 'chest_pain') ? 'CHEST_PAIN' : undefined);
              }}
            >
              Emergency mode
            </Button>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

export default function MeasureScreen({ param, onEmergency }) {
  const guides = useApp((s) => s.seed.guides);
  const metrics = useApp((s) => s.seed.metrics);
  const replaying = useApp((s) => s.viewDay !== null);
  const health = useHealth();
  const initial = guides.find((g) => guideMetrics(g.metric).includes(param))?.metric ?? guides[0].metric;
  const [metric, setMetric] = useState(initial);
  const [method, setMethod] = useState('manual');
  const guide = guides.find((g) => g.metric === metric);
  const latest = guideMetrics(metric).map((c) => health.metrics.find((m) => m.metric.code === c));
  useEffect(() => {
    if (param === 'checkin') document.getElementById('checkin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [param]);
  const label = (code) => shortLabel(metrics.find((m) => m.code === code)?.label ?? code);
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <div className="eyebrow">Log a reading for</div>
          <h1 className="title-large">{health.crew.name}</h1>
        </div>
        {replaying && <Pill tone="info">Replay mode · saving is off until you exit the demo</Pill>}
      </header>
      <Tabs label="Measurement" value={metric} onChange={setMetric} options={guides.map((g) => ({ value: g.metric, label: g.metric === 'BP_SYSTOLIC' ? 'Blood pressure' : label(g.metric) }))} />
      <div className="measure-grid">
        <GuideCard guide={guide} />
        <div className="measure-col">
          <GlassPanel className="panel">
            <header className="panel__head">
              <h2 className="panel__title">Record</h2>
              <div className="latest num footnote secondary">
                Last: {latest.map((m) => formatValue(m.metric, m.value)).join('/')} {latest[0].metric.unit}
                {latest[0].value !== undefined && <StatusBadge status={latest[0].status} />}
              </div>
            </header>
            <Tabs
              label="Method"
              block
              value={method}
              onChange={setMethod}
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'watch', label: 'Smart watch' },
                { value: 'photo', label: 'Photo' },
              ]}
            />
            <div className="method">
              {method === 'manual' && <ManualEntry key={guide.metric} guide={guide} disabled={replaying} />}
              {method === 'watch' && <WatchPanel health={health} disabled={replaying} />}
              {method === 'photo' && <PhotoPanel health={health} disabled={replaying} />}
            </div>
          </GlassPanel>
          <CheckInPanel key={health.crewId + (health.checkIn?.id ?? '')} health={health} disabled={replaying} onEmergency={onEmergency} />
          <Button variant="plain" icon="trends" onClick={() => navigate('trends', metric)}>
            See {guide.title.toLowerCase()} trend
          </Button>
        </div>
      </div>
    </div>
  );
}
