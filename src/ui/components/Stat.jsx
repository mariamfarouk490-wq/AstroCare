import { useEffect, useRef, useState } from 'react';
import { cx } from './cx.js';
import Est from './Est.jsx';

const NUMERIC = /^-?\d+(\.\d+)?$/;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts a numeric value up to its new value, keeping its decimals. Anything else passes through. */
function useCountUp(value) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const text = value === undefined || value === null ? '' : String(value);
    const start = Number(from.current);
    if (!NUMERIC.test(text) || !Number.isFinite(start) || reduced()) {
      from.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const end = Number(text);
    const decimals = text.split('.')[1]?.length ?? 0;
    const t0 = performance.now();
    let frame;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 600);
      setShown((start + (end - start) * (1 - (1 - k) ** 3)).toFixed(decimals));
      if (k < 1) frame = requestAnimationFrame(step);
      else from.current = text;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

/** Telemetry value: mono label, large mono number, unit, optional sub line. */
export default function Stat({ label, value, unit, sub, size, className, est }) {
  const shown = useCountUp(value);
  const empty = value === undefined || value === null;
  return (
    <div className={cx('stat', className)}>
      {label && <span className="stat__label">{label}</span>}
      <span className={cx('stat__value', size && `stat__value--${size}`)}>
        {empty ? '–' : shown}
        {unit && !empty && <span className="stat__unit">{unit}</span>}
        {est && !empty && <Est />}
      </span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}
