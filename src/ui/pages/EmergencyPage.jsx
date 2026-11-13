import { useState, useEffect } from 'react';
import { SystemClock } from '../../infrastructure/time/SystemClock.js';
import { Pill, Refs } from '../design-system/HealthUI.jsx';
const clock = new SystemClock();
export default function Emergency({seed,crew,user,update,notify}){
 const [active,setActive]=useState(null),[elapsed,setElapsed]=useState(0);
 useEffect(()=>{
  if(!active)return;
  const dialog=document.querySelector('.emergency-full'),previous=document.activeElement;
  if(!dialog)return;
  const controls=()=>[...dialog.querySelectorAll('button,a[href],input,select')].filter(e=>!e.disabled);
  controls()[0]?.focus();
  const trap=e=>{if(e.key!=='Tab')return;const list=controls(),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}};
  dialog.addEventListener('keydown',trap);return()=>{dialog.removeEventListener('keydown',trap);previous?.focus()};
 },[active]);
 const session=user.emergencySessions.find(s=>s.id===active),protocol=seed.protocols.find(p=>p.code===session?.protocol),step=protocol?.steps.find(s=>s.code===session.log.at(-1)?.step);
 useEffect(()=>{if(!session||session.endedAt)return;const tick=()=>setElapsed(Math.floor((clock.now()-new Date(session.startedAt))/1000));tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[session]);
 function start(p){const at=clock.now().toISOString(),s={id:crypto.randomUUID(),protocol:p.code,patientId:crew.id,startedAt:at,log:[{at,step:p.startStep}]};update({...user,emergencySessions:[...user.emergencySessions,s]});setActive(s.id)}
 function next(target,answer){let code=session.protocol;if(target.includes(':'))[code,target]=target.split(':');const log=[...session.log,{at:clock.now().toISOString(),step:target,answer}];update({...user,emergencySessions:user.emergencySessions.map(s=>s.id===active?{...s,protocol:code,log}:s)})}
 function finish(outcome){update({...user,emergencySessions:user.emergencySessions.map(s=>s.id===active?{...s,outcome,endedAt:clock.now().toISOString()}:s)});setActive(null);notify('Emergency session saved. No message has been sent to Earth.');}
 function download(){const blob=new Blob([JSON.stringify(user.emergencySessions,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='astrocare-emergency-log.json';a.click();URL.revokeObjectURL(url)}
 return <section className="glass pad"><span className="eyebrow">CREW ASSISTANCE / OFFLINE PROTOCOLS</span><h2>Clear steps. When every second counts.</h2><p>Hackathon simulation · follow approved mission medical procedures in real operations.</p><div className="two-col">{seed.protocols.map(p=><button className="protocol-card" key={p.code} onClick={()=>start(p)}><span>＋</span><h2>{p.title}</h2><p>Open guided protocol →</p></button>)}</div><h3>Event log</h3><button onClick={download} disabled={!user.emergencySessions.length}>Export log for handoff</button>{!user.emergencySessions.length&&<p>No emergency sessions recorded.</p>}{user.emergencySessions.map(s=><details key={s.id}><summary>{s.startedAt} · {seed.crew.find(c=>c.id===s.patientId)?.name} · {s.outcome||'Ongoing'}</summary>{s.log.map((l,i)=><p key={i}>{l.at} · {l.step} {l.answer}</p>)}{!s.endedAt&&<button onClick={()=>setActive(s.id)}>Resume session</button>}</details>)}
 {session&&!session.endedAt&&<div className="emergency-full" role="dialog" aria-modal="true" aria-label="Emergency protocol"><div className="emergency-inner"><div className="row"><Pill status="Critical">EMERGENCY · {seed.crew.find(c=>c.id===session.patientId)?.name}</Pill><strong className="timer">{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</strong></div><p>{protocol.title} · {step.code}</p><h1>{step.text}</h1>{step.cprRate&&<div className="cpr" style={{animationDuration:`${60/step.cprRate}s`}}>{step.cprRate} compressions / min</div>}<div className="actions">{step.options?.map(o=><button className="primary" key={o.label} onClick={()=>next(o.next,o.label)}>{o.label}</button>)}{step.next&&<button className="primary" onClick={()=>next(step.next,'Completed')}>Completed · next step →</button>}{step.type==='end'&&['Stabilized','HandedToEarth','Ongoing'].map(o=><button key={o} onClick={()=>finish(o)}>{o}</button>)}</div><p>Estimated Earth round-trip: {seed.missionProfiles.find(p=>p.code===seed.mission.profileCode).oneWayDelaySec*2/60} min · log only, no transmission</p><Refs refs={protocol.sources}/><button onClick={()=>{setActive(null);notify('Protocol paused on screen; session timer continues. Resume from event log.')}}>Minimize protocol</button></div></div>}</section>
}
