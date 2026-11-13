const ops = {lt:(a,b)=>a<b,lte:(a,b)=>a<=b,gt:(a,b)=>a>b,gte:(a,b)=>a>=b,eq:(a,b)=>a===b};
export const mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;
export const deviation = a => a.length > 1 ? Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/(a.length-1)) : 0;
export const missionDays = seed => [...new Set(seed.measurements.filter(m=>m.source==='seed').map(m=>m.takenAt.slice(0,10)))].sort();
export function reading(seed,crewId,date,code) {
  const matches=seed.measurements.filter(m=>m.crewId===crewId&&m.takenAt.startsWith(date)&&m.readings.some(r=>r.metric===code)).sort((a,b)=>a.takenAt.localeCompare(b.takenAt));
  const m=matches.at(-1); return m ? {...m.readings.find(r=>r.metric===code), context:m.glucoseContext, source:m.source} : null;
}
export function baseline(seed,crewId,date,metric) {
  const days=[...new Set(seed.measurements.filter(m=>m.crewId===crewId&&m.takenAt.slice(0,10)<date).map(m=>m.takenAt.slice(0,10)))].sort().slice(-7);
  const values=days.map(d=>reading(seed,crewId,d,metric.code)?.value).filter(v=>v!==undefined);
  return {mean:mean(values),sd:Math.max(deviation(values),metric.sdFloor),count:values.length};
}
export function getCrewHealth(seed,crewId,date) {
  const profile=seed.missionProfiles.find(p=>p.code===seed.mission.profileCode);
  const days=[...new Set([...missionDays(seed),...seed.checkIns.filter(c=>c.crewId===crewId).map(c=>c.date)])].filter(d=>d<=date).sort();
  const fired={},streaks={}; let derived={},cabin,checkIn;
  for(const day of days) {
    const missionDay=Math.round((Date.parse(day)-Date.parse(seed.mission.startDate))/86400000)+1;
    cabin=seed.cabinEnvironment.find(c=>c.takenAt.startsWith(day)); checkIn=seed.checkIns.find(c=>c.crewId===crewId&&c.date===day);
    const dose=missionDay*profile.dailyDoseMSv;
    derived={cumulativeDoseMSv:dose,careerLimitPct:dose/600*100,estimatedBoneLossPct:missionDay/30*(profile.boneLossPctPerMonth?.max||0),solarEventActive:false,cabinPpCO2mmHg:cabin?.ppCO2mmHg,headacheToday:!!checkIn?.symptoms.includes('headache')};
    for(const rule of [...seed.rules.filter(r=>r.kind!=='combo'),...seed.rules.filter(r=>r.kind==='combo')]) {
      const p=rule.params; let hit=false,v,stats={},count=0;
      if(rule.kind==='threshold') {v=reading(seed,crewId,day,p.metric)?.value;hit=v!==undefined&&ops[p.op](v,p.value);}
      if(rule.kind==='baseline') {
        stats=baseline(seed,crewId,day,seed.metrics.find(m=>m.code===p.metric));v=reading(seed,crewId,day,p.metric)?.value;
        const ok=stats.count>=3&&v!==undefined&&(p.zMin!==undefined?(v-stats.mean)/stats.sd>=p.zMin:v-stats.mean>=p.deltaMin);
        count=streaks[rule.code]=ok?(streaks[rule.code]||0)+1:0;hit=count>=p.consecutiveDays;
      }
      if(rule.kind==='streak') {v=checkIn?.[p.field];count=streaks[rule.code]=v!==undefined&&ops[p.op](v,p.value)?(streaks[rule.code]||0)+1:0;hit=count>=p.days;}
      if(rule.kind==='derived') {v=derived[p.field];hit=v!==undefined&&ops[p.op](v,p.value);}
      if(rule.kind==='combo') hit=p.allOf.every(c=>fired[c]);
      if(hit&&!fired[rule.code]) {
        const values={value:v,mean:stats.mean,sd:stats.sd,delta:v-stats.mean,days:count||missionDay,pct:derived.careerLimitPct};
        const reason=rule.reasonTemplate.replace(/\{(\w+)\}/g,(_,key)=>typeof values[key]==='number'?Number(values[key].toFixed(1)):String(values[key]??'—'));
        fired[rule.code]={...rule,reason,firstDate:day,evidence:values};
      }
    }
  }
  const alerts=Object.values(fired);
  const metrics=seed.metrics.map(m=>{const r=reading(seed,crewId,date,m.code);return {...m,reading:r,baseline:baseline(seed,crewId,date,m),status:r?(m.bands.find(b=>(!b.context||b.context===r.context)&&r.value>=(b.min??-Infinity)&&r.value<=(b.max??Infinity))?.status||'NoData'):'NoData'};});
  const parts=seed.bodyParts.map(p=>{const a=alerts.filter(a=>a.domain===p.domain);return {...p,alerts:a,status:a.some(a=>a.severity==='Critical')?'Critical':a.length?'Watch':metrics.filter(m=>p.metrics.includes(m.code)).some(m=>m.status==='Critical')?'Critical':metrics.filter(m=>p.metrics.includes(m.code)).some(m=>m.status==='Watch')?'Watch':'Normal'};});
  return {alerts,metrics,parts,derived,cabin,checkIn,profile};
}
