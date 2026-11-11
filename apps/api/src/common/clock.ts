/** Ceasul serverului. Testele îl înlocuiesc cu unul simulat; ora trimisă de client nu contează niciodată. */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => new Date() };
