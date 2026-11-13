import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useApp, useHealth } from '../../state/store.js';
import { GlassPanel } from '../components/index.jsx';
import TopBar from './TopBar.jsx';
import TabBar from './TabBar.jsx';
import DemoBar from './DemoBar.jsx';
import { useRoute } from './useRoute.js';
import MeasureScreen from '../screens/MeasureScreen.jsx';
import TrendsScreen from '../screens/TrendsScreen.jsx';
import AlertsScreen from '../screens/AlertsScreen.jsx';
import RemindersScreen from '../screens/RemindersScreen.jsx';
import AboutScreen from '../screens/AboutScreen.jsx';
import EmergencyScreen from '../screens/EmergencyScreen.jsx';

// The 3D body map is the heaviest chunk (three.js); load it on its own.
const BodyMapScreen = lazy(() => import('../screens/BodyMapScreen.jsx'));

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

function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  return (
    <GlassPanel strong key={toast.id} className={`toast toast--${toast.tone}`} role="status">
      <span className="toast__dot" />
      {toast.message}
    </GlassPanel>
  );
}

export default function AppShell() {
  const route = useRoute();
  const health = useHealth();
  const demoOpen = useApp((s) => s.demo.open);
  const openDemo = useApp((s) => s.openDemo);
  const emergencyRunning = useApp((s) => Boolean(s.emergency));
  const [emergency, setEmergency] = useState(null); // { protocol } when the emergency overlay is open

  const onEmergency = useCallback((protocol) => setEmergency({ protocol: typeof protocol === 'string' ? protocol : undefined }), []);
  const closeEmergency = useCallback(() => setEmergency(null), []);

  // ?play autoplays the demo replay
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('play')) openDemo(true);
  }, [openDemo]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.screen]);

  const openAlerts =health.alerts.filter((a) => !a.acknowledgedAt).length;
  const screens = {
    body: <BodyMapScreen param={route.param} onEmergency={onEmergency} />,
    measure: <MeasureScreen param={route.param} onEmergency={onEmergency} />,
    trends: <TrendsScreen param={route.param} />,
    alerts: <AlertsScreen onEmergency={onEmergency} />,
    reminders: <RemindersScreen />,
    about: <AboutScreen />,
  };

  return (
    <div className={`shell${demoOpen ? ' shell--demo' : ''}`}>
      <Backdrop />
      <TopBar onEmergency={() => onEmergency()} />
      <main className="shell__main" key={route.screen}>
        <Suspense fallback={<div className="loading">Loading body map…</div>}>{screens[route.screen]}</Suspense>
      </main>
      {demoOpen && <DemoBar onEmergency={() => onEmergency('CHEST_PAIN')} />}
      <TabBar screen={route.screen} openAlerts={openAlerts} />
      <Toast />
      {(emergency || emergencyRunning) && <EmergencyScreen initialProtocol={emergency?.protocol} onClose={closeEmergency} />}
    </div>
  );
}
