const STATUS_LABEL = { Normal: 'Normal', Watch: 'Watch', Critical: 'Critical', NoData: 'No data' };

/** Status chip: green Normal, outlined red Watch, solid red Critical. */
export function StatusBadge({ status, children }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" />
      {children ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Neutral or informational label. tone: neutral | info | Normal | Watch | Critical */
export function Pill({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
