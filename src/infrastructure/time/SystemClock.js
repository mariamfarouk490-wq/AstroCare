/** Real clock. Port: { now(): Date, today(): 'YYYY-MM-DD' } */
export class SystemClock {
  now() { return new Date(); }
  today() { return this.now().toISOString().slice(0, 10); }
}
