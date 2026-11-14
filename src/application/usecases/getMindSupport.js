/**
 * Mind support card: shown when a mood, stress or sleep alert is open, or right after a check-in
 * with low mood or high stress. Pure: decides from the open alerts and mind-support.json.
 * @param {{ triggers: string[], escalation: { rule: string }, checkInTrigger: { moodAtMost: number, stressAtLeast: number } }} data
 * @param {{ code: string }[]} alerts  open alerts of the crew member (acknowledged ones included: still active)
 * @param {{ mood?: number, stress?: number } | null} checkIn  the day's check-in, if any
 * @returns {{ show: boolean, level: 'none' | 'support' | 'urgent', reasons: string[], fromCheckIn: boolean }}
 */
export function getMindSupport(data, alerts, checkIn = null) {
  const reasons = alerts.map((a) => a.code).filter((c) => data.triggers.includes(c));
  const t = data.checkInTrigger;
  const fromCheckIn = Boolean(checkIn && ((checkIn.mood ?? 5) <= t.moodAtMost || (checkIn.stress ?? 1) >= t.stressAtLeast));
  const urgent = reasons.includes(data.escalation.rule);
  const show = reasons.length > 0 || fromCheckIn;
  return { show, level: urgent ? 'urgent' : show ? 'support' : 'none', reasons, fromCheckIn };
}
