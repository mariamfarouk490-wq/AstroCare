// Emergency mode: full-screen, red-accented, no 3D. Runs protocols.json as a state machine,
// logs every step through the use cases, and shows the Earth round-trip delay.
import { useEffect, useRef, useState } from 'react';
import { useApp, useHealth } from '../../state/store.js';
import { currentStep, earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { Button, GlassPanel, Icon, Panel, RefList, Stat, StatusBadge } from '../components/index.jsx';
import { formatClock, formatDuration, formatTime, formatValue, initials, ROLE_LABEL } from '../format.js';

const OUTCOMES = [
  { value: 'Stabilized', label: 'Stabilized' },
  { value: 'HandedToEarth', label: 'Handed to Earth' },
  { value: 'Ongoing', label: 'Ongoing' },
];

function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Audible metronome at `rate` beats per minute (WebAudio click). */
function useMetronome(rate, on) {
  const audio = useRef(null);
  useEffect(() => {
    if (!on) return undefined;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;
    audio.current ??= new Ctx();
    const ctx = audio.current;
    ctx.resume?.();
    const click = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1100;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    };
    click();
    const id = setInterval(click, 60000 / rate);
    return () => clearInterval(id);
  }, [rate, on]);
}

function CprTimer({ step }) {
  const [startedAt] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const now = useNow(100);
  useMetronome(step.cprRate, sound);
  const elapsed = (now - startedAt) / 1000;
  const compressions = Math.floor((elapsed * step.cprRate) / 60);
  return (
    <div className="cpr">
      <div className="cpr__ring" style={{ '--beat': `${60 / step.cprRate}s` }}>
        <span className="cpr__pulse" />
        <div className="cpr__center">
          <span className="cpr__count num">{compressions}</span>
          <span className="footnote secondary">compressions</span>
        </div>
      </div>
      <div className="cpr__meta">
        <Stat label="Rate" value={step.cprRate} unit="/min" size="sm" />
        <Stat label="Elapsed" value={formatClock(elapsed)} size="sm" />
        <Button size="sm" onClick={() => setSound(!sound)}>
          {sound ? 'Mute metronome' : 'Metronome on'}
        </Button>
      </div>
    </div>
  );
}

function QuickVitals({ sessionId, patientId }) {
  const metrics = useApp((s) => s.seed.metrics);
  const addMeasurement = useApp((s) => s.addMeasurement);
  const notify = useApp((s) => s.notify);
  const codes = ['HEART_RATE', 'SPO2', 'BP_SYSTOLIC', 'BP_DIASTOLIC'];
  const [v, setV] = useState({});
  const [error, setError] = useState(null);
  const save = () => {
    const readings = codes.filter((c) => v[c] !== undefined && v[c] !== '').map((c) => ({ metric: c, value: Number(v[c]) }));
    const r = addMeasurement({ crewId: patientId, readings, source: 'manual', emergencySessionId: sessionId });
    if (!r.ok) return setError(r.error);
    setError(null);
    setV({});
    notify('Vitals logged', 'ok');
  };
  return (
    <div className="quick-vitals">
      {codes.map((c) => {
        const m = metrics.find((x) => x.code === c);
        return (
          <label className="field" key={c}>
            <span className="field__label">{m.label}</span>
            <div className="input-unit">
              <input className="input" type="number" inputMode="decimal" value={v[c] ?? ''} onChange={(e) => setV({ ...v, [c]: e.target.value })} />
              <span className="input-unit__unit">{m.unit}</span>
            </div>
          </label>
        );
      })}
      {error && <p className="field__error">{error}</p>}
      <Button onClick={save} disabled={!codes.some((c) => v[c])}>
        Log vitals
      </Button>
    </div>
  );
}

function Launcher({ initialProtocol, onClose }) {
  const seed = useApp((s) => s.seed);
  const selected = useApp((s) => s.user.selectedCrewId);
  const start = useApp((s) => s.startEmergency);
  const [patient, setPatient] = useState(selected);
  return (
    <div className="emergency__launcher">
      <div className="emergency__intro">
        <div className="eyebrow emergency__eyebrow">Emergency mode</div>
        <h1 className="title-large">Who needs help?</h1>
      </div>
      <div className="emergency__patients" role="radiogroup" aria-label="Patient">
        {seed.crew.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={patient === c.id} className="patient" onClick={() => setPatient(c.id)}>
            <span className="patient__avatar">{initials(c.name)}</span>
            <span>
              <span className="patient__name">{c.name}</span>
              <span className="footnote tertiary">{ROLE_LABEL[c.role]}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="emergency__protocols">
        {seed.protocols.map((p) => (
          <GlassPanel
            as="button"
            type="button"
            key={p.code}
            interactive
            className={`panel protocol-card${p.code === initialProtocol ? ' is-suggested' : ''}`}
            onClick={() => start(p.code, patient)}
          >
            <Icon name={p.code === 'CHEST_PAIN' ? 'heart' : 'person'} size={28} />
            <span className="title-2">{p.title}</span>
            <span className="footnote secondary">{p.steps.length} steps · starts with “{p.steps[0].text.split('.')[0]}”</span>
            <span className="protocol-card__go">
              Start <Icon name="chevronRight" size={16} />
            </span>
          </GlassPanel>
        ))}
      </div>
      <Button onClick={onClose}>Cancel</Button>
    </div>
  );
}

function Running({ onClose }) {
  const seed = useApp((s) => s.seed);
  const user = useApp((s) => s.user);
  const emergency = useApp((s) => s.emergency);
  const answer = useApp((s) => s.emergencyAnswer);
  const end = useApp((s) => s.endEmergency);
  const closeEmergency = useApp((s) => s.closeEmergency);
  const notify = useApp((s) => s.notify);
  const close = () => {
    closeEmergency();
    onClose();
  };
  const now = useNow();
  const session = user.emergencySessions.find((s) => s.id === emergency.sessionId);
  const patient = seed.crew.find((c) => c.id === session.patientId);
  const health = useHealth(session.patientId);
  const { protocol, step } = currentStep(seed.protocols, emergency.machine);
  const profile = activeProfile({ ...seed, settings: user.settings });
  const roundTrip = earthRoundTripSec(profile);
  const started = Date.parse(session.startedAt);
  const elapsed = (now - started) / 1000;
  const replyIn = Math.max(0, roundTrip - elapsed);
  const vitals = health.metrics.filter((m) => ['HEART_RATE', 'SPO2', 'BP_SYSTOLIC'].includes(m.metric.code));
  return (
    <div className="emergency__run">
      <header className="emergency__bar">
        <div className="emergency__title">
          <span className="emergency__live" />
          <div>
            <div className="eyebrow emergency__eyebrow">Emergency · {protocol.title}</div>
            <div className="title-3">
              {patient.name} <span className="tertiary">· {ROLE_LABEL[patient.role]}</span>
            </div>
          </div>
        </div>
        <Stat label="Elapsed" value={formatClock(elapsed)} size="sm" />
        <Button icon="close" aria-label="Close emergency mode" onClick={close} />
      </header>

      <div className="emergency__grid">
        <GlassPanel strong xl className="panel step-card" key={`${emergency.machine.protocol}:${step.code}`}>
          <div className="eyebrow">
            Step {protocol.steps.findIndex((s) => s.code === step.code) + 1} of {protocol.steps.length} · {step.type.replace('-', ' ')}
          </div>
          <p className="step-card__text">{step.text}</p>

          {step.type === 'question' && (
            <div className="step-card__options">
              {step.options.map((o) => (
                <Button key={o.label} size="lg" variant={o.next.includes(':') ? 'danger' : undefined} onClick={() => answer(o.label)}>
                  {o.label}
                </Button>
              ))}
            </div>
          )}
          {step.type === 'cpr-timer' && <CprTimer step={step} />}
          {step.type === 'measure' && <QuickVitals sessionId={session.id} patientId={session.patientId} />}
          {step.type === 'end' ? (
            <div className="step-card__options">
              {OUTCOMES.map((o) => (
                <Button key={o.value} size="lg" variant={o.value === 'Stabilized' ? 'primary' : undefined} onClick={() => {
                    end(o.value);
                    notify(`Emergency logged · ${o.label}`, 'ok');
                    onClose();
                  }}>
                  {o.label}
                </Button>
              ))}
            </div>
          ) : (
            step.type !== 'question' && (
              <Button size="lg" variant="primary" onClick={() => answer()}>
                Done · next step <Icon name="chevronRight" size={18} />
              </Button>
            )
          )}
          <RefList refs={protocol.sources} />
        </GlassPanel>

        <div className="emergency__side">
          <Panel title="Earth link" className="earth">
            <div className="earth__row">
              <Stat label="Round trip" value={roundTrip ? formatDuration(roundTrip) : 'Live'} size="md" sub={`${profile.name} · one-way ${formatDuration(profile.oneWayDelaySec)} × 2`} />
            </div>
            {roundTrip > 0 && (
              <>
                <div className="meter">
                  <span className="meter__fill" style={{ width: `${Math.min(100, (elapsed / roundTrip) * 100)}%`, background: 'var(--text-1)' }} />
                </div>
                <p className="footnote secondary num">
                  {replyIn > 0 ? `Earliest reply from the flight surgeon in ${formatClock(replyIn)}` : 'A reply from Earth can arrive now'}
                  {' · '}sent {formatTime(session.startedAt)}
                </p>
              </>
            )}
            <p className="footnote tertiary">Act now. Do not wait for Earth.</p>
          </Panel>

          <Panel title="Patient">
            <div className="list">
              {vitals.map((m) => (
                <div className="list__row" key={m.metric.code}>
                  <span>{m.metric.label}</span>
                  <span className="list__end">
                    <span className="num list__value">
                      {formatValue(m.metric, m.value)} <span className="footnote tertiary">{m.metric.unit}</span>
                    </span>
                    <StatusBadge status={m.status} />
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Event log" aside={<span className="footnote tertiary num">{session.log.length}</span>}>
            <ol className="event-log">
              {[...session.log].reverse().map((e, i) => (
                <li key={i}>
                  <span className="num tertiary">{formatTime(e.at)}</span>
                  <span>
                    <code>{e.step}</code>
                    {e.answer && <span className="secondary"> · {e.answer}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyScreen({ initialProtocol, onClose }) {
  const running = useApp((s) => s.emergency);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !running && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, onClose]);
  return (
    <div className="emergency" role="dialog" aria-modal="true" aria-label="Emergency mode">
      <div className="emergency__glow" aria-hidden="true" />
      {running ? <Running onClose={onClose} /> : <Launcher initialProtocol={initialProtocol} onClose={onClose} />}
    </div>
  );
}
