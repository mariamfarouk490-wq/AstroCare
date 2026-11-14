import { useApp } from '../../state/store.js';
import { Button, GlassPanel, Pill, RefList, StatusBadge } from '../components/index.jsx';
import { DOMAIN_LABEL, formatShortDay } from '../format.js';
import EarthReportButton from './EarthReport.jsx';

/** One alert with everything the crew needs: rule code, reason, threshold, action, severity, sources. */
export default function AlertCard({ alert, compact, onEmergency }) {
  const acknowledge = useApp((s) => s.acknowledgeAlert);
  const replaying = useApp((s) => s.viewDay !== null);
  const crewId = useApp((s) => s.user.selectedCrewId);
  const isCombo = alert.kind === 'combo';
  return (
    <GlassPanel as="article" flat className={`alert-card alert-card--${alert.severity}${compact ? ' alert-card--compact' : ''}${alert.acknowledgedAt ? ' is-ack' : ''}`}>
      <header className="alert-card__head">
        <StatusBadge status={alert.severity} />
        {isCombo && <Pill tone="neutral">Combined</Pill>}
        <code className="alert-card__code">{alert.code}</code>
        <span className="alert-card__when footnote tertiary num">
          Mission day {alert.missionDay} · {formatShortDay(alert.firedOn)}
        </span>
      </header>
      <p className="alert-card__reason">{alert.reason}</p>
      <dl className="alert-card__facts">
        <div>
          <dt>Threshold</dt>
          <dd>
            {alert.threshold}
            {alert.thresholdSource && <span className="tertiary"> · {alert.thresholdSource === 'app' ? 'team choice' : alert.thresholdSource}</span>}
          </dd>
        </div>
        <div>
          <dt>Do this</dt>
          <dd>{alert.action}</dd>
        </div>
        {!compact && (
          <div>
            <dt>Domain</dt>
            <dd>
              {DOMAIN_LABEL[alert.domain]}
              {alert.notifyEarth && <span className="tertiary"> · send to flight surgeon</span>}
            </dd>
          </div>
        )}
      </dl>
      {!compact && <RefList refs={alert.refs} />}
      {(!compact || alert.suggestEmergency) && (
        <footer className="alert-card__foot">
          {alert.suggestEmergency && onEmergency && (
            <Button size="sm" variant="danger" icon="emergency" onClick={() => onEmergency(alert.suggestEmergency)}>
              Open {alert.suggestEmergency.replace('_', ' ').toLowerCase()} protocol
            </Button>
          )}
          {!compact && alert.notifyEarth && <EarthReportButton crewId={crewId} label="Report to Earth" />}
          {!compact &&
            (alert.acknowledgedAt ? (
              <span className="footnote tertiary alert-card__ack">Acknowledged</span>
            ) : (
              <Button size="sm" icon="check" onClick={() => acknowledge(alert.code)} disabled={replaying} title={replaying ? 'Exit the demo replay to acknowledge' : undefined}>
                Acknowledge
              </Button>
            ))}
        </footer>
      )}
    </GlassPanel>
  );
}
