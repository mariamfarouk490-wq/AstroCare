import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'check', title, children }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="empty__title">{title}</span>
      {children && <span className="footnote">{children}</span>}
    </div>
  );
}
