import Icon from './Icon.jsx';

/** Source links: [{ label, url? }]. A ref without a url (team threshold) is plain text. */
export default function RefList({ refs }) {
  if (!refs?.length) return null;
  return (
    <ul className="refs">
      {refs.map((r) => (
        <li key={(r.url ?? '') + r.label}>
          {r.url ? (
            <a className="ref" href={r.url} target="_blank" rel="noreferrer" title={r.label}>
              <span>{r.label}</span>
              <Icon name="link" size={12} strokeWidth={2} />
            </a>
          ) : (
            <span className="ref ref--plain" title="Set by the AstroCare team; no published source">
              <span>{r.label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
