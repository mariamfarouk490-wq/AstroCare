# src/data – AstroCare seed data

Read-only seed. User changes go to LocalStorage (`astrocare:v1`). Check everything with:

```
node scripts/check-data.mjs
```

It validates every file with its zod schema (`src/domain/schemas/`), checks the cross-file relations (`src/domain/validation/integrity.js`), and checks the demo story. Any error names the file and the field.

## Using the data in the app

```js
import { loadSeed } from '@infrastructure/data/seedLoader.js';
import { SystemClock } from '@infrastructure/time/SystemClock.js';

const seed = loadSeed({ clock: new SystemClock() });
// seed.crew, seed.metrics, seed.measurements, seed.checkIns, seed.rules, seed.bodyParts, seed.hazards, ...
```

`loadSeed` validates, checks relations, and **shifts every seed date so the last seed day is today**; readings whose time of day is still in the future are moved to just before now, so today always has data. The demo works on any day with no FakeClock. `seed.dateShiftDays` says how far it moved. To keep the original dates, pass `shiftDates: false`. For a rehearsal at a fixed time, use `new FakeClock('2026-11-14T09:00:00Z')`.

Every content entry has `refs: [{label, url}]` (sources). Any value not taken from a source is listed in `estimates` or has `"source": "app"` / `"thresholdSource": "app"`. The full source list is in `sources.json`. The Arabic mapping doc is at https://claude.ai/artifact/8UfS6F5tNtWG4WrPNURH6Q

## Core files (schema in the JSON Data Model doc)

| File | Key | Contents |
|---|---|---|
| crew.json | id `cm-NN` | 4 crew. `cm-02` Omar Farid is the demo subject |
| mission.json | – | Demo mission: MARS_TRANSIT, start 2026-11-04 (13 Nov = day 10) |
| mission-profiles.json | code | ISS, MOON, MARS_TRANSIT, MARS_SURFACE: delay, daily dose, gravity, bone-loss rate |
| metrics.json | code | 6 metrics with bands (no gaps over the valid range; glucose per context) |
| measurements.seed.json | id (uuid) | 10 days × 4 crew, one morning reading of all 6 metrics |
| checkins.seed.json | id, (crewId,date) | 10 days × 4 crew: sleep, mood, stress, symptoms, `exerciseMin` |
| rules.json | code | 26 rules: threshold, baseline, streak, combo, derived |
| guides.json | metric | 5 guided-measurement cards (BP on BP_SYSTOLIC) |
| protocols.json | code | UNRESPONSIVE, CHEST_PAIN |
| body-parts.json | id | 5 hotspots (heart, brain, skeleton, abdomen, aura) |
| symptoms.json | code | 18 symptoms, 5 `redFlag` |

## Resource files (new, for the challenge Resources)

| File | Contents |
|---|---|
| hazards.json | NASA RIDGE hazards R/I/D/G/E → domains, body parts, effects, countermeasures, app coverage |
| nasa-risks.json | 31 NASA Human System Risks → domain, bodyPart, hazard, `appCoverage` |
| hrp-research.json | 21 HRP studies (Ongoing HRP Research page) → domain, link to app |
| environment-limits.json | NASA-STD-3001 / CSA limits: radiation, cabin air, daily needs, physiology rates |
| cabin-environment.seed.json | Simulated cabin air for 10 days (ppCO2 rises above 3 mmHg on days 9–10) |
| sources.json | Every source with key, label, URL and `publisher` (NASA, CSA, Peer-reviewed, Medical guideline, Team) |
| reminders.json | 6 reminders: morning vitals, evening check-in, exercise 90 min, water 2.5 L, cabin air, weekly radiation review |
| challenge-objectives.json | Each challenge objective → feature → data files (for the Relevance criterion and the "how we cover the challenge" screen) |
| impact.json | Problem, beneficiaries in space and on Earth (Impact criterion) |
| demo-script.json | The 5 demo beats and the alerts expected on each day. `check-data` replays all rules and fails if the seed drifts from the script |

## Demo story (cm-02)

- Resting HR 60 → 82 bpm over 10 days, never ≥ 90 and always in the Normal band. Only the personal baseline catches it: `HR_ABOVE_BASELINE` fires first on **day 6 (2026-11-09)**.
- Sleep drops 7.5 → 5 h. `SLEEP_DEBT` fires on day 9, and so does `HR_SLEEP_COMBINED`.
- Symptoms: fatigue from day 7, then headache on days 9–10. Cabin ppCO2 is 3.2–3.3 mmHg on those same days (NASA limit 3 mmHg), so `CABIN_CO2_HIGH` + `HEADACHE_REPORTED` → `CO2_HEADACHE` fire on day 9. The other crew get only the cabin alert.
- Exercise drops to 60 min on days 9–10, below the NASA ~90 min/day.
- The other 3 crew stay Normal and fire no alerts.

The files hold 2026-11-04 → 2026-11-13. At runtime `loadSeed` moves the 10 days so the last one is the presentation day.

## 3D hotspots

`body-parts.json` positions are in the shared body frame defined in `src/ui/three/bodyFrame.js`: metres, feet at y = 0, height 1.80, facing +z, and the crew member's left is +x. They were measured on `src/ui/three/ProceduralBody.jsx`, so they line up with it exactly. When a glTF model arrives, call `fitToBodyFrame(scene, THREE)` on it and the same hotspots line up with no edits.

| id | position | on the body |
|---|---|---|
| brain | [0, 1.70, 0.07] | front of the head |
| heart | [0.06, 1.34, 0.15] | left chest |
| abdomen | [0, 1.06, 0.16] | belly |
| skeleton | [-0.1, 0.72, 0.09] | right thigh (femur, weight-bearing bone) |
| aura | [0, 0.9, 0], radius 1.0 | halo around the whole body |

## Fields beyond the base data-model doc (already in the zod schemas)

- All content: `refs`
- metrics: `spaceNote`
- mission-profiles: `oneWayDelayRangeSec`, `distanceKm`, `transitDays`, `resupply`, `boneLossPctPerMonth` (`{min,max}` or `null`), `estimates`, `notes`
- body-parts: `hazards`, `nasaRisks`, `checkinFields`, `derived`
- checkins: `exerciseMin`
- rules: kind `derived` with params `{field, op, value}` (fields: `cumulativeDoseMSv`, `careerLimitPct`, `estimatedBoneLossPct`, `solarEventActive`, `cabinPpCO2mmHg` = today's cabin reading, `headacheToday` = today's check-in has `headache`), plus `thresholdSource`. `TEMP_ABOVE_BASELINE` uses `deltaMin` (°C above the mean) instead of `zMin`.

Derived values for the engine:
- `cumulativeDoseMSv` = mission day × `profile.dailyDoseMSv`
- `estimatedBoneLossPct` = mission months × `boneLossPctPerMonth.max` (when not null)
- `careerLimitPct` = cumulativeDoseMSv ÷ 600
