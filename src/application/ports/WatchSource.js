/** Port: a smart watch that streams readings. */
export class WatchSource {
  /**
   * Start streaming. Calls onSample({ readings: [{ metric, value }], at }) every interval.
   * @returns {() => void} stop function
   */
  // eslint-disable-next-line no-unused-vars
  stream(options, onSample) {
    throw new Error('WatchSource.stream must be implemented');
  }
}
