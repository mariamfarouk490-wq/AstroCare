# AstroCare

Crew health on long missions: personal baselines, explained alerts and guided care that work without Earth.
NASA Space Apps Cairo 2026. React + Vite, no backend. All analysis runs in the browser.

## Run

```sh
npm install
npm run dev            # http://localhost:5173
npm run check:data     # validates src/data and replays the demo story with the app's rules engine
npm run build          # production build + offline service worker (scripts/build-offline.mjs)
```

Open `http://localhost:5173/?play` to autoplay the 10-day demo.

## Demo story (Omar Farid, cm-02)

1. Day 1: first readings set his personal baseline. Everything is green.
2. Day 6: resting HR is still "Normal" by Earth limits, but three days above his own baseline fire `HR_ABOVE_BASELINE`. The heart hotspot turns red (Watch).
3. Day 9: sleep under 6 h for 3 nights (`SLEEP_DEBT`, `HR_SLEEP_COMBINED`) and a headache while cabin CO2 is 3.2 mmHg against the NASA limit of 3 (`CABIN_CO2_HIGH` + `HEADACHE_REPORTED` → `CO2_HEADACHE`).
4. Day 10: Emergency mode. Protocol state machine, CPR metronome, Earth reply delay (one-way × 2).

## Screens

- **Body**: X-ray hologram built from real anatomy (BodyParts3D: skeleton, heart, lungs, aorta, carotid and iliac arteries, kidneys, skin; see CREDITS.md). Organs take their status colour, the heart beats at the crew member's heart rate. Tap a part to fly the camera there and open its sheet (function, space effect, readings vs band and baseline, open alerts, RIDGE hazards, NASA risks, sources). The procedural body is the fallback if the models fail to load.
- **Measure**: guided cards from `guides.json`, manual entry validated against `metrics.json`, simulated smart watch, on-device photo OCR (sample display is clearly marked simulated), daily check-in with red-flag symptoms.
- **Trends**: per metric, the generic normal band against the personal baseline (7-day mean ± SD); sleep and exercise against their rules and NASA targets.
- **Alerts**: rule code, reason, threshold, action, severity and sources; acknowledge.
- **Reminders**, **About** (challenge objectives, impact, RIDGE hazards, NASA risks with coverage, HRP research, mission profiles, sources by publisher).
- **Emergency**: full screen, `protocols.json` state machine, CPR timer at `cprRate`, event log saved to storage.

## Architecture

```
src/
  data/            read-only seed JSON (validated; see src/data/README.md)
  domain/          pure: zod schemas, integrity checks, rules engine, protocol machine, OCR text parser
  application/     ports (Clock, HealthRepository, WatchSource, OcrEngine) + use cases
  infrastructure/  seed loader, LocalStorage ("astrocare:v1"), simulated watch, offline digit OCR, clock
  state/           zustand store; every change goes through a use case
  ui/              design system (styles, components), shell, screens, three.js body
  app/             composition root and entry point
```

Dependencies point inward: `domain ← application ← infrastructure/state ← ui ← app`.
The rules engine (`src/domain/analysis/engine.js`) is the same code `scripts/check-data.mjs` uses to verify the demo story.
Every medical number on screen comes from `src/data`, each with its source.

## 3D models

`public/models/anatomy/*.glb` (about 1.5 MB in total) are generated from BodyParts3D STL files by `node scripts/build-anatomy.mjs <stl dir> <parts_list_e.txt>`. Licence: CC BY-SA 2.1 Japan, see CREDITS.md.

## Limits

Educational prototype, not a medical device. The watch is simulated. The OCR reads tightly cropped printed digits only, and the crew confirms every value before it is saved. Radiation dose and bone loss are estimates from the mission profile.
