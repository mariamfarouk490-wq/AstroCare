import { cx } from './cx.js';

/**
 * Dark liquid-glass surface.
 * strong: denser blur and fill · solid: near-opaque (sheets, modals) · flat: softer shadow
 * liquid: refraction filter on the backdrop (use on small surfaces) · interactive: hover lift + pointer highlight
 */
export default function GlassPanel({ as: Tag = 'section', strong, solid, flat, liquid, interactive, className, children, ...rest }) {
  return (
    <Tag
      className={cx('glass', strong && 'glass--strong', solid && 'glass--solid', flat && 'glass--flat', liquid && 'glass--liquid', interactive && 'glass--interactive', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
