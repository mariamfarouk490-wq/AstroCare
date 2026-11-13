import { useEffect, useState } from 'react';
import { useApp, useCrewStatuses, useHealth } from '../../state/store.js';
import { daysBetween } from '../../domain/utils/dates.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { Button, Icon } from '../components/index.jsx';
import { formatDay, formatDuration, initials, ROLE_LABEL } from '../format.js';
import MissionPatch from './MissionPatch.jsx';
import { navigate } from './useRoute.js';

const pad = (n) => String(n).padStart(2, '0');

/** Mission elapsed time DD:HH:MM:SS since mission.startDate (live), or the replay day. */
function MissionClock() {
  const mission = useApp((s) => s.seed.mission);
  const replayDay = useApp((s) => s.viewDay);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (replayDay) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [replayDay]);
  if (replayDay) {
    return (
      <div className="telemetry">
        <span className="telemetry__label">Replay</span>
        <span className="telemetry__value num">DAY {pad(daysBetween(mission.startDate, replayDay) + 1)}</span>
      </div>
    );
  }
  const sec = Math.max(0, Math.floor((now - Date.parse(`${mission.startDate}T00:00:00Z`)) / 1000));
  const met = `${pad(Math.floor(sec / 86400))}:${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
  return (
    <div className="telemetry" title="Mission elapsed time (days:hours:minutes:seconds)">
      <span className="telemetry__label">MET</span>
      <span className="telemetry__value num">{met}</span>
    </div>
  );
}

function EarthLink() {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  const profile = activeProfile({ ...seed, settings });
  const roundTrip = earthRoundTripSec(profile);
  return (
    <div className="telemetry" title={`${profile.name}: one-way ${formatDuration(profile.oneWayDelaySec)} × 2`}>
      <span className="telemetry__label">
        <Icon name="signal" size={12} strokeWidth={2} /> Earth link
      </span>
      <span className="telemetry__value num">{roundTrip ? formatDuration(roundTrip).toUpperCase() : 'LIVE'}</span>
    </div>
  );
}

function CrewPicker() {
  const crew = useApp((s) => s.seed.crew);
  const selectedId = useApp((s) => s.user.selectedCrewId);
  const selectCrew = useApp((s) => s.selectCrew);
  const statuses = useCrewStatuses();
  return (
    <div className="crew-picker" role="radiogroup" aria-label="Crew member">
      {crew.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === selectedId}
          className="crew-chip"
          onClick={() => selectCrew(c.id)}
          title={`${c.name}, ${ROLE_LABEL[c.role]}`}
        >
          <span className="crew-chip__avatar num">
            {initials(c.name)}
            <span className={`crew-chip__dot crew-chip__dot--${statuses[c.id]}`} />
          </span>
          <span className="crew-chip__name">{c.name.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  );
}

export default function TopBar({ onEmergency }) {
  const mission = useApp((s) => s.seed.mission);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  const demoOpen = useApp((s) => s.demo.open);
  const openDemo = useApp((s) => s.openDemo);
  const closeDemo = useApp((s) => s.closeDemo);
  const health = useHealth();
  const open = health.alerts.filter((a) => !a.acknowledgedAt).length;
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <MissionPatch />
        <div className="topbar__mission">
          <span className="topbar__name">AstroCare</span>
          <span className="topbar__meta num">
            {mission.name} · {formatDay(day).toUpperCase()}
          </span>
        </div>
      </div>
      <div className="topbar__telemetry">
        <MissionClock />
        <EarthLink />
      </div>
      <div className="topbar__actions">
        <CrewPicker />
        <button type="button" className={`alert-count${open ? ' is-active' : ''}`} onClick={() => navigate('alerts')} aria-label={`${open} open alerts`}>
          <Icon name="alerts" size={16} />
          <span className="num">{open}</span>
        </button>
        <Button size="sm" icon={demoOpen ? 'close' : 'play'} onClick={() => (demoOpen ? closeDemo() : openDemo(false))}>
          {demoOpen ? 'Exit demo' : 'Demo'}
        </Button>
        <Button size="sm" variant="danger" icon="emergency" onClick={onEmergency}>
          Emergency
        </Button>
      </div>
    </header>
  );
}
