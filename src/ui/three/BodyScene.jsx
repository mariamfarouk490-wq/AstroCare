import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import ProceduralBody from './ProceduralBody.jsx';
const colors={Normal:'#6ed9a5',Watch:'#e3b16d',Warning:'#ff9259',Critical:'#ff5d7c',NoData:'#72909c'};
class SceneBoundary extends React.Component { state={failed:false}; static getDerivedStateFromError(){return {failed:true};} render(){return this.state.failed?<div className="scene-fallback">3D unavailable. Use the body-system buttons below.</div>:this.props.children;} }
function Anatomy({parts,select,selected,environment}) {
 return <group>
  <ProceduralBody color="#d8e0ec" opacity={0.20}/>
  <Line points={[[0,1.51,0],[0,1.35,0],[0,1.12,0],[0,.96,0]]} color="#c7cbd3" lineWidth={2}/>
  {Array.from({length:8},(_,i)=><Line key={i} points={Array.from({length:25},(_,j)=>{const a=j/24*Math.PI;return [Math.cos(a)*(.15-i*.005),1.44-i*.043-Math.sin(a)*.045,Math.sin(a)*.115]})} color="#c7cbd3" transparent opacity={.48} lineWidth={1.5}/>)}
  {[-1,1].map(s=><group key={s}><Line points={[[s*.08,.96,0],[s*.1,.56,0],[s*.1,.12,0]]} color="#c7cbd3" lineWidth={3}/><Line points={[[s*.15,1.43,0],[s*.27,1.2,0],[s*.27,.86,0]]} color="#c7cbd3" lineWidth={2}/></group>)}
  {parts.filter(p=>p.id!=='aura').map(p=><group key={p.id} position={p.position}><mesh scale={p.id==='heart'?[.78,1.15,.7]:p.id==='brain'?[1.1,.8,.85]:[.75,1.1,.65]} onClick={e=>{e.stopPropagation();select(p.id)}}><sphereGeometry args={[p.radius*(selected===p.id?1.05:.78),32,32]}/><meshStandardMaterial color={colors[p.status]} emissive={colors[p.status]} emissiveIntensity={.7} transparent opacity={.88}/></mesh><mesh><sphereGeometry args={[p.radius*1.5,20,20]}/><meshBasicMaterial color={colors[p.status]} transparent opacity={.07} depthWrite={false}/></mesh></group>)}
  <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]} onClick={()=>select('aura')}><torusGeometry args={[.43,.005,12,80]}/><meshBasicMaterial color={colors[parts.find(p=>p.id==='aura')?.status||'Normal']}/></mesh>
  <mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]} onClick={()=>select(environment?'brain':'aura')}><ringGeometry args={[.46,.48,80]}/><meshBasicMaterial color={environment?'#ffbf69':'#b6becb'} transparent opacity={environment ? .7 : .25}/></mesh>
 </group>
}
export default function BodyScene(props){return <SceneBoundary><Suspense fallback={<div className="scene-fallback">Loading body map…</div>}><Canvas camera={{position:[0,1.05,3.3],fov:38}} dpr={[1,1.5]} gl={{alpha:true,antialias:true}}><ambientLight intensity={.7}/><pointLight position={[-1,1.6,1]} intensity={1.5} color="#5e8eff"/><directionalLight position={[-2,2,-1]} intensity={4} color="#e0e4f0"/><directionalLight position={[2,1,2]} intensity={2.5} color="#ffffff"/><pointLight position={[2,3,3]} intensity={10} color="#ffffff"/><Anatomy {...props}/><OrbitControls target={[0,.91,0]} enablePan={false} minDistance={2.3} maxDistance={4.2} minPolarAngle={.6} maxPolarAngle={2.2}/></Canvas></Suspense></SceneBoundary>}
