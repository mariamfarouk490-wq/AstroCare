/** Fixed clock for tests and rehearsals. Example: new FakeClock('2026-11-13T09:00:00Z') */
export class FakeClock {
  constructor(iso) { this.current = new Date(iso); }
  now() { return new Date(this.current); }
  today() { return this.current.toISOString().slice(0, 10); }
  advance(ms) { this.current = new Date(this.current.getTime() + ms); }
}
