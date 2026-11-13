import { useLayoutEffect, useRef, useState } from 'react';
import { GlassPanel, Icon } from '../components/index.jsx';
import { navigate } from './useRoute.js';

const TABS = [
  { screen: 'body', label: 'Body', icon: 'body' },
  { screen: 'measure', label: 'Measure', icon: 'measure' },
  { screen: 'trends', label: 'Trends', icon: 'trends' },
  { screen: 'alerts', label: 'Alerts', icon: 'alerts' },
  { screen: 'reminders', label: 'Reminders', icon: 'reminders' },
  { screen: 'about', label: 'About', icon: 'about' },
];

export default function TabBar({ screen, openAlerts }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState(null);
  const index = TABS.findIndex((t) => t.screen === screen);
  useLayoutEffect(() => {
    const el = ref.current?.querySelectorAll('.tab')[index];
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
  }, [index]);
  return (
    <nav className="tabbar" aria-label="Screens">
      <GlassPanel strong className="tabbar__inner" ref={ref}>
        {thumb && <span className="tabbar__thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />}
        {TABS.map((t) => (
          <button key={t.screen} type="button" className="tab" aria-current={t.screen === screen ? 'page' : undefined} onClick={() => navigate(t.screen)}>
            <span className="tab__icon">
              <Icon name={t.icon} size={22} />
              {t.screen === 'alerts' && openAlerts > 0 && <span className="tab__count num">{openAlerts}</span>}
            </span>
            <span className="tab__label">{t.label}</span>
          </button>
        ))}
      </GlassPanel>
    </nav>
  );
}
