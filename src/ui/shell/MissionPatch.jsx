// AstroCare mission patch: original mark. A planet limb, an orbit, a heartbeat line and a star.
export default function MissionPatch({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="AstroCare mission patch">
      <defs>
        <linearGradient id="patch-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f6" />
          <stop offset="0.55" stopColor="#8e8e93" />
          <stop offset="1" stopColor="#d4d4d8" />
        </linearGradient>
        <clipPath id="patch-clip">
          <circle cx="32" cy="32" r="25" />
        </clipPath>
        <path id="patch-text" d="M 8 32 A 24 24 0 0 1 56 32" />
      </defs>
      <circle cx="32" cy="32" r="31" fill="#050507" stroke="url(#patch-silver)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="rgba(230,230,234,0.35)" strokeWidth="0.75" />
      <g clipPath="url(#patch-clip)">
        <circle cx="32" cy="74" r="34" fill="#141418" stroke="url(#patch-silver)" strokeWidth="1" />
        <ellipse cx="32" cy="36" rx="22" ry="7" fill="none" stroke="rgba(230,230,234,0.45)" strokeWidth="0.8" transform="rotate(-14 32 36)" />
        <polyline points="9,38 20,38 24,30 28,45 33,24 37,38 55,38" fill="none" stroke="#ff453a" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M44 17 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2z" fill="#e6e6ea" />
      </g>
      <text fontFamily="JetBrains Mono, monospace" fontSize="5.2" letterSpacing="1.6" fill="#8e8e93">
        <textPath href="#patch-text" startOffset="50%" textAnchor="middle">
          ASTROCARE
        </textPath>
      </text>
    </svg>
  );
}
