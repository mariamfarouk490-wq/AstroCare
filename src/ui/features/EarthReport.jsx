// "Prepare report for Earth": preview of the flight-surgeon report with Copy and Download.
import { useState } from 'react';
import { useApp } from '../../state/store.js';
import { Button, Modal } from '../components/index.jsx';
import { formatDuration, formatTime } from '../format.js';

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
        <Modal title={report.title} onClose={() => setReport(null)}>
          <p className="secondary modal__text">
            {report.roundTripSec
              ? `Expected reply in ~${formatDuration(report.roundTripSec)} (round trip), around ${formatTime(report.expectedReplyAt.toISOString())}. Do not wait for Earth to act.`
              : 'Live link: a reply can arrive in seconds.'}
          </p>
          <pre className="earth-report">{report.text}</pre>
          <div className="row-gap actions">
            <Button block icon="link" onClick={copy}>
              Copy
            </Button>
            <Button block variant="primary" icon="chevronDown" onClick={download}>
              Download .txt
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
