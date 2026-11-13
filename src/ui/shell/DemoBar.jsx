// Demo replay: scrub or play through the 10 seed days with the captions from demo-script.json.
import { useEffect } from 'react';
import { useApp } from '../../state/store.js';
import { Button, GlassPanel } from '../components/index.jsx';
import { formatShortDay } from '../format.js';
import { navigate } from './useRoute.js';

const STEP_MS = 4200;

/** Where the camera goes on a scripted day: the body part of the alerts that first fire that day. */
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
    const focus = focusFor(seed, exactStep);
    navigate('body', focus ?? undefined);
  }, [playing, exactStep, seed]);

  return (
    <div className="demobar" role="region" aria-label="Demo replay">
      <GlassPanel strong className="demobar__inner">
        <div className="demobar__controls">
          <Button
            variant="primary"
            icon={playing ? 'pause' : 'play'}
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              if (!playing && index >= days.length - 1) setViewDay(days[0]);
              setPlaying(!playing);
            }}
          />
          <div className="demobar__scrub">
            <div className="demobar__days">
              {days.map((d, i) => {
                const scripted = script.steps.some((s) => s.day === i + 1 && s.expectFirstAlerts);
                return (
                  <button
                    key={d}
                    type="button"
                    className="demobar__day num"
                    aria-current={i === index ? 'step' : undefined}
                    data-past={i < index || undefined}
                    data-event={scripted || undefined}
                    onClick={() => {
                      setPlaying(false);
                      setViewDay(d);
                    }}
                    title={formatShortDay(d)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <input
              className="demobar__range"
              type="range"
              min={0}
              max={days.length - 1}
              value={index}
              aria-label="Seed day"
              onChange={(e) => {
                setPlaying(false);
                setViewDay(days[Number(e.target.value)]);
              }}
            />
          </div>
        </div>
        <div className="demobar__caption" key={step?.day}>
          <span className="eyebrow">
            {subject.name} · Day {dayNumber} of {days.length}
          </span>
          <p>{step?.say}</p>
        </div>
        <div className="demobar__end">
          {dayNumber === days.length && (
            <Button variant="danger" size="sm" icon="emergency" onClick={onEmergency}>
              Emergency mode
            </Button>
          )}
          <Button icon="close" aria-label="Exit demo" onClick={closeDemo} />
        </div>
      </GlassPanel>
      <span className="visually-hidden" aria-live="polite">
        Day {dayNumber}: {step?.say}
      </span>
    </div>
  );
}
