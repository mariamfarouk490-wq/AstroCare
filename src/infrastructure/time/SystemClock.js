import { Clock } from '../../application/ports/Clock.js';

export class SystemClock extends Clock {
  now() {
    return new Date();
  }
}
