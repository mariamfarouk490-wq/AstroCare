// Cross-file relation checks for the seed (the "foreign keys" a database would enforce).
// Pure function: returns a list of error strings; empty list = OK.

/**
 * @param {{crew:any[], mission:any, missionProfiles:any[], metrics:any[], measurements:any[], checkIns:any[],
 *          rules:any[], guides:any[], protocols:any[], bodyParts:any[], symptoms:any[], hazards?:any[], nasaRisks?:any[], cabinEnvironment?:any[]}} seed
 * @returns {string[]}
 */
export function checkIntegrity(seed) {
  const errors = [];
  const fail = (m) => errors.push(m);
  const crewIds = new Set(seed.crew.map((c) => c.id));
  const metric = Object.fromEntries(seed.metrics.map((m) => [m.code, m]));
  const symptomCodes = new Set(seed.symptoms.map((s) => s.code));
  const ruleByCode = Object.fromEntries(seed.rules.map((r) => [r.code, r]));
  const protocolCodes = new Set(seed.protocols.map((p) => p.code));

  if (!seed.missionProfiles.some((p) => p.code === seed.mission.profileCode)) fail(`mission.profileCode "${seed.mission.profileCode}" not in mission-profiles`);

  // metrics: bands cover the whole valid range with no gaps (per glucose context)
  for (const m of seed.metrics) {
    const contexts = [...new Set(m.bands.map((b) => b.context ?? null))];
    for (const ctx of contexts) {
      const bands = m.bands.filter((b) => (b.context ?? null) === ctx);
      for (let v = m.validMin; v <= m.validMax + 1e-9; v = +(v + m.step).toFixed(4)) {
        if (!bands.some((b) => (b.min ?? -Infinity) <= v + 1e-9 && v - 1e-9 <= (b.max ?? Infinity))) {
          fail(`metrics ${m.code}${ctx ? `/${ctx}` : ''}: no band covers ${v}`);
          break;
        }
      }
    }
  }

  for (const x of seed.measurements) {
    if (!crewIds.has(x.crewId)) fail(`measurement ${x.id}: crewId ${x.crewId} not in crew`);
    for (const r of x.readings) {
      const m = metric[r.metric];
      if (!m) fail(`measurement ${x.id}: unknown metric ${r.metric}`);
      else if (r.value < m.validMin || r.value > m.validMax) fail(`measurement ${x.id}: ${r.metric}=${r.value} outside ${m.validMin}..${m.validMax}`);
    }
  }

  for (const c of seed.checkIns) {
    if (!crewIds.has(c.crewId)) fail(`check-in ${c.id}: crewId ${c.crewId} not in crew`);
    for (const s of c.symptoms) if (!symptomCodes.has(s)) fail(`check-in ${c.id}: unknown symptom ${s}`);
  }

  for (const r of seed.rules) {
    if ((r.kind === 'threshold' || r.kind === 'baseline') && !metric[r.params.metric]) fail(`rule ${r.code}: unknown metric ${r.params.metric}`);
    if (r.kind === 'combo') {
      for (const a of r.params.allOf) {
        if (!ruleByCode[a]) fail(`rule ${r.code}: allOf ${a} does not exist`);
        else if (ruleByCode[a].kind === 'combo') fail(`rule ${r.code}: combo cannot contain combo ${a}`);
      }
    }
  }

  // one guide per metric (blood pressure: one guide on BP_SYSTOLIC)
  for (const code of Object.keys(metric)) {
    const n = seed.guides.filter((g) => g.metric === code).length;
    if (code === 'BP_DIASTOLIC' ? n !== 0 : n !== 1) fail(`guides: expected ${code === 'BP_DIASTOLIC' ? 0 : 1} guide for ${code}, found ${n}`);
  }

  // protocols: every next exists and every step is reachable from startStep
  for (const p of seed.protocols) {
    const steps = Object.fromEntries(p.steps.map((s) => [s.code, s]));
    const reached = new Set([p.startStep]);
    const stack = [p.startStep];
    while (stack.length) {
      const s = steps[stack.pop()];
      if (!s) continue;
      const nexts = [...(s.options ?? []).map((o) => o.next), ...(s.next ? [s.next] : [])];
      for (const n of nexts) {
        if (n.includes(':')) {
          if (!protocolCodes.has(n.split(':')[0])) fail(`protocol ${p.code}: ${n} points to an unknown protocol`);
        } else if (!steps[n]) fail(`protocol ${p.code}: next "${n}" does not exist`);
        else if (!reached.has(n)) { reached.add(n); stack.push(n); }
      }
    }
    for (const s of p.steps) if (!reached.has(s.code)) fail(`protocol ${p.code}: step ${s.code} is unreachable`);
  }

  // body parts: metric domains match, every metric shown somewhere, resource links exist
  const riskCodes = new Set((seed.nasaRisks ?? []).map((r) => r.code));
  const hazardCodes = new Set((seed.hazards ?? []).map((h) => h.code));
  for (const b of seed.bodyParts) {
    for (const m of b.metrics) if (metric[m]?.domain !== b.domain) fail(`body part ${b.id}: metric ${m} belongs to another domain`);
    if (seed.nasaRisks) for (const r of b.nasaRisks) if (!riskCodes.has(r)) fail(`body part ${b.id}: unknown NASA risk ${r}`);
    if (seed.hazards) for (const h of b.hazards) if (!hazardCodes.has(h)) fail(`body part ${b.id}: unknown hazard ${h}`);
  }
  for (const code of Object.keys(metric)) if (!seed.bodyParts.some((b) => b.metrics.includes(code))) fail(`metric ${code} is not on any body part`);

  // body part ↔ NASA risk ↔ hazard links agree both ways (nasa-risks.json is the source of truth)
  if (seed.nasaRisks && seed.hazards) {
    const part = Object.fromEntries(seed.bodyParts.map((b) => [b.id, b]));
    for (const r of seed.nasaRisks) {
      const b = part[r.bodyPart];
      if (!b) { fail(`NASA risk ${r.code}: unknown body part ${r.bodyPart}`); continue; }
      if (b.domain !== r.domain) fail(`NASA risk ${r.code}: domain ${r.domain} but body part ${b.id} is ${b.domain}`);
      if (!b.nasaRisks.includes(r.code)) fail(`body part ${b.id}: missing NASA risk ${r.code} in nasaRisks`);
      if (!b.hazards.includes(r.hazard)) fail(`body part ${b.id}: missing hazard ${r.hazard} (from risk ${r.code})`);
    }
    for (const h of seed.hazards) {
      for (const id of h.bodyParts) {
        if (!part[id]?.hazards.includes(h.code)) fail(`hazard ${h.code}: body part ${id} does not list it`);
        if (part[id] && !h.domains.includes(part[id].domain)) fail(`hazard ${h.code}: domain of ${id} missing from domains`);
      }
      for (const b of seed.bodyParts) if (b.hazards.includes(h.code) && !h.bodyParts.includes(b.id)) fail(`hazard ${h.code}: bodyParts is missing ${b.id}`);
    }
  }

  // rule texts only use known placeholders
  const PLACEHOLDERS = new Set(['value', 'mean', 'sd', 'days', 'delta', 'pct']);
  for (const r of seed.rules) {
    for (const [, name] of r.reasonTemplate.matchAll(/\{(\w+)\}/g)) if (!PLACEHOLDERS.has(name)) fail(`rule ${r.code}: unknown placeholder {${name}}`);
  }

  // mind support: triggers and the escalation rule are real rule codes
  if (seed.mindSupport) {
    for (const code of seed.mindSupport.triggers) if (!ruleByCode[code]) fail(`mind-support: trigger ${code} is not a rule`);
    if (!ruleByCode[seed.mindSupport.escalation.rule]) fail(`mind-support: escalation rule ${seed.mindSupport.escalation.rule} is not a rule`);
    if (!seed.mindSupport.triggers.includes(seed.mindSupport.escalation.rule)) fail('mind-support: escalation rule must also be a trigger');
  }

  // mission profiles: every name in `estimates` is a real field
  for (const p of seed.missionProfiles) for (const e of p.estimates ?? []) if (!(e in p)) fail(`profile ${p.code}: estimates names unknown field ${e}`);

  // seed days line up: each crew member has a check-in for every measurement day, and the cabin log covers the same days
  const measDays = new Set(seed.measurements.filter((m) => m.source === 'seed').map((m) => `${m.crewId}|${m.takenAt.slice(0, 10)}`));
  const checkDays = new Set(seed.checkIns.filter((c) => c.source === 'seed').map((c) => `${c.crewId}|${c.date}`));
  for (const k of measDays) if (!checkDays.has(k)) fail(`seed: measurement day ${k} has no check-in`);
  for (const k of checkDays) if (!measDays.has(k)) fail(`seed: check-in day ${k} has no measurement`);
  if (seed.cabinEnvironment) {
    const cabinDays = new Set(seed.cabinEnvironment.map((c) => c.takenAt.slice(0, 10)));
    for (const k of measDays) if (!cabinDays.has(k.split('|')[1])) fail(`seed: no cabin reading on ${k.split('|')[1]}`);
  }

  // demo script points at the demo subject and at real rules
  if (seed.demoScript) {
    const demoId = seed.crew.find((c) => c.isDemoSubject)?.id;
    if (seed.demoScript.subject !== demoId) fail(`demo-script: subject ${seed.demoScript.subject} is not the demo subject ${demoId}`);
    const codes = [...seed.demoScript.steps.flatMap((st) => st.expectFirstAlerts ?? []), ...seed.demoScript.otherCrewExpectedAlerts];
    for (const c of codes) if (!ruleByCode[c]) fail(`demo-script: unknown rule ${c}`);
  }

  // demo subject needs >= 7 days of history for the baseline
  const demo = seed.crew.find((c) => c.isDemoSubject);
  if (demo) {
    const days = new Set(seed.measurements.filter((m) => m.crewId === demo.id).map((m) => m.takenAt.slice(0, 10)));
    if (days.size < 7) fail(`demo subject ${demo.id} has ${days.size} days of measurements (needs 7+)`);
  }
  return errors;
}
