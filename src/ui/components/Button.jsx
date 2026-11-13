import Icon from './Icon.jsx';
import { cx } from './cx.js';

/** variant: primary | danger | danger-ghost | plain. size: sm | lg. Icon-only buttons need an aria-label. */
export default function Button({ variant, size, icon, block, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx('btn', variant && `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', !children && icon && 'btn--icon', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}
