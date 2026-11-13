import { useEffect, useState } from 'react';
import { useApp } from '../../state/store.js';
import { Button, GlassPanel, Icon, RefList } from '../components/index.jsx';
import { navigate } from '../shell/useRoute.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICON = { 'rem-morning-vitals': 'measure', 'rem-evening-checkin': 'moon', 'rem-exercise': 'bone', 'rem-water': 'flask', 'rem-cabin-air': 'wind', 'rem-radiation': 'atom' };

const at = (base, hhmm, addDays = 0) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Next time a reminder is due (local time). */
function nextDue(schedule, now) {
  if (schedule.type === 'daily') {
    const t = at(now, schedule.localTime);
    return t > now ? t : at(now, schedule.localTime, 1);
  }
  if (schedule.type === 'weekly') {
    const target = WEEKDAYS.indexOf(schedule.weekday);
    for (let i = 0; i < 8; i++) {
      const t = at(now, schedule.localTime, i);
      if (t.getDay() === target && t > now) return t;
    }
  }
  if (schedule.type === 'interval') {
    for (let day = 0; day < 2; day++) {
      let t = at(now, schedule.from, day);
      const end = at(now, schedule.to, day);
      while (t <= end) {
        if (t > now) return t;
        t = new Date(t.getTime() + schedule.everyHours * 3_600_000);
      }
    }
  }
  return null;
}

function scheduleText(s) {
  if (s.type === 'daily') return `Every day at ${s.localTime}`;
  if (s.type === 'weekly') return `Every ${s.weekday} at ${s.localTime}`;
  return `Every ${s.everyHours} h, ${s.from}–${s.to}`;
}

function relative(t, now) {
  const min = Math.round((t - now) / 60000);
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h} h ${min % 60} min`;
  return `in ${Math.round(h / 24)} days`;
}

const OPEN_TARGET = {
  measure: { label: 'Measure now', go: () => navigate('measure') },
  checkin: { label: 'Open check-in', go: () => navigate('measure', 'checkin') },
  cabin: { label: 'See cabin air', go: () => navigate('body') },
  'body:aura': { label: 'Open radiation', go: () => navigate('body', 'aura') },
};

const HHMM = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function RemindersScreen() {
  const reminders = useApp((s) => s.seed.reminders);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const items = reminders
    .map((r) => ({ r, due: nextDue(r.schedule, now) }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
  const [next, ...rest] = items;
  const nextTarget = next?.r.opens && OPEN_TARGET[next.r.opens];
  return (
    <div className="page reminders">
      {next && (
        <GlassPanel className="panel reminder-next">
          <div className="reminder-next__when">
            <span className="eyebrow">Next · {relative(next.due, now)}</span>
            <span className="reminder-next__time num">{next.due ? HHMM.format(next.due) : '–'}</span>
          </div>
          <div className="reminder-next__body">
            <h1 className="title-large">
              <Icon name={ICON[next.r.id] ?? 'reminders'} size={26} /> {next.r.title}
            </h1>
            <p className="secondary">{next.r.what}</p>
            <p className="footnote tertiary">{next.r.why}</p>
            <div className="reminder-next__actions">
              {nextTarget && (
                <Button variant="primary" onClick={nextTarget.go}>
                  {nextTarget.label}
                </Button>
              )}
              <RefList refs={next.r.refs} />
            </div>
          </div>
        </GlassPanel>
      )}
      <GlassPanel className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Later today and this week</h2>
        </header>
        <ol className="agenda">
          {rest.map(({ r, due }) => {
            const target = r.opens && OPEN_TARGET[r.opens];
            return (
              <li key={r.id} className="agenda__row">
                <span className="agenda__time num">{due ? HHMM.format(due) : '–'}</span>
                <span className="agenda__icon">
                  <Icon name={ICON[r.id] ?? 'reminders'} size={18} />
                </span>
                <div className="agenda__text">
                  <span className="agenda__title">{r.title}</span>
                  <span className="footnote tertiary">
                    {r.what} · {scheduleText(r.schedule).toLowerCase()}
                  </span>
                </div>
                <span className="footnote tertiary num agenda__in">{due && relative(due, now)}</span>
                {target ? (
                  <Button size="sm" onClick={target.go}>
                    {target.label}
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ol>
      </GlassPanel>
    </div>
  );
}
