// Turn OCR text from a device display into candidate readings.
// The crew always confirms the values before they are saved.

/**
 * @param {string} text raw OCR text
 * @param {Array} metrics metrics.json (for validMin/validMax)
 * @returns {{ metric: string, value: number }[]}
 */
export function parseDeviceText(text, metrics) {
  const byCode = Object.fromEntries(metrics.map((m) => [m.code, m]));
  const valid = (code, v) => byCode[code] && v >= byCode[code].validMin && v <= byCode[code].validMax;
  const out = [];
  const take = (code, v) => {
    if (valid(code, v) && !out.some((r) => r.metric === code)) out.push({ metric: code, value: v });
  };

  // BP monitors show SYS, DIA and PULSE on three lines.
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => /^\d{2,3}$/.test(l)).map(Number);
  if (!text.includes('/') && lines.length === 3 && lines[0] > lines[1]) {
    take('BP_SYSTOLIC', lines[0]);
    take('BP_DIASTOLIC', lines[1]);
    take('HEART_RATE', lines[2]);
    return out;
  }

  const bp = text.match(/(\d{2,3})\s*[/\\|]\s*(\d{2,3})/);
  if (bp) {
    take('BP_SYSTOLIC', Number(bp[1]));
    take('BP_DIASTOLIC', Number(bp[2]));
  }
  const spo2 = text.match(/(\d{2,3})\s*%/);
  if (spo2) take('SPO2', Number(spo2[1]));
  const temp = text.match(/(\d{2}[.,]\d)\s*°?\s*C?/);
  if (temp) take('TEMPERATURE', Number(temp[1].replace(',', '.')));

  const rest = text
    .replace(bp?.[0] ?? '', ' ')
    .replace(spo2?.[0] ?? '', ' ')
    .replace(temp?.[0] ?? '', ' ');
  const numbers = [...rest.matchAll(/\d{2,3}/g)].map((m) => Number(m[0]));
  for (const n of numbers) {
    if (!out.some((r) => r.metric === 'HEART_RATE')) take('HEART_RATE', n);
    else take('GLUCOSE', n);
  }
  return out;
}
