import { useEffect, useState } from 'react';
import { useApp } from '../../state/store.js';
import { Button, GlassPanel, Icon, Pill, RefList } from '../components/index.jsx';
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
  return (
    <div className="page">
      <header className="page__head">
        <div>
          <div className="eyebrow">Reminders</div>
          <h1 className="title-large">Today’s rhythm</h1>
          <p className="secondary footnote lede">
            Same time every day keeps the personal baseline accurate. Times are local to the habitat clock.
          </p>
        </div>
      </header>
      <div className="reminder-grid">
        {items.map(({ r, due }, i) => {
          const target = r.opens && OPEN_TARGET[r.opens];
          return (
            <GlassPanel as="article" key={r.id} className={`panel reminder${i === 0 ? ' reminder--next' : ''}`} interactive>
              <header className="reminder__head">
                <span className="reminder__icon">
                  <Icon name={ICON[r.id] ?? 'reminders'} size={20} />
                </span>
                {i === 0 && <Pill tone="info">Next</Pill>}
              </header>
              <h2 className="title-3">{r.title}</h2>
              <p className="secondary footnote">{r.what}</p>
              <div className="reminder__when">
                <span className="num">{scheduleText(r.schedule)}</span>
                {due && <span className="tertiary num">{relative(due, now)}</span>}
              </div>
              <p className="footnote tertiary">{r.why}</p>
              <div className="reminder__foot">
                <RefList refs={r.refs.slice(0, 1)} />
                {target && (
                  <Button size="sm" variant="plain" onClick={target.go}>
                    {target.label}
                  </Button>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
