import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from './cx.js';

/** Underline tabs (radio group). options: [{ value, label }] */
export default function Tabs({ options, value, onChange, label, block }) {
  const ref = useRef(null);
  const [bar, setBar] = useState(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const measure = useCallback(() => {
    const el = ref.current?.querySelectorAll('.segmented__item')[index];
    if (el) setBar({ width: el.offsetWidth, x: el.offsetLeft });
  }, [index]);
  useLayoutEffect(measure, [measure, options.length, block]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx('segmented', block && 'segmented--block')}>
      {bar && <span className="segmented__thumb" style={{ width: bar.width, transform: `translateX(${bar.x}px)` }} />}
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="segmented__item" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
