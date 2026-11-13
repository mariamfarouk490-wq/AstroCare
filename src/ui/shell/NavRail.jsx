import { Icon } from '../components/index.jsx';
import { navigate } from './useRoute.js';

const ITEMS = [
  { screen: 'body', label: 'Body', icon: 'body' },
  { screen: 'measure', label: 'Measure', icon: 'measure' },
  { screen: 'trends', label: 'Trends', icon: 'trends' },
  { screen: 'alerts', label: 'Alerts', icon: 'alerts' },
  { screen: 'reminders', label: 'Reminders', icon: 'reminders' },
  { screen: 'about', label: 'Sources', icon: 'about', title: 'About & sources' },
];

/** Slim left navigation rail (bottom bar on small screens). */
export default function NavRail({ screen, openAlerts }) {
  return (
    <nav className="rail liquid" aria-label="Screens">
      {ITEMS.map((t) => (
        <button
          key={t.screen}
          type="button"
          className="rail__item"
          aria-current={t.screen === screen ? 'page' : undefined}
          title={t.title ?? t.label}
          onClick={() => navigate(t.screen)}
        >
          <span className="rail__icon">
            <Icon name={t.icon} size={20} />
            {t.screen === 'alerts' && openAlerts > 0 && <span className="rail__count num">{openAlerts}</span>}
          </span>
          <span className="rail__label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
