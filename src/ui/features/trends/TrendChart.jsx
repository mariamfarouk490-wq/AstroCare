import { reading, baseline } from '../../../application/usecases/getCrewHealth.js';
import { fmt } from '../../design-system/HealthUI.jsx';
export default function Chart({seed,crewId,metric,dates}) {
 const points=dates.map(d=>({day:d,value:reading(seed,crewId,d,metric.code)?.value,b:baseline(seed,crewId,d,metric)}));
 const vals=points.flatMap(p=>[p.value,...(p.b.count>=3?[p.b.mean-p.b.sd*2,p.b.mean+p.b.sd*2]:[])]).filter(Number.isFinite);
 if(!vals.length)return <p>No readings yet.</p>;
 const min=Math.min(...vals)-metric.sdFloor*2,max=Math.max(...vals)+metric.sdFloor*2,x=i=>36+i*600/Math.max(1,points.length-1),y=v=>190-(v-min)/(max-min)*150;
 const band=points.map((p,i)=>({...p,i})).filter(p=>p.b.count>=3);
 return <svg className="chart" viewBox="0 0 680 225" role="img" aria-label={`${metric.label} over mission days; shaded band is previous seven days mean plus or minus two standard deviations`}>
 {[0,.5,1].map(t=><g key={t}><line x1="36" x2="645" y1={40+t*150} y2={40+t*150} stroke="#ffffff12"/><text x="0" y={44+t*150}>{fmt(max-t*(max-min))}</text></g>)}
 {band.length>1&&<polygon points={[...band.map(p=>`${x(p.i)},${y(p.b.mean+p.b.sd*2)}`),...band.toReversed().map(p=>`${x(p.i)},${y(p.b.mean-p.b.sd*2)}`)].join(' ')} fill="#ddddea12" stroke="#ddddea30"/>}
 <polyline points={points.map((p,i)=>p.value==null?'':`${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke="#d9d9e5" strokeWidth="3"/>
 {points.map((p,i)=><g key={p.day}>{p.value!=null&&<circle cx={x(i)} cy={y(p.value)} r="4" fill="#ffffff"><title>{p.day}: {p.value} {metric.unit}</title></circle>}<text x={x(i)} y="216" textAnchor="middle">{i+1}</text></g>)}
 </svg>
}
