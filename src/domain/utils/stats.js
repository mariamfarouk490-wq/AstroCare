// Pure statistics helpers used by the rules engine and trends.

export const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Sample standard deviation (n − 1). Returns 0 for fewer than two values. */
export const sampleSd = (values) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
};

export const round = (value, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};
