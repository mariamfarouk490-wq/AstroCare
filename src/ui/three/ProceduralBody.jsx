import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { BODY_FRAME } from './bodyFrame.js';
// Continuous, smoothly interpolated surfaces rather than stacked cylinders.
function Surface({sections,material}) {
 const geometry=useMemo(()=>{
  const curve=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[1],s[2])));
  const vertices=[],indices=[],count=64,around=48;
  for(let i=0;i<=count;i++){const p=curve.getPoint(i/count);for(let j=0;j<=around;j++){const a=j/around*Math.PI*2;vertices.push(p.y*Math.cos(a),p.x,p.z*Math.sin(a));if(i&&j){const k=i*(around+1)+j;indices.push(k,k-around-1,k-1,k-1,k-around-1,k-around-2)}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[sections]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry}>{material}</mesh>;
}
function Oval({at,scale,material}){return <mesh position={at} scale={scale}><sphereGeometry args={[1,40,32]}/>{material}</mesh>}
const trunk=[[.88,.075,.06],[.94,.145,.115],[1.01,.163,.12],[1.09,.127,.098],[1.18,.135,.108],[1.29,.18,.13],[1.39,.2,.12],[1.445,.18,.075],[1.48,.066,.052],[1.56,.043,.045]];
const thigh=[[.12,.026,.029],[.22,.034,.04],[.35,.058,.055],[.44,.05,.048],[.54,.044,.046],[.65,.057,.065],[.8,.075,.075],[.94,.085,.085],[.98,.065,.07]];
const arm=[[0,.025,.026],[.08,.032,.033],[.16,.043,.038],[.23,.037,.036],[.28,.042,.041],[.36,.053,.049],[.46,.062,.061],[.5,.048,.049]];
export default function ProceduralBody({color='#e2e7ed',opacity=.17}){
 const skin=<meshPhysicalMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} roughness={.16} metalness={.12} clearcoat={1}/>;
 const detail=<meshStandardMaterial color="#b5c5d2" transparent opacity={.32} depthWrite={false} roughness={.4}/>;
 return <group userData={{frame:BODY_FRAME}}>
 <Surface sections={trunk} material={skin}/>
 <Oval at={[0,1.685,-.005]} scale={[.095,.115,.092]} material={skin}/>
 <Oval at={[0,1.61,.028]} scale={[.074,.062,.068]} material={skin}/>
 <Oval at={[0,1.658,.088]} scale={[.017,.034,.027]} material={skin}/>
 <Oval at={[0,1.615,.086]} scale={[.035,.007,.009]} material={detail}/>
 {[-1,1].map(s=><group key={s}>
 <Oval at={[s*.039,1.687,.079]} scale={[.026,.013,.012]} material={detail}/>
 <Oval at={[s*.097,1.665,0]} scale={[.014,.033,.022]} material={skin}/>
 <Oval at={[s*.092,1.35,.103]} scale={[.09,.065,.035]} material={skin}/>
 <Oval at={[s*.191,1.419,0]} scale={[.063,.063,.07]} material={skin}/>
 <group position={[s*.325,.94,.005]} rotation={[0,0,s*.27]}><Surface sections={arm} material={skin}/></group>
 <Oval at={[s*.33,.902,.013]} scale={[.036,.055,.023]} material={skin}/>
 {[0,1,2,3].map(i=><group key={i} position={[s*(.304+i*.016),.812+(i===3?.012:0),.014]} rotation={[0,0,s*(i-1.5)*.07]}><Surface sections={[[0,.004,.005],[.018,.007,.007],[.036,.008,.008],[.06,.009,.008]]} material={skin}/></group>)}
 <group position={[s*.28,.88,.025]} rotation={[0,0,-s*.5]}><Surface sections={[[0,.006,.006],[.025,.01,.01],[.055,.013,.012]]} material={skin}/></group>
 <group position={[s*.098,0,0]}><Surface sections={thigh} material={skin}/></group>
 <Oval at={[s*.098,.54,.038]} scale={[.036,.041,.019]} material={detail}/>
 <Oval at={[s*.102,.065,.045]} scale={[.045,.045,.108]} material={skin}/>
 </group>)}
 </group>
}
