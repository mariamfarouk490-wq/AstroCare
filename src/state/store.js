// App state: the user's changes (persisted through the HealthRepository port), the selected
// crew member and day, the demo replay and the open emergency session.
// Every change goes through an application use case; the UI never edits data directly.
import { createContext, createElement, useContext, useMemo } from 'react';
import { createStore, useStore as useZustand } from 'zustand';
import * as uc from '../application/usecases/index.js';
import { advance, currentStep } from '../domain/emergency/protocolMachine.js';
import { toIsoDay } from '../domain/utils/dates.js';

export function createAppStore(ctx) {
  const days = uc.seedDays(ctx.seed);
  const today = toIsoDay(ctx.clock.now());
  const liveDay = today > days.at(-1) ? today : days.at(-1);
  const saved = ctx.repo.load();
  const user = saved ?? uc.emptyUserState(ctx.seed.demoScript.subject);

  return createStore((set, get) => {
    const run = (fn) => {
      try {
        return { ok: true, value: fn() };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    };
    const update = (state) => set({ user: state });

    return {
      ctx,
      seed: ctx.seed,
      days,
      liveDay,
      user,
      viewDay: null, // null = live; otherwise a seed day picked in the demo replay
      demo: { open: false, playing: false },
      emergency: null, // { sessionId, machine, startedAt }
      toast: null,

      day: () => get().viewDay ?? get().liveDay,
      selectCrew: (crewId) => update({ ...get().user, selectedCrewId: crewId }),
      setViewDay: (day) => set({ viewDay: day === get().liveDay ? null : day }),
      setSettings: (patch) => update({ ...get().user, settings: { ...get().user.settings, ...patch } }),
      notify: (message, tone = 'neutral') => {
        set({ toast: { message, tone, id: Date.now() } });
        setTimeout(() => {
          if (get().toast?.message === message) set({ toast: null });
        }, 3200);
      },

      addMeasurement: (input) =>
        run(() => {
          const s = uc.addMeasurement(ctx, get().user, { crewId: get().user.selectedCrewId, ...input });
          update(s);
          return s;
        }),
      ingestWatchSample: (sample) =>
        run(() => {
          const s = uc.ingestWatchSample(ctx, get().user, { crewId: get().user.selectedCrewId, ...sample });
          update(s);
          return s;
        }),
      submitCheckIn: (input) =>
        run(() => {
          const r = uc.submitCheckIn(ctx, get().user, { crewId: get().user.selectedCrewId, date: get().liveDay, ...input });
          update(r.state);
          return r;
        }),
      acknowledgeAlert: (code) => update(uc.acknowledgeAlert(ctx, get().user, { crewId: get().user.selectedCrewId, code })),
      readFromImage: (image) => uc.readFromImage(ctx, image),
      sampleDisplayImage: (lines) => ctx.ocr.sampleImage(lines),
      streamWatch: (options, onSample) => ctx.watch.stream(options, onSample),

      openDemo: (playing = false) => set({ demo: { open: true, playing }, viewDay: days[0] }),
      closeDemo: () => set({ demo: { open: false, playing: false }, viewDay: null }),
      setDemoPlaying: (playing) => set({ demo: { ...get().demo, playing } }),

      startEmergency: (protocol, patientId = get().user.selectedCrewId) => {
        const r = uc.startEmergency(ctx, get().user, { protocol, patientId });
        set({ user: r.state, emergency: { sessionId: r.session.id, machine: r.machine, startedAt: r.session.startedAt } });
      },
      emergencyAnswer: (optionLabel) => {
        const { emergency, user: u } = get();
        const { step } = currentStep(ctx.seed.protocols, emergency.machine);
        const machine = advance(ctx.seed.protocols, emergency.machine, optionLabel);
        const s = uc.recordEmergencyEvent(ctx, u, { sessionId: emergency.sessionId, step: `${emergency.machine.protocol}:${step.code}`, answer: optionLabel ?? 'done' });
        set({ user: s, emergency: { ...emergency, machine } });
      },
      endEmergency: (outcome) => {
        const { emergency, user: u } = get();
        set({ user: uc.endEmergency(ctx, u, { sessionId: emergency.sessionId, outcome }), emergency: null });
      },
      closeEmergency: () => set({ emergency: null }),

      resetDemo: () => set({ user: uc.resetDemo(ctx), viewDay: null, emergency: null }),
    };
  });
}

const StoreContext = createContext(null);

export const StoreProvider = ({ store, children }) => createElement(StoreContext.Provider, { value: store }, children);

/** Read from the app store: useApp((s) => s.user). */
export function useApp(selector) {
  return useZustand(useContext(StoreContext), selector);
}

/** Health snapshot of the selected crew member on the viewed day. */
export function useHealth(crewIdOverride) {
  const ctx = useApp((s) => s.ctx);
  const user = useApp((s) => s.user);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  const crewId = crewIdOverride ?? user.selectedCrewId;
  return useMemo(() => uc.getCrewHealth(ctx, user, { crewId, day }), [ctx, user, crewId, day]);
}

/** Overall status of every crew member on the viewed day: { [crewId]: 'Normal' | 'Watch' | 'Critical' }. */
export function useCrewStatuses() {
  const ctx = useApp((s) => s.ctx);
  const user = useApp((s) => s.user);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  return useMemo(() => Object.fromEntries(ctx.seed.crew.map((c) => [c.id, uc.getCrewHealth(ctx, user, { crewId: c.id, day }).status])), [ctx, user, day]);
}

/** Trends of several metrics at once (for sparklines). */
export function useMetricTrends(codes) {
  const ctx = useApp((s) => s.ctx);
  const user = useApp((s) => s.user);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  const key = codes.join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Object.fromEntries(codes.map((c) => [c, uc.getTrend(ctx, user, { crewId: user.selectedCrewId, metric: c, until: day })])), [ctx, user, day, key]);
}

/** Trend of a metric or check-in field for the selected crew member up to the viewed day. */
export function useTrend(query) {
  const ctx = useApp((s) => s.ctx);
  const user = useApp((s) => s.user);
  const day = useApp((s) => s.viewDay ?? s.liveDay);
  const key = JSON.stringify(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => uc.getTrend(ctx, user, { crewId: user.selectedCrewId, until: day, ...query }), [ctx, user, day, key]);
}
