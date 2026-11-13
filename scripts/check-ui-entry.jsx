import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/app/App.jsx';
import Measurement from '../src/ui/pages/MeasurePage.jsx';
import Emergency from '../src/ui/pages/EmergencyPage.jsx';
import Sources from '../src/ui/pages/SourcesPage.jsx';
import Chart from '../src/ui/features/trends/TrendChart.jsx';
import { loadSeed } from '../src/infrastructure/data/seedLoader.js';
import { getCrewHealth, missionDays } from '../src/application/usecases/getCrewHealth.js';
import { emptyState } from '../src/infrastructure/storage/LocalStorageHealthRepository.js';
export function checkScreens(){
 const seed=loadSeed({clock:{now:()=>new Date('2026-11-13T12:00:00Z')}}),crew=seed.crew.find(c=>c.isDemoSubject),date=missionDays(seed)[8],health=getCrewHealth(seed,crew.id,date),user=emptyState(crew.id);
 const screens=[['Dashboard',<App/>],['Measurement',<Measurement seed={seed} crew={crew} date={date} health={health} save={()=>true} notify={()=>{}}/>],['Emergency',<Emergency seed={seed} crew={crew} user={user} update={()=>true} notify={()=>{}}/>],['Sources',<Sources seed={seed}/>],['Trends',<Chart seed={seed} crewId={crew.id} metric={seed.metrics[0]} dates={missionDays(seed)}/>]];
 for(const [name,element] of screens){const html=renderToString(element);if(html.length<100)throw new Error(name+' did not render');console.log(name+' server render passed');}
}
