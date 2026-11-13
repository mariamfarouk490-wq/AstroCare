/** Port: current time. Implementations: SystemClock, FakeClock. */
export class Clock {
  /** @returns {Date} */
  now() {
    throw new Error('Clock.now must be implemented');
  }
}
