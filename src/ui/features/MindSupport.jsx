// Mind support: 1-minute paced breathing, NASA-sourced actions, and a request for a private
// psychological conference with ground. Shown on Alerts, in the Mind & sleep sheet, and after a
// low-mood / high-stress check-in. Data: src/data/mind-support.json.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/store.js';
import { getMindSupport } from '../../application/usecases/getMindSupport.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { DISCLAIMER } from '../../domain/disclaimer.js';
import { Button, GlassPanel, Icon, RefList } from '../components/index.jsx';
import { formatDuration, formatTime } from '../format.js';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Glass circle: grows while you breathe in, shrinks while you breathe out. Text and countdown always shown. */
function Breathing({ spec }) {
  const [running, setRunning] = useState(false);
  const [view, setView] = useState({ phase: 'in', left: spec.durationSec, phaseLeft: spec.inhaleSec });
  const start = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    start.current = performance.now();
    const cycle = spec.inhaleSec + spec.exhaleSec;
    const id = setInterval(() => {
      const t = (performance.now() - start.current) / 1000;
      if (t >= spec.durationSec) {
        setRunning(false);
        setView({ phase: 'done', left: 0, phaseLeft: 0 });
        return;
      }
      const inCycle = t % cycle;
      const inhale = inCycle < spec.inhaleSec;
      setView({
        phase: inhale ? 'in' : 'out',
        left: Math.ceil(spec.durationSec - t),
        phaseLeft: Math.ceil(inhale ? spec.inhaleSec - inCycle : cycle - inCycle),
      });
    }, 200);
    return () => clearInterval(id);
  }, [running, spec]);

  const label = !running ? (view.phase === 'done' ? 'Well done' : 'Ready') : view.phase === 'in' ? 'Breathe in' : 'Breathe out';
  const scale = !running || reduced() ? 1 : view.phase === 'in' ? 1.35 : 0.8;
  const dur = view.phase === 'in' ? spec.inhaleSec : spec.exhaleSec;
  return (
    <div className="breathing">
      <div className="breathing__stage" aria-hidden="true">
        <span className="breathing__circle" style={{ transform: `scale(${scale})`, transitionDuration: `${running ? dur : 0.6}s` }} />
      </div>
      <div className="breathing__info">
        <div className="eyebrow">
          {spec.name} · in {spec.inhaleSec} s, out {spec.exhaleSec} s
        </div>
        <p className="breathing__label" aria-live="polite">
          {label}
          {running && <span className="num tertiary"> {view.phaseLeft}</span>}
        </p>
        <p className="footnote secondary num">{running ? `${view.left} s left` : `${spec.durationSec / 60 >= 1 ? `${spec.durationSec / 60} min` : `${spec.durationSec} s`} guided, no sound`}</p>
        <Button
          size="sm"
          variant={running ? undefined : 'primary'}
          icon={running ? 'pause' : 'play'}
          onClick={() => {
            if (running) {
              setRunning(false);
              setView({ phase: 'in', left: spec.durationSec, phaseLeft: spec.inhaleSec });
            } else setRunning(true);
          }}
        >
          {running ? 'Stop' : 'Start 1-minute breathing'}
        </Button>
        <p className="footnote tertiary">{spec.note}</p>
        <RefList refs={spec.refs} />
      </div>
    </div>
  );
}

/**
 * @param {{ health: object, force?: boolean }} props  force: show even with no trigger (Mind & sleep sheet)
 */
export default function MindSupport({ health, force = false }) {
  const seed = useApp((s) => s.seed);
  const user = useApp((s) => s.user);
  const request = useApp((s) => s.requestGroundSupport);
  const notify = useApp((s) => s.notify);
  const data = seed.mindSupport;
  const ms = getMindSupport(data, health.alerts, health.checkIn);
  if (!ms.show && !force) return null;
  const crewId = health.crew.id;
  const profile = activeProfile({ ...seed, settings: user.settings });
  const roundTrip = earthRoundTripSec(profile);
  const last = user.supportRequests.filter((r) => r.crewId === crewId).at(-1);

  return (
    <GlassPanel className={`panel mind${ms.level === 'urgent' ? ' mind--urgent' : ''}`} aria-label="Mind support">
      <header className="panel__head">
        <div>
          <div className="eyebrow">Behavioural health</div>
          <h2 className="title-2">{data.title}</h2>
        </div>
        {ms.reasons.length > 0 && <span className="footnote tertiary num">{ms.reasons.join(' · ')}</span>}
      </header>

      {ms.level === 'urgent' && (
        <div className="mind__urgent" role="alert">
          <Icon name="emergency" size={16} />
          <span>{data.escalation.message}</span>
        </div>
      )}

      <Breathing spec={data.breathing} />

      <div className="mind__section">
        <h3 className="eyebrow">What helps (NASA countermeasures)</h3>
        <ul className="mind__actions">
          {data.actions.map((a) => (
            <li key={a.code}>
              <p>{a.text}</p>
              <RefList refs={a.refs} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mind__request">
        {last ? (
          <p className="footnote secondary" role="status">
            <Icon name="check" size={14} /> Private conference requested at {formatTime(last.at)}.{' '}
            {roundTrip ? `Earliest reply ~${formatDuration(roundTrip)} after the request.` : 'Live link: reply in seconds.'} It is listed in the report for Earth.
          </p>
        ) : (
          <p className="footnote secondary">The request is added to the report for Earth. {roundTrip ? `Earliest reply ~${formatDuration(roundTrip)} (round trip).` : ''}</p>
        )}
        <Button
          variant={ms.level === 'urgent' ? 'danger' : undefined}
          icon="signal"
          onClick={() => {
            request(ms.reasons);
            notify('Private conference requested', 'ok');
          }}
        >
          {last ? 'Request again' : 'Request private conference with ground'}
        </Button>
      </div>

      <p className="footnote secondary disclaimer">{DISCLAIMER}</p>
    </GlassPanel>
  );
}
