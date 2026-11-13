import { useState } from 'react';
import { useApp } from '../../state/store.js';
import { Button, GlassPanel, Icon, Modal, Panel, Pill, RefList, SegmentedControl, Stat } from '../components/index.jsx';
import { DOMAIN_LABEL, formatDuration } from '../format.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';

const SECTIONS = [
  { value: 'challenge', label: 'Challenge' },
  { value: 'hazards', label: 'RIDGE hazards' },
  { value: 'risks', label: 'NASA risks' },
  { value: 'research', label: 'HRP research' },
  { value: 'missions', label: 'Missions' },
  { value: 'sources', label: 'Sources' },
];

const coverageTone = (c) => (c.startsWith('covered') ? 'Normal' : c.startsWith('partial') ? 'info' : 'neutral');

function Challenge() {
  const seed = useApp((s) => s.seed);
  const { impact, challengeObjectives } = seed;
  return (
    <div className="about-stack">
      <GlassPanel className="panel about-hero">
        <div className="eyebrow">The problem</div>
        <p className="about-hero__text">{impact.problem}</p>
        <p className="secondary">{impact.spaceExploration}</p>
        <RefList refs={impact.refs} />
      </GlassPanel>
      <Panel title="How AstroCare covers the challenge">
        <div className="list">
          {challengeObjectives.map((o) => (
            <div className="list__row objective" key={o.code}>
              <div>
                <div>{o.objective}</div>
                <div className="footnote tertiary">{o.feature}</div>
              </div>
              <code className="footnote tertiary">{o.dataFiles.join(' · ')}</code>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Who it helps">
        <div className="card-grid">
          {impact.beneficiaries.map((b) => (
            <GlassPanel flat key={b.group} className="panel mini-card">
              <h3 className="title-3">{b.group}</h3>
              <p className="secondary footnote">{b.how}</p>
              <RefList refs={b.refs} />
            </GlassPanel>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Hazards() {
  const hazards = useApp((s) => s.seed.hazards);
  return (
    <div className="card-grid card-grid--wide">
      {hazards.map((h) => (
        <GlassPanel key={h.code} className="panel hazard">
          <div className="hazard__head">
            <span className="hazard__letter">{h.code}</span>
            <div>
              <h2 className="title-3">{h.name}</h2>
              <span className="footnote tertiary">{h.domains.map((d) => DOMAIN_LABEL[d]).join(' · ')}</span>
            </div>
          </div>
          <div className="hazard__cols">
            <div>
              <h3 className="eyebrow">Effects</h3>
              <ul className="bullets">
                {h.effects.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow">Countermeasures</h3>
              <ul className="bullets">
                {h.countermeasures.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="footnote">
            <span className="tertiary">In the app: </span>
            {h.appCoverage}
          </p>
          <RefList refs={h.refs} />
        </GlassPanel>
      ))}
    </div>
  );
}

function Risks() {
  const risks = useApp((s) => s.seed.nasaRisks);
  const [filter, setFilter] = useState('all');
  const shown = risks.filter((r) => filter === 'all' || r.appCoverage.startsWith(filter));
  const count = (k) => risks.filter((r) => r.appCoverage.startsWith(k)).length;
  return (
    <Panel
      title={`${risks.length} NASA Human System Risks`}
      aside={
        <SegmentedControl
          label="Coverage"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'covered', label: `Covered ${count('covered')}` },
            { value: 'partial', label: `Partial ${count('partial')}` },
            { value: 'not-covered', label: `Not yet ${count('not-covered')}` },
          ]}
        />
      }
    >
      <div className="list">
        {shown.map((r) => (
          <div className="list__row" key={r.code}>
            <div>
              <a href={r.refs[0]?.url} target="_blank" rel="noreferrer">
                {r.name}
              </a>
              <div className="footnote tertiary">
                {DOMAIN_LABEL[r.domain]} · hazard {r.hazard}
              </div>
            </div>
            <Pill tone={coverageTone(r.appCoverage)}>{r.appCoverage}</Pill>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Research() {
  const studies = useApp((s) => s.seed.hrpResearch);
  const groups = [...new Set(studies.map((s) => s.group))];
  return (
    <div className="about-stack">
      {groups.map((g) => (
        <Panel key={g} title={g}>
          <div className="list">
            {studies
              .filter((s) => s.group === g)
              .map((s) => (
                <div className="list__row" key={s.name}>
                  <div>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                    <div className="footnote secondary">{s.measures}</div>
                  </div>
                  <span className="footnote tertiary research-link">{s.appLink}</span>
                </div>
              ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Missions() {
  const seed = useApp((s) => s.seed);
  const settings = useApp((s) => s.user.settings);
  const setSettings = useApp((s) => s.setSettings);
  const active = settings.profileCode ?? seed.mission.profileCode;
  return (
    <div className="card-grid">
      {seed.missionProfiles.map((p) => (
        <GlassPanel key={p.code} className={`panel mission${p.code === active ? ' is-active' : ''}`}>
          <header className="mission__head">
            <h2 className="title-3">{p.name}</h2>
            {p.code === active ? <Pill tone="info">Active</Pill> : <Button size="sm" onClick={() => setSettings({ profileCode: p.code })}>Use</Button>}
          </header>
          <div className="mission__stats">
            <Stat label="Earth reply" value={p.oneWayDelaySec ? formatDuration(earthRoundTripSec(p)) : 'Live'} size="sm" />
            <Stat label="Daily dose" value={p.dailyDoseMSv} unit="mSv" size="sm" />
            <Stat label="Gravity" value={p.gravityG} unit="g" size="sm" />
            <Stat label="Bone loss" value={p.boneLossPctPerMonth ? `${p.boneLossPctPerMonth.min}–${p.boneLossPctPerMonth.max}` : '–'} unit={p.boneLossPctPerMonth ? '%/mo' : undefined} size="sm" />
          </div>
          <ul className="bullets footnote secondary">
            {p.notes?.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <RefList refs={p.refs} />
        </GlassPanel>
      ))}
    </div>
  );
}

function Sources() {
  const sources = useApp((s) => s.seed.sources);
  const publishers = [...new Set(sources.map((s) => s.publisher))];
  return (
    <div className="card-grid card-grid--wide">
      {publishers.map((p) => (
        <Panel key={p} title={p} aside={<span className="footnote tertiary num">{sources.filter((s) => s.publisher === p).length}</span>}>
          <ul className="source-list">
            {sources
              .filter((s) => s.publisher === p)
              .map((s) => (
                <li key={s.key}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                    <Icon name="link" size={12} strokeWidth={2} />
                  </a>
                </li>
              ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

export default function AboutScreen() {
  const [section, setSection] = useState('challenge');
  const [confirmReset, setConfirmReset] = useState(false);
  const resetDemo = useApp((s) => s.resetDemo);
  const notify = useApp((s) => s.notify);
  const mission = useApp((s) => s.seed.mission);
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <div className="eyebrow">About · {mission.name}</div>
          <h1 className="title-large">Built on NASA science</h1>
          <p className="secondary footnote" style={{ marginTop: 8 }}>
            Every number in AstroCare comes from the files in src/data, each with its source. All analysis runs on the device, with no network.
          </p>
        </div>
        <Button size="sm" icon="refresh" onClick={() => setConfirmReset(true)}>
          Reset demo data
        </Button>
      </header>
      <div className="scroll-x">
        <SegmentedControl label="Section" options={SECTIONS} value={section} onChange={setSection} />
      </div>
      {section === 'challenge' && <Challenge />}
      {section === 'hazards' && <Hazards />}
      {section === 'risks' && <Risks />}
      {section === 'research' && <Research />}
      {section === 'missions' && <Missions />}
      {section === 'sources' && <Sources />}
      {confirmReset && (
        <Modal title="Reset demo data?" onClose={() => setConfirmReset(false)}>
          <p className="secondary">This removes every reading, check-in, acknowledgement and emergency log saved on this device. The seed data stays.</p>
          <div className="row-gap" style={{ marginTop: 24 }}>
            <Button block onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              block
              variant="danger"
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
                notify('Demo data reset', 'ok');
              }}
            >
              Reset
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
