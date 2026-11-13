import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useApp, useHealth } from '../../state/store.js';
import { GlassPanel } from '../components/index.jsx';
import TopBar from './TopBar.jsx';
import NavRail from './NavRail.jsx';
import DemoBar from './DemoBar.jsx';
import { useRoute } from './useRoute.js';

// Screens load on demand; the body map carries three.js and is the heaviest chunk.
const SCREENS = {
  body: lazy(() => import('../screens/BodyMapScreen.jsx')),
  measure: lazy(() => import('../screens/MeasureScreen.jsx')),
  trends: lazy(() => import('../screens/TrendsScreen.jsx')),
  alerts: lazy(() => import('../screens/AlertsScreen.jsx')),
  reminders: lazy(() => import('../screens/RemindersScreen.jsx')),
  about: lazy(() => import('../screens/AboutScreen.jsx')),
};
const EmergencyScreen = lazy(() => import('../screens/EmergencyScreen.jsx'));

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="backdrop__blob backdrop__blob--a" />
      <span className="backdrop__blob backdrop__blob--b" />
      <span className="backdrop__blob backdrop__blob--c" />
      <span className="backdrop__grain" />
    </div>
  );
}

/** SVG filter used by backdrop-filter: url(#liquid) for a slight lens refraction at glass edges. */
function LiquidFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="liquid" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="22" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** Pointer-follow highlight: sets --mx / --my on the glass control under the pointer. */
function usePointerHighlight() {
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target.closest?.('.btn, .liquid, .glass--interactive');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
}

function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  return (
    <GlassPanel strong solid key={toast.id} className={`toast toast--${toast.tone}`} role="status">
      <span className="toast__dot" />
      {toast.message}
    </GlassPanel>
  );
}

function Loading() {
  return (
    <div className="loading" role="status">
      <span className="loading__bar" />
      <span className="eyebrow">Loading</span>
    </div>
  );
}

export default function AppShell() {
  const route = useRoute();
  const health = useHealth();
  const demoOpen = useApp((s) => s.demo.open);
  const openDemo = useApp((s) => s.openDemo);
  const emergencyRunning = useApp((s) => Boolean(s.emergency));
  const [emergency, setEmergency] = useState(null); // { protocol } while the emergency overlay is open
  usePointerHighlight();

  const onEmergency = useCallback((protocol) => setEmergency({ protocol: typeof protocol === 'string' ? protocol : undefined }), []);
  const closeEmergency = useCallback(() => setEmergency(null), []);

  // ?play autoplays the demo replay
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('play')) openDemo(true);
  }, [openDemo]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.screen]);

  const Screen = SCREENS[route.screen];
  const openAlerts = health.alerts.filter((a) => !a.acknowledgedAt).length;

  return (
    <div className={`shell${demoOpen ? ' shell--demo' : ''}`}>
      <LiquidFilter />
      <Backdrop />
      <TopBar onEmergency={() => onEmergency()} />
      <NavRail screen={route.screen} openAlerts={openAlerts} />
      <main className="shell__main" key={route.screen}>
        <Suspense fallback={<Loading />}>
          <Screen param={route.param} onEmergency={onEmergency} />
        </Suspense>
      </main>
      {demoOpen && <DemoBar onEmergency={() => onEmergency('CHEST_PAIN')} />}
      <Toast />
      {(emergency || emergencyRunning) && (
        <Suspense fallback={null}>
          <EmergencyScreen initialProtocol={emergency?.protocol} onClose={closeEmergency} />
        </Suspense>
      )}
    </div>
  );
}
