import { useApp, useCrewStatuses } from '../../state/store.js';
import { daysBetween } from '../../domain/utils/dates.js';
import { Button, GlassPanel } from '../components/index.jsx';
import { formatDay, initials, ROLE_LABEL } from '../format.js';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <linearGradient id="logo-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#a1a1a6" />
          <stop offset="1" stopColor="#f5f5f7" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="12.25" fill="none" stroke="url(#logo-silver)" strokeWidth="1.5" />
      <ellipse cx="14" cy="14" rx="12.25" ry="4.5" fill="none" stroke="url(#logo-silver)" strokeWidth="1" opacity="0.6" transform="rotate(-24 14 14)" />
      <circle cx="14" cy="14" r="4" fill="url(#logo-silver)" />
    </svg>
  );
}

const DOT = { Normal: 'var(--green)', Watch: 'var(--red)', Critical: 'var(--red)', NoData: 'var(--text-3)' };

function CrewPicker() {
  const crew = useApp((s) => s.seed.crew);
  const selectedId = useApp((s) => s.user.selectedCrewId);
  const selectCrew = useApp((s) => s.selectCrew);
  const statuses = useCrewStatuses();
  return (
    <div className="crew-picker" role="radiogroup" aria-label="Crew member">
      {crew.map((c) => {
        const active = c.id === selectedId;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={active} className="crew-chip" onClick={() => selectCrew(c.id)} title={`${c.name}, ${ROLE_LABEL[c.role]}`}>
            <span className="crew-chip__avatar">
              {initials(c.name)}
              <span className={`crew-chip__dot crew-chip__dot--${statuses[c.id]}`} style={{ background: DOT[statuses[c.id]] }} />
            </span>
            <span className="crew-chip__name">{c.name.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function TopBar({ onEmergency }) {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  const replaying = useApp((s) => s.viewDay !== null);
  const demoOpen = useApp((s) => s.demo.open);
  const openDemo = useApp((s) => s.openDemo);
  const closeDemo = useApp((s) => s.closeDemo);
  const profile = seed.missionProfiles.find((p) => p.code === (settings.profileCode ?? seed.mission.profileCode));
  const missionDay = daysBetween(seed.mission.startDate, day) + 1;
  return (
    <header className="topbar">
      <GlassPanel flat className="topbar__inner">
        <div className="topbar__brand">
          <Logo />
          <div className="topbar__mission">
            <span className="topbar__name">AstroCare</span>
            <span className="topbar__meta num">
              Day {missionDay} · {profile.name} · {formatDay(day)}
              {replaying && <span className="topbar__replay">Replay</span>}
            </span>
          </div>
        </div>
        <CrewPicker />
        <div className="topbar__actions">
          <Button size="sm" icon={demoOpen ? 'close' : 'play'} onClick={() => (demoOpen ? closeDemo() : openDemo(false))}>
            {demoOpen ? 'Exit demo' : 'Demo'}
          </Button>
          <Button size="sm" variant="danger" icon="emergency" onClick={onEmergency}>
            Emergency
          </Button>
        </div>
      </GlassPanel>
    </header>
  );
}
