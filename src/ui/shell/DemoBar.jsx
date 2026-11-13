// Mission timeline for the demo replay: day 1–10 track with ticks, scripted event markers,
// captions from demo-script.json, play/pause and ?play autoplay.
import { useEffect } from 'react';
import { useApp } from '../../state/store.js';
import { Button } from '../components/index.jsx';
import { formatShortDay } from '../format.js';
import { navigate } from './useRoute.js';

const STEP_MS = 4200;

/** Body part of the alerts that first fire on a scripted day (the camera goes there). */
function focusFor(seed, step) {
  const first = step?.expectFirstAlerts?.[0];
  if (!first) return null;
  const rule = seed.rules.find((r) => r.code === first);
  return seed.bodyParts.find((b) => b.domain === rule?.domain)?.id ?? null;
}

export default function DemoBar({ onEmergency }) {
  const seed = useApp((s) => s.seed);
  const days = useApp((s) => s.days);
  const viewDay = useApp((s) => s.viewDay ?? s.liveDay);
  const playing = useApp((s) => s.demo.playing);
  const setViewDay = useApp((s) => s.setViewDay);
  const setPlaying = useApp((s) => s.setDemoPlaying);
  const closeDemo = useApp((s) => s.closeDemo);
  const selectCrew = useApp((s) => s.selectCrew);
  const selectedCrewId = useApp((s) => s.user.selectedCrewId);
  const script = seed.demoScript;
  const index = Math.max(0, days.indexOf(viewDay));
  const dayNumber = index + 1;
  const step = [...script.steps].reverse().find((s) => s.day <= dayNumber);
  const exactStep = script.steps.find((s) => s.day === dayNumber);
  const subject = seed.crew.find((c) => c.id === script.subject);
  const progress = days.length > 1 ? index / (days.length - 1) : 0;

  useEffect(() => {
    if (selectedCrewId !== script.subject) selectCrew(script.subject);
    // only when the demo opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= days.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = setTimeout(() => setViewDay(days[index + 1]), exactStep ? STEP_MS * 1.6 : STEP_MS * 0.6);
    return () => clearTimeout(id);
  }, [playing, index, days, exactStep, setViewDay, setPlaying]);

  useEffect(() => {
    if (!playing) return;
    navigate('body', focusFor(seed, exactStep) ?? undefined);
  }, [playing, exactStep, seed]);

  const go = (i) => {
    setPlaying(false);
    setViewDay(days[i]);
  };

  return (
    <section className="timeline liquid" aria-label="Mission timeline">
      <Button
        variant="primary"
        icon={playing ? 'pause' : 'play'}
        aria-label={playing ? 'Pause' : 'Play'}
        className="timeline__play"
        onClick={() => {
          if (!playing && index >= days.length - 1) setViewDay(days[0]);
          setPlaying(!playing);
        }}
      />
      <div className="timeline__track">
        <div className="timeline__rail">
          <span className="timeline__progress" style={{ width: `${progress * 100}%` }} />
          {days.map((d, i) => {
            const event = script.steps.some((s) => s.day === i + 1 && s.expectFirstAlerts);
            return (
              <button
                key={d}
                type="button"
                className="timeline__day"
                style={{ left: `${(i / (days.length - 1)) * 100}%` }}
                aria-current={i === index ? 'step' : undefined}
                data-past={i < index || undefined}
                data-event={event || undefined}
                onClick={() => go(i)}
                title={formatShortDay(d)}
              >
                <span className="timeline__tick" />
                <span className="timeline__label num">{i + 1}</span>
              </button>
            );
          })}
        </div>
        <input className="visually-hidden" type="range" min={0} max={days.length - 1} value={index} aria-label="Mission day" onChange={(e) => go(Number(e.target.value))} />
      </div>
      <div className="timeline__caption" key={step?.day}>
        <span className="eyebrow">
          {subject.name} · day {dayNumber}/{days.length}
        </span>
        <p>{step?.say}</p>
      </div>
      <div className="timeline__end">
        {dayNumber === days.length && (
          <Button variant="danger" size="sm" icon="emergency" onClick={onEmergency}>
            Emergency mode
          </Button>
        )}
        <Button icon="close" aria-label="Exit demo" onClick={closeDemo} />
      </div>
      <span className="visually-hidden" aria-live="polite">
        Day {dayNumber}: {step?.say}
      </span>
    </section>
  );
}
