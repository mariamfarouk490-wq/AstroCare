// Line icons drawn on a 24-pt grid, 1.75 stroke, round caps (SF Symbols weight "regular").
const PATHS = {
  body: (
    <>
      <circle cx="12" cy="4.5" r="2.25" />
      <path d="M7 9.5c1.6-.9 3.2-1.3 5-1.3s3.4.4 5 1.3M12 8.2v6.3M12 14.5l-2.6 6.7M12 14.5l2.6 6.7M7 9.5 5.6 14M17 9.5l1.4 4.5" />
    </>
  ),
  measure: <path d="M3 12h4l2.2-5.5L13 18l2.4-6H21" />,
  trends: (
    <>
      <path d="M4 19.5h16" />
      <path d="M5 15l4.5-4.5 3.5 3L19 7" />
      <path d="M15 7h4v4" />
    </>
  ),
  alerts: (
    <>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  reminders: (
    <>
      <circle cx="12" cy="12.5" r="7.5" />
      <path d="M12 8.5v4l2.75 1.75M4.5 5.5 7 3.5M19.5 5.5 17 3.5" />
    </>
  ),
  about: (
    <>
      <path d="M4.5 5.5c2.6-1 5-1 7.5.5v13c-2.5-1.5-4.9-1.5-7.5-.5v-13ZM19.5 5.5c-2.6-1-5-1-7.5.5v13c2.5-1.5 4.9-1.5 7.5-.5v-13Z" />
    </>
  ),
  emergency: (
    <>
      <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6v-6Z" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  watch: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" />
      <path d="M9 6.5l.6-3h4.8l.6 3M9 17.5l.6 3h4.8l.6-3M10 12h1.2l.8-1.8 1 3.6.8-1.8H14" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  pencil: <path d="M14.5 5.5l4 4L9 19H5v-4l9.5-9.5ZM12.5 7.5l4 4" />,
  link: <path d="M8 16l8-8M10 8h6v6" />,
  refresh: (
    <>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" />
      <path d="M19 4.5V8h-3.5" />
    </>
  ),
  heart: <path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />,
  moon: <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z" />,
  bone: <path d="M8 8.5 15.5 16M6.2 9.8a2 2 0 1 1 1.6-3.6 2 2 0 1 1 3.6 1.6M17.8 14.2a2 2 0 1 1-1.6 3.6 2 2 0 1 1-3.6-1.6" />,
  atom: (
    <>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.5" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="8.5" ry="3.5" transform="rotate(-60 12 12)" />
    </>
  ),
  flask: <path d="M9.5 3.5h5M10.5 3.5v5.5l-5 9a1.5 1.5 0 0 0 1.3 2.5h10.4a1.5 1.5 0 0 0 1.3-2.5l-5-9V3.5M7.5 15h9" />,
  signal: (
    <>
      <path d="M12 13.5v7" />
      <circle cx="12" cy="11.5" r="1.75" />
      <path d="M8.5 8a5 5 0 0 0 0 7M15.5 8a5 5 0 0 1 0 7M5.5 5a9 9 0 0 0 0 13M18.5 5a9 9 0 0 1 0 13" />
    </>
  ),
  wind: <path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  rotate: (
    <>
      <path d="M4.5 12a7.5 7.5 0 0 1 13.2-4.9M19.5 12a7.5 7.5 0 0 1-13.2 4.9" />
      <path d="M18 3.5v3.8h-3.8M6 20.5v-3.8h3.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.75, className = '', title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
