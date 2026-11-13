// Liquid-glass building blocks. Styles: src/ui/styles/components.css
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export { default as Icon } from './Icon.jsx';
export { default as Sparkline } from './Sparkline.jsx';

const cx = (...c) => c.filter(Boolean).join(' ');

export function GlassPanel({ as: Tag = 'section', strong, flat, xl, interactive, className, children, ...rest }) {
  return (
    <Tag className={cx('glass', strong && 'glass--strong', flat && 'glass--flat', xl && 'glass--xl', interactive && 'glass--interactive', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Panel({ title, aside, className, children, ...rest }) {
  return (
    <GlassPanel className={cx('panel', className)} {...rest}>
      {(title || aside) && (
        <header className="panel__head">
          {title && <h2 className="panel__title">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </GlassPanel>
  );
}

export function Button({ variant, size, icon, block, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx('btn', variant && `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', !children && icon && 'btn--icon', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

/** iOS segmented control. options: [{ value, label }] */
export function SegmentedControl({ options, value, onChange, label, block, size }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  useLayoutEffect(() => {
    const el = ref.current?.querySelectorAll('.segmented__item')[index];
    if (el) setThumb({ width: el.offsetWidth, x: el.offsetLeft - 3 });
  }, [index, options.length, block]);
  useEffect(() => {
    const onResize = () => {
      const el = ref.current?.querySelectorAll('.segmented__item')[index];
      if (el) setThumb({ width: el.offsetWidth, x: el.offsetLeft - 3 });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index]);
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx('segmented', block && 'segmented--block', size && `segmented--${size}`)}>
      {thumb && <span className="segmented__thumb" style={{ width: thumb.width, transform: `translateX(${thumb.x}px)` }} />}
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="segmented__item" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_LABEL = { Normal: 'Normal', Watch: 'Watch', Critical: 'Critical', NoData: 'No data' };

export function StatusBadge({ status, children }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" />
      {children ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Stat({ label, value, unit, sub, size, className }) {
  return (
    <div className={cx('stat', className)}>
      {label && <span className="stat__label">{label}</span>}
      <span className={cx('stat__value', size && `stat__value--${size}`)}>
        {value ?? '–'}
        {unit && value !== undefined && <span className="stat__unit">{unit}</span>}
      </span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Sheet({ title, eyebrow, aside, onClose, children }) {
  useEscape(onClose);
  const id = useId();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <GlassPanel as="aside" strong xl className="sheet" role="dialog" aria-labelledby={id}>
        <header className="sheet__head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 id={id} className="title-2">
              {title}
            </h2>
            {aside}
          </div>
          <Button icon="close" aria-label="Close" onClick={onClose} />
        </header>
        <div className="sheet__body">{children}</div>
      </GlassPanel>
    </>
  );
}

export function Modal({ title, onClose, children }) {
  useEscape(onClose);
  const id = useId();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <GlassPanel strong xl className="modal" role="dialog" aria-modal="true" aria-labelledby={id}>
        <h2 id={id} className="title-2" style={{ marginBottom: 16 }}>
          {title}
        </h2>
        {children}
      </GlassPanel>
    </>
  );
}

export function RefList({ refs }) {
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

export function EmptyState({ icon = 'check', title, children }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="empty__title">{title}</span>
      {children && <span className="footnote">{children}</span>}
    </div>
  );
}
