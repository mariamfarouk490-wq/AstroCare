import Icon from './Icon.jsx';

/** Source links: [{ label, url }] */
export default function RefList({ refs }) {
  if (!refs?.length) return null;
  return (
    <ul className="refs">
      {refs.map((r) => (
        <li key={r.url + r.label}>
          <a className="ref" href={r.url} target="_blank" rel="noreferrer" title={r.label}>
            <span>{r.label}</span>
            <Icon name="link" size={12} strokeWidth={2} />
          </a>
        </li>
      ))}
    </ul>
  );
}
