// Minimal hash router: "#/body/heart" → { screen: 'body', param: 'heart' }.
import { useEffect, useState } from 'react';

export const SCREENS = ['body', 'measure', 'trends', 'alerts', 'reminders', 'about'];

function parse() {
  const [screen, param] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { screen: SCREENS.includes(screen) ? screen : 'body', param: param || null };
}

export function navigate(screen, param) {
  window.location.hash = `/${screen}${param ? `/${param}` : ''}`;
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
