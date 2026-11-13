# AstroCare — onboard health intelligence

React + Vite hackathon prototype. No backend, database, remote fonts, or runtime health-data requests.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL. For the offline production demo:

```sh
node scripts/check-data.mjs
npm run check:app
npm run build
npm run preview
```

Open the preview once while the local server is running. Wait for **Offline cache ready** before testing a disconnected reload. Service workers require localhost or HTTPS. The development server does not register a service worker.

## 30-second walkthrough

1. Body overview opens on Omar, day 9. Select day 1 to establish the quiet starting state.
2. Select day 6. His generic heart-rate range is still Normal; the personal-baseline rule is Watch. Open rule evidence.
3. Select day 9. Heart and brain hotspots turn amber; cabin air and combined insights connect the symptoms and environment.
4. Open Baseline & trends. Show the rolling band and the first-fired evidence, then switch crew to compare.
5. Open Emergency, choose a protocol, follow its branching steps and export the event log.

Replay advances through all ten days. Manual entry, watch sync and check-ins save against the selected replay date; the UI identifies it in the mission header. Use a clean browser profile for the untouched seed narrative.

## What is implemented

- Procedural 3D body with interactive hotspots, keyboard-accessible equivalent system buttons and a failure fallback.
- All six metric values, individual trends, cabin environment, RIDGE hazards, NASA risks, reminders, sources, research and impact from validated seed data.
- Independent application analysis of threshold, personal-baseline, streak, derived and combination rules.
- Full ten-day replay, all crew members, alert evidence/references and local review acknowledgements.
- Guided measurement steps, manual entry, paired BP validation, glucose context, simulated watch port and daily check-in.
- Camera/image selection and experimental offline numeric OCR. The extracted digits are never automatically saved: review the photo and explicitly enter/confirm the reading.
- Branching full-screen emergency protocols, elapsed timer, CPR cadence visual, resumable sessions and exportable event logs. No Earth transmission is implied.
- Validated `astrocare:v1` storage, explicit storage error feedback and a generated production offline cache.

## Honest demo boundaries

- The supplied dataset has **no pre-flight baseline**. The provided rule semantics use the previous seven available days, at least three earlier days, sample SD and metric-specific SD floors. Today is excluded. The trend band is mean ± 2 SD. First-fired alert evidence stays attached to the alert, as specified by the demo script. A changing rolling band does not retroactively erase an open alert.
- Severity values in the supplied rules are Normal/Watch/Critical; the visual palette also reserves Warning, but no unsupported warning thresholds are invented.
- The body is a procedural schematic, not a diagnostic anatomical scan. Radiation/bone-loss numbers are estimates from the mission profile, not sensor measurements.
- Watch values replay the bundled crew sample; there is no physical Bluetooth connection.
- Offline numeric OCR is limited to tightly cropped, high-contrast printed digits. Labels, decimals, handwriting and seven-segment LCD shapes may be misread. Similarity is a template score, not statistical accuracy. Full-text Tesseract remains an optional port requiring local worker/core/language assets; those assets could not be downloaded in the restricted build environment.
- This is an educational prototype, not a certified medical device. External NASA/CSA links need connectivity; their bundled descriptions do not.

## Verification

`check-data` validates all 21 seed JSON files and the official demo story. `check:app` separately tests the actual application engine against every demo day, the other crew, body statuses, input validation, local storage, watch samples and protocol destinations.

Build, application/data checks and server rendering of all five views (`node scripts/check-ui.mjs`) passed in the development environment. Browser visual/interaction QA was blocked by local socket restrictions, so responsive behavior and camera/OCR behavior still need a real-browser rehearsal.

## Architecture

`src/application/usecases/getCrewHealth.js`: pure analysis and baseline calculation.
`src/application/ports`: replaceable Clock / WatchSource / OcrEngine contracts.
`src/infrastructure`: validated persistence, time, simulated devices and OCR adapters.
`src/app`: app composition and frosted-glass styles.
`src/ui/pages`: measurement, emergency and source screens.
`src/ui/three`: procedural body and interactive scene.
`src/data`: original validated read-only content.

## Git handoff

The working branch is `main`. Pull was attempted first, but `.git/FETCH_HEAD` is read-only in this environment. Git changes must be reviewed and committed from a terminal with repository-write access; no remote update is claimed.
