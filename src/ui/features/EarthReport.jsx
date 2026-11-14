// "Prepare report for Earth": readable preview of the flight-surgeon report, with Copy and Download (.txt).
import { useState } from 'react';
import { useApp } from '../../state/store.js';
import { Button, Modal, RefList } from '../components/index.jsx';
import { formatDuration, formatTime } from '../format.js';

function ReportView({ report }) {
  return (
    <div className="earth-report">
      {report.sections.map((s) => (
        <section key={s.title} className="earth-report__section">
          <h3 className="eyebrow">{s.title}</h3>
          {s.empty && <p className="footnote tertiary">{s.empty}</p>}
          {s.blocks.map((b, i) => (
            <div key={b.heading ?? i} className="earth-report__block">
              {b.heading && <p className="earth-report__heading">{b.heading}</p>}
              {b.rows.length > 0 && (
                <dl className="earth-report__rows">
                  {b.rows.map(([k, v], j) => (
                    <div key={`${k}-${j}`} className="earth-report__row">
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <RefList refs={b.links} />
            </div>
          ))}
        </section>
      ))}
      {report.notes.map((n) => (
        <p key={n} className="footnote secondary earth-report__note">
          {n}
        </p>
      ))}
    </div>
  );
}

export default function EarthReportButton({ crewId, size = 'sm', variant, label = 'Prepare report for Earth' }) {
  const buildEarthReport = useApp((s) => s.buildEarthReport);
  const notify = useApp((s) => s.notify);
  const [report, setReport] = useState(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.text);
      notify('Report copied', 'ok');
    } catch {
      notify('Copy blocked by the browser; use Download', 'alert');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([report.text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = report.filename;
    a.click();
    URL.revokeObjectURL(url);
    notify('Report saved', 'ok');
  };

  return (
    <>
      <Button size={size} variant={variant} icon="signal" onClick={() => setReport(buildEarthReport(crewId))}>
        {label}
      </Button>
      {report && (
        <Modal
          title={report.title}
          onClose={() => setReport(null)}
          footer={
            <>
              <Button block icon="link" onClick={copy}>
                Copy
              </Button>
              <Button block variant="primary" icon="chevronDown" onClick={download}>
                Download .txt
              </Button>
            </>
          }
        >
          <p className="secondary modal__text">
            {report.roundTripSec
              ? `Expected reply in ~${formatDuration(report.roundTripSec)} (round trip), around ${formatTime(report.expectedReplyAt.toISOString())}. Do not wait for Earth to act.`
              : 'Live link: a reply can arrive in seconds.'}
          </p>
          <ReportView report={report} />
        </Modal>
      )}
    </>
  );
}
