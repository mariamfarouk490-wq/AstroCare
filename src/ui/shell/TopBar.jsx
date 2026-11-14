import { useEffect, useRef, useState } from 'react';
import { useApp, useCrewStatuses, useHealth } from '../../state/store.js';
import { daysBetween } from '../../domain/utils/dates.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { Button, Est, Icon } from '../components/index.jsx';
import { formatDay, formatDuration, initials, isEstimate, ROLE_LABEL } from '../format.js';
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
        <span className="telemetry__value num">Day {daysBetween(mission.startDate, replayDay) + 1}</span>
      </div>
    );
  }
  const sec = Math.max(0, Math.floor((now - Date.parse(`${mission.startDate}T00:00:00Z`)) / 1000));
  const days = Math.floor(sec / 86400);
  const clock = `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
  // Same day number as the report and the alerts: mission day = full days elapsed + 1
  return (
    <div className="telemetry" title={`Mission elapsed time ${days} d ${clock} · mission day ${days + 1}`}>
      <span className="telemetry__label">MET</span>
      <span className="telemetry__value num">
        Day {days + 1}
        <span className="telemetry__clock"> · {clock}</span>
      </span>
    </div>
  );
}

const SHORT_PROFILE = { ISS: 'ISS', MOON: 'Moon', MARS_TRANSIT: 'Mars transit', MARS_SURFACE: 'Mars surface' };

function EarthLink() {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  const profile = activeProfile({ ...seed, settings });
  const roundTrip = earthRoundTripSec(profile);
  return (
    <div className="telemetry" title={`${profile.name}: one-way ${formatDuration(profile.oneWayDelaySec)} × 2`}>
      <span className="telemetry__label">
        <Icon name="signal" size={12} strokeWidth={2} /> <span className="telemetry__word">Earth link</span>
      </span>
      <span className="telemetry__value num">
        {roundTrip ? formatDuration(roundTrip) : 'live'}
        {roundTrip > 0 && <Est show={isEstimate(profile, 'oneWayDelaySec')} />}
      </span>
    </div>
  );
}

/** Mission environment (ISS, Moon, Mars transit, Mars surface): changes Earth delay, dose and bone loss everywhere. */
function ProfileSwitch() {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  const setSettings = useApp((s) => s.setSettings);
  const notify = useApp((s) => s.notify);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = settings.profileCode ?? seed.mission.profileCode;
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div className="profile-switch" ref={ref}>
      <button type="button" className="profile-switch__button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="telemetry__label">Environment</span>
        <span className="profile-switch__value">
          {SHORT_PROFILE[active] ?? active}
          <Icon name="chevronDown" size={12} strokeWidth={2.2} />
        </span>
      </button>
      {open && (
        <ul className="profile-switch__menu glass glass--solid" role="listbox" aria-label="Mission environment">
          {seed.missionProfiles.map((p) => (
            <li key={p.code}>
              <button
                type="button"
                role="option"
                aria-selected={p.code === active}
                className="profile-switch__option"
                onClick={() => {
                  setSettings({ profileCode: p.code });
                  setOpen(false);
                  notify(`Environment: ${p.name}`, 'ok');
                }}
              >
                <span>{p.name}</span>
                <span className="footnote tertiary num">
                  {p.oneWayDelaySec ? `reply ${formatDuration(earthRoundTripSec(p))}` : 'live link'}
                  {p.oneWayDelaySec > 0 && <Est show={isEstimate(p, 'oneWayDelaySec')} />} · {p.dailyDoseMSv} mSv/day
                  <Est show={isEstimate(p, 'dailyDoseMSv')} /> · {p.gravityG} g <Est show={isEstimate(p, 'gravityG')} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
    <header className="topbar liquid">
      <div className="topbar__brand">
        <MissionPatch />
        <div className="topbar__mission">
          <span className="topbar__name">AstroCare</span>
          <span className="topbar__meta">
            {mission.name} · {formatDay(day)}
          </span>
        </div>
      </div>
      <div className="topbar__telemetry">
        <MissionClock />
        <EarthLink />
        <ProfileSwitch />
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
