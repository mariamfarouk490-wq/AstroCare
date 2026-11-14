import { useState } from 'react';
import { useApp, useHealth } from '../../state/store.js';
import AlertCard from '../features/AlertCard.jsx';
import EarthReportButton from '../features/EarthReport.jsx';
import { EmptyState, GlassPanel, Tabs } from '../components/index.jsx';

export default function AlertsScreen({ onEmergency }) {
  const health = useHealth();
  const ruleCount = useApp((s) => s.seed.rules.length);
  const [filter, setFilter] = useState('open');
  const open = health.alerts.filter((a) => !a.acknowledgedAt);
  const acknowledged = health.alerts.filter((a) => a.acknowledgedAt);
  const list = (filter === 'open' ? open : acknowledged).slice().sort((a, b) => b.seedDay - a.seedDay || (a.severity === 'Critical' ? -1 : 1));
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <div>
          <div className="eyebrow">Alerts · {health.crew.name}</div>
          <h1 className="title-large">{open.length ? `${open.length} need${open.length === 1 ? 's' : ''} attention` : 'All clear'}</h1>
          <p className="secondary footnote lede">
            {ruleCount} rules from rules.json run on-device every day. An alert stays open once it fires; acknowledging it marks it as seen.
          </p>
        </div>
        <div className="row-gap alerts-head-actions">
          <EarthReportButton crewId={health.crewId} />
          <Tabs
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open', label: `Open ${open.length}` },
              { value: 'ack', label: `Acknowledged ${acknowledged.length}` },
            ]}
          />
        </div>
      </header>
      {list.length ? (
        <div className="alerts-list">
          {list.map((a) => (
            <AlertCard key={a.code} alert={a} onEmergency={onEmergency} />
          ))}
        </div>
      ) : (
        <GlassPanel className="panel">
          <EmptyState title={filter === 'open' ? 'No open alerts' : 'Nothing acknowledged yet'}>
            {filter === 'open' ? 'Readings and check-ins are inside the generic bands and this crew member’s baseline.' : 'Acknowledged alerts appear here.'}
          </EmptyState>
        </GlassPanel>
      )}
    </div>
  );
}
