import { cx } from './cx.js';

/**
 * Dark glass surface with HUD corner brackets.
 * strong: denser blur and fill · solid: near-opaque (sheets, modals) · flat: softer shadow
 * plain: no corner brackets · interactive: hover lift · scan: run the scan line once on mount
 */
export default function GlassPanel({ as: Tag = 'section', strong, solid, flat, plain, interactive, scan, className, children, ...rest }) {
  return (
    <Tag
      className={cx('glass', strong && 'glass--strong', solid && 'glass--solid', flat && 'glass--flat', plain && 'glass--plain', interactive && 'glass--interactive', className)}
      {...rest}
    >
      {scan && <span className="scan" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
