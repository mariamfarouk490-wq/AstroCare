import GlassPanel from './GlassPanel.jsx';
import { cx } from './cx.js';

/** Glass panel with an optional mono title row. */
export default function Panel({ title, aside, className, children, ...rest }) {
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
